import { useState, useEffect, useRef, useCallback } from 'react';
import { getEnrichmentStatus, getEnrichmentJob, startPhoneEnrichment, cancelEnrichmentJob } from '../services/api';

const POLL_MS = 1500;

// Suit un enrichissement en masse : reprend celui en cours au chargement,
// interroge le serveur pendant qu'il tourne et appelle onFinish à la fin.
export default function useEnrichmentJob({ onFinish } = {}) {
  const [job, setJob] = useState(null);
  const [configured, setConfigured] = useState(null);
  const [usage, setUsage] = useState(null);
  const onFinishRef = useRef(onFinish);
  useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);

  // État initial : configuration + traitement en cours éventuel
  useEffect(() => {
    let cancelled = false;
    getEnrichmentStatus()
      .then(res => {
        if (cancelled) return;
        setConfigured(res.data.configured);
        setUsage({ usedToday: res.data.usedToday, dailyLimit: res.data.dailyLimit });
        if (res.data.job?.status === 'running') setJob(res.data.job);
      })
      .catch(() => !cancelled && setConfigured(false));
    return () => { cancelled = true; };
  }, []);

  // Suivi de la progression (tolère quelques échecs réseau passagers)
  const failuresRef = useRef(0);
  useEffect(() => {
    if (!job || job.status !== 'running') return undefined;
    const timer = setTimeout(async () => {
      try {
        const res = await getEnrichmentJob(job.id);
        failuresRef.current = 0;
        setJob(res.data);
        if (res.data.status !== 'running') onFinishRef.current?.(res.data);
      } catch (err) {
        const lost = err.response?.status === 404;
        failuresRef.current += 1;
        if (!lost && failuresRef.current < 5) {
          setJob(prev => prev && { ...prev }); // relance le suivi au prochain tour
          return;
        }
        failuresRef.current = 0;
        const error = lost
          ? "Le serveur a redémarré pendant la recherche, le suivi est perdu. Relance l'enrichissement : les prospects déjà traités ne seront pas refaits."
          : 'Serveur injoignable : vérifie qu\'il tourne toujours, puis relance.';
        setJob(prev => prev && { ...prev, status: 'failed', error });
        onFinishRef.current?.();
      }
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [job]);

  const start = useCallback(async (filter) => {
    try {
      const res = await startPhoneEnrichment(filter);
      setJob(res.data);
      return res.data;
    } catch (err) {
      // Un traitement tourne déjà : on l'affiche
      if (err.response?.status === 409 && err.response.data?.job) {
        setJob(err.response.data.job);
      }
      throw err;
    }
  }, []);

  const cancel = useCallback(async () => {
    if (!job) return;
    const res = await cancelEnrichmentJob(job.id);
    setJob(res.data);
  }, [job]);

  const dismiss = useCallback(() => setJob(null), []);

  return { job, setJob, start, cancel, dismiss, configured, usage };
}
