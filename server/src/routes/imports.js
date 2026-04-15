import { Router } from 'express';
import multer from 'multer';
import { readFileSync } from 'fs';
import Papa from 'papaparse';
import { supabase } from '../db/database.js';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Helper: Mapper les colonnes CSV vers nos champs DB
const mapColumns = (headers) => {
  const mapping = {
    nom_entreprise: null,
    telephone: null,
    adresse: null,
    url_site: null,
    departement: null,
    city: null, // Nouveau: Ville spécifiquement
    street: null // Nouveau: Rue spécifiquement
  };

  const rules = {
    nom_entreprise: ['nom', 'name', 'entreprise', 'title', 'société'],
    telephone: ['tel', 'phone', 'téléphone', 'mobile'],
    adresse: ['adresse', 'address', 'lieu', 'location'],
    url_site: ['site', 'website', 'url'],
    departement: ['cp', 'postal', 'zip', 'département', 'dept'],
    city: ['ville', 'city', 'commune'],
    street: ['rue', 'street', 'voie', 'adresse_rue']
  };

  headers.forEach(h => {
    const cleanH = h.toLowerCase().trim();
    for (const [key, patterns] of Object.entries(rules)) {
      if (!mapping[key] && patterns.some(p => cleanH.includes(p))) {
        mapping[key] = h;
      }
    }
  });

  return mapping;
};

// Logique de filtrage (Règle métier)
const filterProspect = (prospect, useFilter = true) => {
  const url = (prospect.url_site || '').toLowerCase();
  
  // Si le filtrage est désactivé, on garde tout ce qui a un téléphone
  if (!useFilter) return { keep: true, source: 'maps' };

  if (!url || url.trim() === '') return { keep: true, source: 'maps' };

  const exceptions = [
    { pattern: 'facebook.com', source: 'facebook' },
    { pattern: 'instagram.com', source: 'instagram' },
    { pattern: 'business.site', source: 'business_site' },
    { pattern: 'solocal.com', source: 'solocal' },
    { pattern: 'pagesjaunes.fr', source: 'pagesjaunes' }
  ];

  for (const ex of exceptions) {
    if (url.includes(ex.pattern)) return { keep: true, source: ex.source };
  }

  return { keep: false, reason: 'Site web existant' };
};

// Traitement d'un seul fichier
const processFile = async (file, useFilter = true) => {
  const fileContent = readFileSync(file.path, 'utf8');
  const { data: rows } = Papa.parse(fileContent, { header: true, skipEmptyLines: true });

  if (rows.length === 0) return { error: `Fichier ${file.originalname} est vide` };

  const mapping = mapColumns(Object.keys(rows[0]));
  const prospectsToInsert = [];
  const stats = { total: rows.length, imported: 0, filtered: 0 };
  const preview = [];

  for (const row of rows) {
    // Construction de l'adresse combinée si Street/City existent
    const street = row[mapping.street] || '';
    const city = row[mapping.city] || '';
    const fullAddress = street && city ? `${street}, ${city}` : (street || city || row[mapping.adresse] || '');

    const p = {
      nom_entreprise: row[mapping.nom_entreprise] || 'Inconnu',
      telephone: row[mapping.telephone] || '',
      adresse: fullAddress,
      url_site: row[mapping.url_site] || '',
      departement: city || row[mapping.departement] || '' // On utilise la Ville dans le champ département si besoin
    };

    if (!p.telephone) {
      stats.filtered++;
      if (preview.length < 50) preview.push({ ...row, _status: 'filtered', _reason: 'Pas de téléphone' });
      continue;
    }

    const filterResult = filterProspect(p, useFilter);

    if (filterResult.keep) {
      prospectsToInsert.push({ ...p, source: filterResult.source, statut: 'a_contacter' });
      stats.imported++;
      if (preview.length < 50) preview.push({ ...row, _status: 'import' });
    } else {
      stats.filtered++;
      if (preview.length < 50) preview.push({ ...row, _status: 'filtered', _reason: filterResult.reason });
    }
  }

  return { prospectsToInsert, stats, mapping, preview, filename: file.originalname };
};

// ... le reste du fichier reste identique ...
// POST /api/imports/upload
router.post('/upload', upload.array('files'), async (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Fichiers manquants' });
  const useFilter = req.body.useFilter === 'true';
  const category = req.body.category || 'Serrurier';

  try {
    const results = [];
    let totalImported = 0;

    for (const file of req.files) {
      const { prospectsToInsert, stats, filename } = await processFile(file, useFilter);

      // Trouver le sort_order max dans cette catégorie pour placer la feuille à la fin
      const { data: existingInCategory } = await supabase
        .from('import_history')
        .select('sort_order')
        .eq('category', category)
        .order('sort_order', { ascending: false })
        .limit(1);

      const maxSortOrder = existingInCategory && existingInCategory.length > 0
        ? (existingInCategory[0].sort_order ?? 0)
        : -1;
      const newSortOrder = maxSortOrder + 1;

      const { data: importRecord, error: importError } = await supabase
        .from('import_history')
        .insert({
          filename,
          total_lignes: stats.total,
          lignes_importees: stats.imported,
          lignes_filtrees: stats.filtered,
          doublons_ignores: 0,
          category,
          sort_order: newSortOrder
        })
        .select()
        .single();

      if (importError) throw importError;

      if (prospectsToInsert && prospectsToInsert.length > 0) {
        const finalProspects = prospectsToInsert.map(p => ({ ...p, import_id: importRecord.id }));
        
        const { error: insertError } = await supabase
          .from('prospects')
          .upsert(finalProspects, { onConflict: 'telephone', ignoreDuplicates: true });

        if (insertError) throw insertError;
        totalImported += stats.imported;
      }
      
      results.push({ filename, stats });
    }

    res.json({ success: true, stats: { imported: totalImported, filesCount: req.files.length }, results });

  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/imports/preview
router.post('/preview', upload.array('files'), async (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Fichiers manquants' });
  const useFilter = req.body.useFilter === 'true';

  try {
    const allPreviews = [];
    const globalEstimates = { total: 0, willImport: 0, willFilter: 0 };
    let mapping = {};

    for (const file of req.files) {
      const { stats, preview, mapping: fileMapping } = await processFile(file, useFilter);
      globalEstimates.total += stats.total;
      globalEstimates.willImport += stats.imported;
      globalEstimates.willFilter += stats.filtered;
      mapping = fileMapping;
      
      preview.forEach(row => {
        allPreviews.push({ ...row, _filename: file.originalname });
      });
    }

    res.json({ success: true, estimates: globalEstimates, mapping, preview: allPreviews.slice(0, 100) });
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('import_history')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true }); // ASC pour mettre le plus récent à droite

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});


router.patch('/reorder', async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'Liste IDs invalide' });
  try {
    const updates = ids.map((id, index) => 
      supabase.from('import_history').update({ sort_order: index }).eq('id', id)
    );
    await Promise.all(updates);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { is_completed, category } = req.body;
  
  if (is_completed === undefined && category === undefined) return res.status(400).json({ error: 'Données manquantes' });

  try {
    const updateData = {};
    if (is_completed !== undefined) updateData.is_completed = is_completed;
    if (category !== undefined) updateData.category = category;

    const { data, error } = await supabase
      .from('import_history')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('Update import error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await supabase.from('prospects').delete().eq('import_id', id);
    await supabase.from('import_history').delete().eq('id', id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/bulk-delete', async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs invalides' });
  try {
    await supabase.from('prospects').delete().in('import_id', ids);
    await supabase.from('import_history').delete().in('id', ids);
    res.json({ success: true, message: `${ids.length} feuilles supprimées` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
