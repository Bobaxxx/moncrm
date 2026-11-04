import { createContext, useContext, useMemo } from 'react';
import { getStatutConfig } from '../utils/constants';

export const WorkspaceContext = createContext({ offre: 'site_web', setOffre: () => {}, isSaas: false });

// Espace actif ('site_web' | 'saas') et fonction pour en changer
export const useWorkspace = () => useContext(WorkspaceContext);

// Libellés / couleurs / ordre des statuts du pipeline de l'espace courant
export const useStatuts = () => {
  const { offre } = useWorkspace();
  return useMemo(() => getStatutConfig(offre), [offre]);
};
