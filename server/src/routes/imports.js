import { Router } from 'express';
import multer from 'multer';
import { readFileSync } from 'fs';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { supabase } from '../db/database.js';
import { getOffre, DEFAULT_CATEGORY } from '../utils/offre.js';
import { isEnrichmentConfigured } from '../services/phoneEnrichment.js';
import { startJob } from '../services/enrichmentJobs.js';
import { UPLOAD_DIR } from '../utils/paths.js';

const router = Router();
const upload = multer({ dest: UPLOAD_DIR });

// =====================================================================
// ESPACE SITE WEB (Google Maps Scraper) — logique historique inchangée
// =====================================================================

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

const processSiteWebRows = (rows, useFilter) => {
  const mapping = mapColumns(Object.keys(rows[0]));
  const prospectsToInsert = [];
  const stats = { total: rows.length, imported: 0, filtered: 0, duplicates: 0 };
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
      prospectsToInsert.push({ ...p, source: filterResult.source, statut: 'a_contacter', offre: 'site_web' });
      stats.imported++;
      if (preview.length < 50) preview.push({ ...row, _status: 'import' });
    } else {
      stats.filtered++;
      if (preview.length < 50) preview.push({ ...row, _status: 'filtered', _reason: filterResult.reason });
    }
  }

  return { prospectsToInsert, stats, mapping, preview };
};

// =====================================================================
// ESPACE SAAS (Pappers / Annuaire des Entreprises / Instant Data Scraper)
// =====================================================================

