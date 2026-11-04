import { useState, useCallback, useMemo } from 'react';
import { getCurrentOffre, setCurrentOffre } from '../lib/workspace';
import { WorkspaceContext } from './useWorkspace';

export function WorkspaceProvider({ children }) {
  const [offre, setOffreState] = useState(getCurrentOffre);

  const setOffre = useCallback((next) => {
    setCurrentOffre(next);
    setOffreState(next);
  }, []);

  const value = useMemo(() => ({ offre, setOffre, isSaas: offre === 'saas' }), [offre, setOffre]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
