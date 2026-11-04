import { Router } from 'express';
import { supabase } from '../db/database.js';
import { getOffre } from '../utils/offre.js';

const router = Router();

// GET /api/sms/templates
router.get('/templates', async (req, res) => {
  const { data, error } = await supabase
    .from('sms_templates')
    .select('*')
    .eq('actif', true)
    .eq('offre', getOffre(req));

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/sms/generate/:prospectId
router.get('/generate/:prospectId', async (req, res) => {
  const { prospectId } = req.params;

  try {
    // 1. Récupérer le prospect
    const prospectRes = await supabase.from('prospects').select('*').eq('id', prospectId).single();
    if (prospectRes.error) throw prospectRes.error;
    const prospect = prospectRes.data;

    // 2. Templates de l'espace du prospect (Site web ou SaaS)
    const templatesRes = await supabase
      .from('sms_templates')
      .select('*')
      .eq('actif', true)
      .eq('offre', prospect.offre || 'site_web');
    if (templatesRes.error) throw templatesRes.error;
    const templates = templatesRes.data;

    if (!templates.length) {
      return res.status(404).json({ error: 'Aucun template SMS actif trouvé.' });
    }

    if (!prospect.telephone) {
      return res.status(400).json({ error: "Ce prospect n'a pas de numéro de téléphone." });
    }

    // 3. Sélectionner un template au hasard (stratégie rotation)
    const template = templates[Math.floor(Math.random() * templates.length)];

    // 4. Remplacer les placeholders
    let message = template.contenu
      .replace(/{nom_entreprise}/g, prospect.nom_entreprise)
      .replace(/{departement}/g, prospect.departement || '')
      .replace(/{ville}/g, prospect.ville || prospect.departement || '')
      .replace(/{dirigeant}/g, prospect.dirigeant || '')
      .replace(/ +,/g, ',')
      .replace(/ {2,}/g, ' ')
      .trim();

    // 5. Générer le lien sms: (format standard iPhone/Android)
    const smsLink = `sms:${prospect.telephone}?body=${encodeURIComponent(message)}`;

    res.json({
      success: true,
      message,
      tel: prospect.telephone,
      link: smsLink,
      template_name: template.nom
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