// Normalise un en-tête : minuscules, sans accents, séparateurs -> espaces
const normalizeHeader = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[_\-./'()]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Les motifs courts (cp, tel, naf, ape, nom, url) doivent correspondre à un mot entier
const headerMatches = (normalizedHeader, pattern) => {
  if (pattern.length <= 3) {
    return new RegExp(`(^| )${pattern}( |$)`).test(normalizedHeader);
  }
  return normalizedHeader.includes(pattern);
};

// Ordre = priorité. Un en-tête n'est attribué qu'à un seul champ.
// (ex : "Nom du dirigeant" doit aller à dirigeant avant que "nom" ne le capte pour l'entreprise)
const SAAS_RULES = [
  ['statut_source', ['statut prospection', 'statut', 'etape']],
  ['notes', ['notes', 'note', 'commentaire', 'retroaction', 'remarque']],
  ['linkedin_url', ['linkedin']],
  ['url_fiche', ['pappers', 'fiche', 'annuaire']],
  ['url_site', ['site web', 'site internet', 'website', 'site']],
  ['url_fiche', ['url', 'lien', 'link']],
  ['dirigeant', ['dirigeant', 'decideur', 'gerant', 'representant', 'president', 'responsable']],
  ['code_postal', ['code postal', 'postal', 'cp', 'zip']],
  ['activite', ['activite', 'metier', 'libelle', 'secteur', 'categorie', 'category']],
  ['code_naf', ['code naf', 'naf', 'ape']],
  ['effectif', ['effectif', 'salarie', 'tranche']],
  ['siren', ['siren', 'siret']],
  ['telephone', ['telephone', 'tel', 'phone', 'mobile', 'portable']],
  ['ville', ['ville', 'city', 'commune', 'localite']],
  ['adresse', ['adresse', 'address', 'siege', 'rue', 'voie']],
  ['nom_entreprise', ['nom entreprise', 'raison sociale', 'denomination', 'entreprise', 'societe', 'nom', 'name', 'title']]
];

const mapSaasColumns = (headers) => {
  const mapping = {};
  const used = new Set();
  const normalized = headers.map(h => ({ raw: h, norm: normalizeHeader(h) }));

  for (const [field, patterns] of SAAS_RULES) {
    if (mapping[field]) continue;
    for (const pattern of patterns) {
      const found = normalized.find(h => !used.has(h.raw) && headerMatches(h.norm, pattern));
      if (found) {
        mapping[field] = found.raw;
        used.add(found.raw);
        break;
      }
    }
  }
  return mapping;
};

const digitsOnly = (s) => String(s || '').replace(/\D/g, '');

// Convertit la colonne "Statut Prospection" du fichier en statut du pipeline SaaS.
// Retourne 'exclu' pour les lignes à ne pas importer.
const mapSaasStatut = (raw) => {
  const s = normalizeHeader(raw);
  if (!s) return 'a_contacter';
  if (s.includes('exclu')) return 'exclu';
  // "À contacter" contient "contacte" : on le traite avant les autres règles
  if (s.includes('a contacter') || s.includes('nouveau') || s.includes('a faire')) return 'a_contacter';
  if (s.includes('perdu') || s.includes('refus') || s.includes('pas interesse')) return 'perdu';
  if (s.includes('abonne') || s.includes('client') || s.includes('signe')) return 'abonne';
  if (s.includes('essai') || s.includes('test')) return 'essai_actif';
  if (s.includes('demo')) return 'demo_faite';
  if (s.includes('echange') || s.includes('qualifie') || s.includes('rdv')) return 'echange_qualifie';
  if (s.includes('visite') || s.includes('tente') || s.includes('appele') || s.includes('contacte')) return 'visite_ou_contact_tente';
  return 'a_contacter';
};

const processSaasRows = (rows, seenKeys = new Set()) => {
  const mapping = mapSaasColumns(Object.keys(rows[0]));
  const prospectsToInsert = [];
  const stats = { total: rows.length, imported: 0, filtered: 0, duplicates: 0 };
  const preview = [];

  const pushPreview = (row, status, reason) => {
    if (preview.length < 50) preview.push({ ...row, _status: status, ...(reason ? { _reason: reason } : {}) });
  };

  for (const row of rows) {
    const val = (field) => (mapping[field] ? String(row[mapping[field]] ?? '').trim() : '');

    const nom = val('nom_entreprise');
    const telephone = val('telephone') || null;
    const ville = val('ville');
    let codePostal = digitsOnly(val('code_postal'));
    if (codePostal.length === 4) codePostal = `0${codePostal}`; // Excel supprime le 0 initial (01xxx)
    let siren = digitsOnly(val('siren'));
    siren = siren.length >= 9 ? siren.slice(0, 9) : '';

    let adresse = val('adresse');
    const cpVille = [codePostal, ville].filter(Boolean).join(' ');
    if (cpVille && !(adresse.includes(codePostal || '§') || (ville && adresse.toLowerCase().includes(ville.toLowerCase())))) {
      adresse = [adresse, cpVille].filter(Boolean).join(', ');
    }

    let urlFiche = val('url_fiche');
    // Les URL Pappers / Annuaire se terminent par le SIREN (ex: .../entreprise/nom-123456789)
    if (!siren && urlFiche) {
      const m = urlFiche.match(/(?:^|[^\d])(\d{9})(?:\d{5})?\/?(?:[?#].*)?$/);
      if (m) siren = m[1];
    }
    if (!urlFiche && siren)urlFiche = `https://annuaire-entreprises.data.gouv.fr/entreprise/${siren}`;
    const linkedin = val('linkedin_url');

    if (!nom) {
      stats.filtered++;
      pushPreview(row, 'filtered', 'Nom manquant');
      continue;
    }
    const statut = mapSaasStatut(val('statut_source'));
    if (statut === 'exclu') {
      stats.filtered++;
      pushPreview(row, 'filtered', 'Exclu');
      continue;
    }
    if (!telephone && !adresse && !siren && !urlFiche && !linkedin) {
      stats.filtered++;
      pushPreview(row, 'filtered', 'Aucune coordonnée');
      continue;
    }

    // Doublons à l'intérieur du fichier
    const keys = [
      siren && `siren:${siren}`,
      telephone && digitsOnly(telephone) && `tel:${digitsOnly(telephone)}`,
      `nom:${nom.toLowerCase()}|${codePostal}`
    ].filter(Boolean);
    if (keys.some(k => seenKeys.has(k))) {
      stats.duplicates++;
      pushPreview(row, 'filtered', 'Doublon dans le fichier');
      continue;
    }
    keys.forEach(k => seenKeys.add(k));

    const lowerFiche = urlFiche.toLowerCase();
    const source = lowerFiche.includes('pappers') ? 'pappers'
      : lowerFiche.includes('annuaire-entreprises') ? 'annuaire'
      : 'import';

    prospectsToInsert.push({
      nom_entreprise: nom,
      telephone,
      adresse: adresse || null,
      url_site: val('url_site') || null,
      departement: ville || codePostal || null,
      ville: ville || null,
      code_postal: codePostal || null,
      activite: val('activite') || null,
      code_naf: val('code_naf') || null,
      effectif: val('effectif') || null,
      dirigeant: val('dirigeant') || null,
      siren: siren || null,
      url_fiche: urlFiche || null,
      linkedin_url: linkedin || null,
      notes: val('notes') || null,
      source,
      statut,
      offre: 'saas',
      _row: row // retiré avant insertion, sert à l'aperçu
    });
    stats.imported++;
  }

  return { prospectsToInsert, stats, mapping, preview };
};

// Retire les prospects SaaS déjà présents en base (même SIREN ou même téléphone)
const removeExistingSaas = async (prospects, stats, preview) => {
  if (prospects.length === 0) return prospects;

  const sirens = [...new Set(prospects.map(p => p.siren).filter(Boolean))];
  const phones = [...new Set(prospects.map(p => p.telephone).filter(Boolean))];
  const existingSirens = new Set();
  const existingPhones = new Set();
  const CHUNK = 200;

  for (let i = 0; i < sirens.length; i += CHUNK) {
    const { data, error } = await supabase.from('prospects').select('siren')
      .eq('offre', 'saas').in('siren', sirens.slice(i, i + CHUNK));
    if (error) throw error;
    (data || []).forEach(r => existingSirens.add(r.siren));
  }
  for (let i = 0; i < phones.length; i += CHUNK) {
    const { data, error } = await supabase.from('prospects').select('telephone')
      .eq('offre', 'saas').in('telephone', phones.slice(i, i + CHUNK));
    if (error) throw error;
    (data || []).forEach(r => existingPhones.add(r.telephone));
  }

  const kept = [];
  for (const p of prospects) {
    if ((p.siren && existingSirens.has(p.siren)) || (p.telephone && existingPhones.has(p.telephone))) {
      stats.imported--;
      stats.duplicates++;
      if (preview.length < 50) preview.push({ ...p._row, _status: 'filtered', _reason: 'Déjà en base' });
    } else {
      kept.push(p);
      if (preview.length < 50) preview.push({ ...p._row, _status: 'import' });
    }
  }
  return kept;
};

// =====================================================================
// LECTURE DES FICHIERS (CSV, JSON, Excel)
// =====================================================================

const cellToString = (cell, header) => {
  const v = cell.value;
  if (v && typeof v === 'object' && v.hyperlink) {
    const text = cell.text || '';
    const isLinkColumn = /url|lien|link|fiche|site|pappers|linkedin|annuaire/i.test(header || '');
    return isLinkColumn && !/^https?:\/\//i.test(text) ? v.hyperlink : text;
  }
  return cell.text ?? '';
};

// Lit un onglet Excel : ligne 1 = en-têtes, lignes vides ignorées
const readWorksheet = (sheet) => {
  const headers = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = String(cell.text || '').trim();
  });

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj = {};
    let hasValue = false;
    headers.forEach((h, col) => {
      if (!h) return;
      const value = String(cellToString(row.getCell(col), h)).trim();
      obj[h] = value;
      if (value) hasValue = true;
    });
    if (hasValue) rows.push(obj);
  });
  return rows;
};

