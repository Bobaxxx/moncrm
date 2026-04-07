import { Router } from 'express';
import { supabase } from '../db/database.js';

const router = Router();

// GET /api/sms/templates
router.get('/templates', async (req, res) => {
  const { data, error } = await supabase
    .from('sms_templates')
    .select('*')
    .eq('actif', true);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/sms/generate/:prospectId
router.get('/generate/:prospectId', async (req, res) => {
  const { prospectId } = req.params;

  try {
    // 1. Récupérer le prospect et les templates en parallèle
    const [prospectRes, templatesRes] = await Promise.all([
      supabase.from('prospects').select('*').eq('id', prospectId).single(),
      supabase.from('sms_templates').select('*').eq('actif', true)
    ]);

    if (prospectRes.error) throw prospectRes.error;
    if (templatesRes.error) throw templatesRes.error;

    const prospect = prospectRes.data;
    const templates = templatesRes.data;

    if (!templates.length) {
      return res.status(404).json({ error: 'Aucun template SMS actif trouvé.' });
    }

    // 2. Sélectionner un template au hasard (stratégie rotation)
    const template = templates[Math.floor(Math.random() * templates.length)];

    // 3. Remplacer les placeholders
    let message = template.contenu
      .replace(/{nom_entreprise}/g, prospect.nom_entreprise)
      .replace(/{departement}/g, prospect.departement || '');

    // 4. Générer le lien sms: (format standard iPhone/Android)
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
