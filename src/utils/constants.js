export const STATUT_LABELS = {
  a_contacter: 'À contacter',
  sms_envoye: 'SMS envoyé',
  maquette_demandee: 'Maquette demandée',
  maquette_envoyee: 'Maquette envoyée',
  a_relancer: 'À relancer par appel',
  interese: 'Prospect intéréssé/pas laché',
  client_signe: 'Client signé',
  pas_de_budget: 'Futur potentiel (pas de budget)'
};

export const STATUT_COLORS = {
  a_contacter: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40', dot: 'bg-blue-400' },
  sms_envoye: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40', dot: 'bg-amber-400' },
  maquette_demandee: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40', dot: 'bg-purple-400' },
  maquette_envoyee: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/40', dot: 'bg-cyan-400' },
  a_relancer: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/40', dot: 'bg-orange-400' },
  interese: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/40', dot: 'bg-indigo-400' },
  client_signe: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40', dot: 'bg-emerald-400' },
  pas_de_budget: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40', dot: 'bg-rose-400' }
};

export const STATUT_APPEL_LABELS = {
  a_appeler: 'À appeler',
  appele: 'Appelé',
  a_rappeler: 'À rappeler',
  message_laisse: 'Message laissé',
  pas_interesse: 'Pas intéressé'
};

export const STATUT_APPEL_COLORS = {
  a_appeler: { bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/40', dot: 'bg-sky-400' },
  appele: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40', dot: 'bg-emerald-400' },
  a_rappeler: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/40', dot: 'bg-indigo-400' },
  message_laisse: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/40', dot: 'bg-slate-400' },
  pas_interesse: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40', dot: 'bg-rose-400' }
};

export const SOURCE_LABELS = {
  maps: 'Google Maps',
  solocal: 'Solocal',
  pagesjaunes: 'Pages Jaunes',
  facebook: 'Facebook',
  instagram: 'Instagram',
  business_site: 'Business.site',
  pappers: 'Pappers',
  annuaire: 'Annuaire Entreprises',
  import: 'Import',
  manuel: 'Manuel'
};

export const SOURCE_BADGE_CLASS = {
  maps: 'badge-maps',
  solocal: 'badge-solocal',
  pagesjaunes: 'badge-pagesjaunes',
  facebook: 'badge-facebook',
  instagram: 'badge-instagram',
  business_site: 'badge-business_site',
  pappers: 'badge-pagesjaunes',
  annuaire: 'badge-solocal',
  import: 'badge-maps',
  manuel: 'badge-maps'
};

export const STATUT_ORDER = [
  'a_contacter',
  'sms_envoye',
  'maquette_demandee',
  'maquette_envoyee',
  'a_relancer',
  'interese',
  'pas_de_budget',
  'client_signe'
];

// =====================================================================
// ESPACE SAAS (PlanniBat)
// =====================================================================

export const SAAS_STATUT_LABELS = {
  a_contacter: 'À contacter',
  visite_ou_contact_tente: 'Visite / contact tenté',
  echange_qualifie: 'Échange qualifié',
  demo_faite: 'Démo faite',
  essai_actif: 'Essai actif',
  abonne: 'Abonné',
  perdu: 'Perdu'
};

export const SAAS_STATUT_COLORS = {
  a_contacter: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40', dot: 'bg-blue-400' },
  visite_ou_contact_tente: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40', dot: 'bg-amber-400' },
  echange_qualifie: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40', dot: 'bg-purple-400' },
  demo_faite: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/40', dot: 'bg-cyan-400' },
  essai_actif: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/40', dot: 'bg-indigo-400' },
  abonne: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40', dot: 'bg-emerald-400' },
  perdu: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40', dot: 'bg-rose-400' }
};

export const SAAS_STATUT_ORDER = [
  'a_contacter',
  'visite_ou_contact_tente',
  'echange_qualifie',
  'demo_faite',
  'essai_actif',
  'abonne',
  'perdu'
];

export const OFFRE_LABELS = {
  site_web: 'Site web',
  saas: 'SaaS'
};

// Configuration complète du pipeline pour un espace donné
export const getStatutConfig = (offre) => {
  const isSaas = offre === 'saas';
  return {
    offre: isSaas ? 'saas' : 'site_web',
    isSaas,
    STATUT_LABELS: isSaas ? SAAS_STATUT_LABELS : STATUT_LABELS,
    STATUT_COLORS: isSaas ? SAAS_STATUT_COLORS : STATUT_COLORS,
    STATUT_ORDER: isSaas ? SAAS_STATUT_ORDER : STATUT_ORDER,
    // Statut "client gagné"
    SIGNED_STATUT: isSaas ? 'abonne' : 'client_signe',
    // Dossier proposé par défaut à l'import
    DEFAULT_CATEGORY: isSaas ? 'BTP' : 'Serrurier'
  };
};