// Retourne la liste des onglets du fichier : [{ name, rows }]
// (CSV / JSON = un seul onglet sans nom ; Excel = tous les onglets non vides)
const readSheets = async (file) => {
  const name = (file.originalname || '').toLowerCase();

  if (name.endsWith('.xlsx')) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file.path);
    return workbook.worksheets
      .filter(ws => ws.state !== 'hidden' && ws.state !== 'veryHidden')
      .map(ws => ({ name: ws.name, rows: readWorksheet(ws) }))
      .filter(s => s.rows.length > 0);
  }

  const content = readFileSync(file.path, 'utf8');

  if (name.endsWith('.json')) {
    const parsed = JSON.parse(content);
    return [{ name: null, rows: Array.isArray(parsed) ? parsed : [] }];
  }

  const { data } = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.replace(/^﻿/, '').trim()
  });
  return [{ name: null, rows: data }];
};

// Traitement d'un fichier : une "partie" par onglet (chaque onglet devient une feuille du CRM)
const processFile = async (file, useFilter = true, offre = 'site_web') => {
  const sheets = await readSheets(file);
  if (!sheets.length) return { error: `Fichier ${file.originalname} est vide` };

  const baseName = file.originalname.replace(/\.(csv|json|xlsx)$/i, '');
  const multi = sheets.length > 1;
  const seenKeys = new Set(); // doublons détectés aussi entre onglets
  const parts = [];

  for (const sheet of sheets) {
    const filename = multi ? `${baseName} - ${sheet.name}` : file.originalname;

    if (offre === 'saas') {
      const result = processSaasRows(sheet.rows, seenKeys);
      result.prospectsToInsert = await removeExistingSaas(result.prospectsToInsert, result.stats, result.preview);
      result.prospectsToInsert = result.prospectsToInsert.map(({ _row, ...p }) => p);
      parts.push({ ...result, filename, sheet: sheet.name, multi });
    } else {
      parts.push({ ...processSiteWebRows(sheet.rows, useFilter), filename, sheet: sheet.name, multi });
    }
  }

  return { parts };
};

