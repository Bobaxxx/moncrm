// Gestion des espaces de travail : 'site_web' (vente de sites) et 'saas' (PlanniBat)

export const OFFRES = ['site_web', 'saas'];
export const DEFAULT_OFFRE = 'site_web';

// L'espace actif est envoyé par le frontend dans l'en-tête X-Offre
export const getOffre = (req) => {
  const value = String(req.headers['x-offre'] || req.query?.offre || req.body?.offre || '').trim();
  return OFFRES.includes(value) ? value : DEFAULT_OFFRE;
};

// Colonnes du pipeline par espace (ordre d'affichage)
export const PIPELINE_STATUTS = {
  site_web: [
    'a_contacter',
    'sms_envoye',
    'maquette_demandee',
    'maquette_envoyee',
    'a_relancer',
    'interese',
    'pas_de_budget',
    'client_signe'
  ],
  saas: [
    'a_contacter',
    'visite_ou_contact_tente',
    'echange_qualifie',
    'demo_faite',
    'essai_actif',
    'abonne',
    'perdu'
  ]
};

// Statuts comptés jour par jour dans le "Bilan de jour"
export const TRACKED_STATUTS = {
  site_web: ['sms_envoye', 'maquette_demandee', 'maquette_envoyee', 'client_signe'],
  saas: ['visite_ou_contact_tente', 'echange_qualifie', 'demo_faite', 'essai_actif', 'abonne', 'perdu']
};

// Statut "client gagné" par espace
export const SIGNED_STATUT = {
  site_web: 'client_signe',
  saas: 'abonne'
};

export const DEFAULT_CATEGORY = {
  site_web: 'Serrurier',
  saas: 'BTP'
};
