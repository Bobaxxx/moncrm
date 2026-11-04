// Espace de travail courant ('site_web' | 'saas'), lu par l'intercepteur Axios
// et mémorisé dans le navigateur pour retrouver le même espace au rechargement.

export const OFFRES = ['site_web', 'saas'];
const STORAGE_KEY = 'moncrm_offre';

const readStored = () => {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return OFFRES.includes(value) ? value : 'site_web';
  } catch {
    return 'site_web';
  }
};

let currentOffre = readStored();

export const getCurrentOffre = () => currentOffre;

export const setCurrentOffre = (offre) => {
  if (!OFFRES.includes(offre)) return;
  currentOffre = offre;
  try {
    window.localStorage.setItem(STORAGE_KEY, offre);
  } catch {
    // Stockage indisponible (navigation privée) : l'espace reste actif pour la session
  }
};