// POST /api/imports/upload
router.post('/upload', upload.array('files'), async (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Fichiers manquants' });
  const offre = getOffre(req);
  const useFilter = offre === 'site_web' && req.body.useFilter === 'true';
  const category = req.body.category || DEFAULT_CATEGORY[offre];

  const enrichPhones = offre === 'saas' && req.body.enrichPhones === 'true';

  try {
    const results = [];
    const createdImportIds = [];
    let totalImported = 0;

    for (const file of req.files) {
      const processed = await processFile(file, useFilter, offre);
      if (processed.error) {
        results.push({ filename: file.originalname, error: processed.error });
        continue;
      }

      for (const part of processed.parts) {
      const { prospectsToInsert, stats, filename } = part;

      // Onglet d'un classeur sans rien à importer (ex : "Exclus") : pas de feuille vide
      if (part.multi && prospectsToInsert.length === 0) {
        results.push({ filename, stats, skipped: true });
        continue;
      }

      // Trouver le sort_order max dans cette catégorie pour placer la feuille à la fin
      const { data: existingInCategory } = await supabase
        .from('import_history')
        .select('sort_order')
        .eq('offre', offre)
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
          doublons_ignores: stats.duplicates || 0,
          category,
          offre,
          sort_order: newSortOrder
        })
        .select()
        .single();

      if (importError) throw importError;
      createdImportIds.push(importRecord.id);

      if (prospectsToInsert && prospectsToInsert.length > 0) {
        const finalProspects = prospectsToInsert.map(p => ({ ...p, offre, import_id: importRecord.id }));

        const { error: insertError } = await supabase
          .from('prospects')
          .upsert(finalProspects, { onConflict: 'telephone,offre', ignoreDuplicates: true });

        if (insertError) throw insertError;
        totalImported += stats.imported;
      }

      results.push({ filename, stats });
      }
    }

    // Option : recherche automatique des téléphones manquants des feuilles importées
    let enrichmentJob = null;
    let enrichmentError = null;
    if (enrichPhones && createdImportIds.length > 0) {
      if (!isEnrichmentConfigured()) {
        enrichmentError = "Téléphones non recherchés : ajoute TOMTOM_API_KEY ou GOOGLE_PLACES_API_KEY dans server/.env.";
      } else {
        try {
          enrichmentJob = await startJob({ import_ids: createdImportIds }, 'Téléphones des prospects importés');
        } catch (err) {
          enrichmentError = err.status === 409
            ? 'Un enrichissement est déjà en cours : relance-le depuis la Base de données une fois terminé.'
            : `Enrichissement non lancé : ${err.message}`;
        }
      }
    }

    res.json({
      success: true,
      stats: { imported: totalImported, filesCount: req.files.length },
      results,
      enrichmentJob,
      enrichmentError
    });

  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/imports/preview
router.post('/preview', upload.array('files'), async (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Fichiers manquants' });
  const offre = getOffre(req);
  const useFilter = offre === 'site_web' && req.body.useFilter === 'true';

  try {
    const allPreviews = [];
    const globalEstimates = { total: 0, willImport: 0, willFilter: 0, duplicates: 0 };
    let mapping = {};

    for (const file of req.files) {
      const processed = await processFile(file, useFilter, offre);
      if (processed.error) continue;
      for (const part of processed.parts) {
        const { stats, preview, mapping: fileMapping } = part;
        globalEstimates.total += stats.total;
        globalEstimates.willImport += stats.imported;
        globalEstimates.willFilter += stats.filtered + (stats.duplicates || 0);
        globalEstimates.duplicates += stats.duplicates || 0;
        mapping = fileMapping;

        // On limite par onglet pour que chaque onglet apparaisse dans l'aperçu
        const perPart = part.multi ? 30 : 100;
        preview.slice(0, perPart).forEach(row => {
          allPreviews.push({ ...row, _filename: part.multi ? part.sheet : file.originalname });
        });
      }
    }

    res.json({ success: true, offre, estimates: globalEstimates, mapping, preview: allPreviews.slice(0, 100) });
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  const offre = getOffre(req);
  const { data, error } = await supabase
    .from('import_history')
    .select('*')
    .eq('offre', offre)
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

// Supprime des feuilles et leurs prospects, en vérifiant chaque étape.
// Les lignes liées (historique d'activité, tâches de planning) sont nettoyées
// d'abord pour qu'une contrainte de clé étrangère ne bloque pas la suppression.
const deleteSheets = async (importIds) => {
  const prospectIds = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('prospects')
      .select('id').in('import_id', importIds).range(from, from + 999);
    if (error) throw new Error(`Lecture des prospects : ${error.message}`);
    prospectIds.push(...data.map(p => p.id));
    if (data.length < 1000) break;
  }

  // Par paquets pour ne pas dépasser la taille max d'URL / le timeout SQL
  for (let i = 0; i < prospectIds.length; i += 200) {
    const chunk = prospectIds.slice(i, i + 200);
    const logs = await supabase.from('activity_logs').delete().in('prospect_id', chunk);
    if (logs.error) throw new Error(`Suppression de l'historique : ${logs.error.message}`);
    const tasks = await supabase.from('planning_tasks').update({ prospect_id: null }).in('prospect_id', chunk);
    if (tasks.error) throw new Error(`Détachement du planning : ${tasks.error.message}`);
    const del = await supabase.from('prospects').delete().in('id', chunk);
    if (del.error) {
      if (del.error.code === '23503') {
        throw new Error(`Des prospects de cette feuille sont liés à d'autres données (factures ?) : ${del.error.details || del.error.message}`);
      }
      throw new Error(`Suppression des prospects : ${del.error.message}`);
    }
  }

  const { error } = await supabase.from('import_history').delete().in('id', importIds);
  if (error) throw new Error(`Suppression de la feuille : ${error.message}`);
  return prospectIds.length;
};

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteSheets([req.params.id]);
    res.json({ success: true, deleted });
  } catch (error) {
    console.error('Sheet delete error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/bulk-delete', async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs invalides' });
  try {
    const deleted = await deleteSheets(ids);
    res.json({ success: true, deleted, message: `${ids.length} feuilles supprimées` });
  } catch (error) {
    console.error('Bulk sheet delete error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
