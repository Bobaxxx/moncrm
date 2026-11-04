// =====================================================================
// Enrichissement des téléphones - 2 fournisseurs possibles :
//   - TomTom Search API (gratuit, sans carte bancaire, ~2 500 requêtes/jour)
//     https://developer.tomtom.com/search-api/documentation
//   - Google Places API (New) - Text Search (payant au-delà du quota gratuit)
//
// Configuration (server/.env) - une des deux clés suffit :
//   TOMTOM_API_KEY=...
//   GOOGLE_PLACES_API_KEY=...
//   ENRICHMENT_PROVIDER=tomtom|google   (optionnel si les deux clés sont présentes, défaut google)
//   PLACES_MIN_INTERVAL_MS=250         (délai minimum entre 2 requêtes, défaut 250 ms)
//   PLACES_DAILY_LIMIT=500             (garde-fou : requêtes max par jour, défaut 500)
// =====================================================================

import { supabase } from '../db/database.js';

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';
const TOMTOM_URL = 'https://api.tomtom.com/search/2/search';
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.businessStatus'
].join(',');

const MIN_INTERVAL_MS = Number(process.env.PLACES_MIN_INTERVAL_MS) || 250;
const DAILY_LIMIT = Number(process.env.PLACES_DAILY_LIMIT) || 500;
const MAX_RETRIES = 3;

// Fournisseur actif : choix explicite, sinon la clé présente (Google prioritaire)
export const getProvider = () => {
  const forced = (process.env.ENRICHMENT_PROVIDER || '').toLowerCase();
  if (forced === 'tomtom' && process.env.TOMTOM_API_KEY) return 'tomtom';
  if (forced === 'google' && process.env.GOOGLE_PLACES_API_KEY) return 'google';
  if (process.env.GOOGLE_PLACES_API_KEY) return 'google';
  if (process.env.TOMTOM_API_KEY) return 'tomtom';
  return null;
};

export const PROVIDER_LABELS = { google: 'Google Places', tomtom: 'TomTom' };

export const isEnrichmentConfigured = () => Boolean(getProvider());

export const NOT_CONFIGURED_MESSAGE =
  "L'enrichissement n'est pas configuré : ajoute TOMTOM_API_KEY (gratuit) ou GOOGLE_PLACES_API_KEY dans server/.env puis redémarre le serveur.";

const mapsSearchUrl = (...parts) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.filter(Boolean).join(' '))}`;

// Erreur bloquante (clé invalide, quota du jour atteint...) : on arrête un traitement en masse
export class EnrichmentFatalError extends Error {}

// ---------------------------------------------------------------------
// Rate-limit : une seule requête à la fois, espacées de MIN_INTERVAL_MS
// + compteur journalier (en mémoire, remis à zéro chaque jour / au redémarrage)
// ---------------------------------------------------------------------
let queue = Promise.resolve();
let lastCallAt = 0;
const usage = { day: null, count: 0 };

const today = () => new Date().toISOString().split('T')[0];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export const getUsage = () => {
  if (usage.day !== today()) return { usedToday: 0, dailyLimit: DAILY_LIMIT };
  return { usedToday: usage.count, dailyLimit: DAILY_LIMIT };
};

const schedule = (fn) => {
  const run = queue.then(async () => {
    const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();
    return fn();
  });
  queue = run.catch(() => {}); // une erreur ne doit pas bloquer la file
  return run;
};

const countCall = () => {
  if (usage.day !== today()) { usage.day = today(); usage.count = 0; }
  if (usage.count >= DAILY_LIMIT) {
    throw new EnrichmentFatalError(`Limite quotidienne atteinte (${DAILY_LIMIT} recherches). Modifiable via PLACES_DAILY_LIMIT.`);
  }
  usage.count++;
};

// ---------------------------------------------------------------------
// Appel API avec reprise sur 429 / 5xx
// ---------------------------------------------------------------------
// Chaque fournisseur renvoie des lieux au même format :
//   { name, address, phone, website, mapsUrl, closed }
const PROVIDERS = {
  google: {
    request: (textQuery) => fetch(PLACES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': FIELD_MASK
      },
      body: JSON.stringify({ textQuery, languageCode: 'fr', regionCode: 'FR', pageSize: 5 }),
      signal: AbortSignal.timeout(10000)
    }),
    parse: (data) => (data.places || []).map(p => ({
      name: p.displayName?.text || '',
      address: p.formattedAddress || '',
      phone: p.nationalPhoneNumber || p.internationalPhoneNumber || null,
      website: p.websiteUri || null,
      mapsUrl: p.googleMapsUri || null,
      closed: p.businessStatus === 'CLOSED_PERMANENTLY'
    })),
    forbiddenHint: 'Vérifie la clé API et que "Places API (New)" est activée.'
  },
  tomtom: {
    request: (textQuery) => {
      const params = new URLSearchParams({
        key: process.env.TOMTOM_API_KEY,
        countrySet: 'FR',
        language: 'fr-FR',
        limit: '5',
        idxSet: 'POI'
      });
      return fetch(`${TOMTOM_URL}/${encodeURIComponent(textQuery)}.json?${params}`, {
        signal: AbortSignal.timeout(10000)
      });
    },
    parse: (data) => (data.results || []).filter(r => r.poi).map(r => {
      const address = r.address?.freeformAddress
        || [r.address?.streetName, r.address?.postalCode, r.address?.municipality].filter(Boolean).join(' ');
      return {
        name: r.poi.name || '',
        address,
        phone: r.poi.phone || null,
        website: r.poi.url ? (/^https?:\/\//i.test(r.poi.url) ? r.poi.url : `https://${r.poi.url}`) : null,
        mapsUrl: mapsSearchUrl(r.poi.name, address),
        closed: false
      };
    }),
    forbiddenHint: 'Vérifie la clé TomTom (developer.tomtom.com > Dashboard > Keys).'
  }
};

const searchPlaces = async (textQuery) => {
  const providerKey = getProvider();
  const provider = PROVIDERS[providerKey];
  const label = PROVIDER_LABELS[providerKey];

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const response = await schedule(async () => {
      countCall();
      return provider.request(textQuery);
    });

    if (response.ok) {
      return provider.parse(await response.json());
    }

    const body = await response.text().catch(() => '');
    // TomTom signale parfois un dépassement de débit par un 403 "Over Qps"
    const rateLimited = response.status === 429 || /over\s*qps|rate/i.test(body);
    if ((response.status === 401 || response.status === 403) && !rateLimited) {
      throw new EnrichmentFatalError(`Accès refusé par ${label} (${response.status}). ${provider.forbiddenHint} ${body.slice(0, 200)}`);
    }
    if (rateLimited || response.status >= 500) {
      if (attempt === MAX_RETRIES) throw new Error(`${label} indisponible (${response.status}) après ${MAX_RETRIES} essais`);
      await sleep(1000 * 2 ** attempt); // 2 s, 4 s...
      continue;
    }
    throw new Error(`${label} a répondu ${response.status} : ${body.slice(0, 200)}`);
  }
  return [];
};

// ---------------------------------------------------------------------
// Rapprochement : on ne garde un résultat que s'il correspond vraiment
// (même commune / code postal ET nom proche) pour ne pas enregistrer le
// numéro d'une autre entreprise.
// ---------------------------------------------------------------------
const normalize = (s) => String(s || '')
  .replace(/\b(\w)\.(?=\w)/g, '$1') // sigles : "S.T.B.B." -> "STBB."
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const STOP_WORDS = new Set([
  'sarl', 'sas', 'sasu', 'eurl', 'sa', 'sci', 'snc', 'scop', 'ei', 'eirl', 'ets', 'etablissements',
  'entreprise', 'entreprises', 'societe', 'ste', 'et', 'fils', 'freres', 'de', 'des', 'du', 'la', 'le',
  'les', 'l', 'd', 'and', 'cie', 'groupe', 'france'
]);

const significantTokens = (s) => normalize(s).split(' ').filter(t => t.length > 1 && !STOP_WORDS.has(t));

// Part des mots significatifs d'un nom retrouvés dans l'autre (meilleur des deux sens)
export const nameScore = (a, b) => {
  const ta = significantTokens(a);
  const tb = significantTokens(b);
  if (!ta.length || !tb.length) return 0;
  const sb = new Set(tb);
  const sa = new Set(ta);
  const aInB = ta.filter(t => sb.has(t) || [...sb].some(x => x.length >= 4 && t.length >= 4 && (x.startsWith(t) || t.startsWith(x)))).length / ta.length;
  const bInA = tb.filter(t => sa.has(t)).length / tb.length;
  return Math.max(aInB, bInA);
};

const locationMatches = (formattedAddress, { ville, code_postal }) => {
  const addr = normalize(formattedAddress);
  if (code_postal && addr.includes(normalize(code_postal))) return true;
  if (ville && addr.includes(normalize(ville))) return true;
  return false;
};

// Format français lisible : "04 71 02 03 04" (ou null si invalide)
export const formatFrenchPhone = (raw) => {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('0033')) digits = digits.slice(4);
  else if (digits.startsWith('33') && digits.length === 11) digits = digits.slice(2);
  if (digits.length === 9) digits = `0${digits}`;
  if (!/^0[1-9]\d{8}$/.test(digits)) return null;
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ');
};

export const pickBestPlace = (places, prospect) => {
  let best = null;
  for (const place of places) {
    if (place.closed) continue;
    const name = place.name;
    const score = nameScore(prospect.nom_entreprise, name);
    const locOk = locationMatches(place.address, prospect);
    const phone = formatFrenchPhone(place.phone);
    const candidate = { place, name, score, locOk, phone };
    if (!best || (locOk && !best.locOk) || (locOk === best.locOk && score > best.score)) best = candidate;
  }
  return best;
};

// ---------------------------------------------------------------------
// Recherche d'un téléphone pour une entreprise
// Retour : { status, telephone, website, maps_url, place_name, place_address, score }
//   status = found | not_found | ambiguous
// ---------------------------------------------------------------------
export const findPhone = async (prospect) => {
  if (!isEnrichmentConfigured()) {
    throw new EnrichmentFatalError(NOT_CONFIGURED_MESSAGE);
  }
  const location = prospect.adresse || [prospect.code_postal, prospect.ville].filter(Boolean).join(' ');
  const textQuery = [prospect.nom_entreprise, location].filter(Boolean).join(', ');

  const places = await searchPlaces(textQuery);
  if (!places.length) return { status: 'not_found' };

  const best = pickBestPlace(places, prospect);
  const result = {
    place_name: best?.name || null,
    place_address: best?.place.address || null,
    score: best ? Math.round(best.score * 100) / 100 : 0
  };

  // Correspondance sûre : bonne commune + nom proche
  if (best && best.locOk && best.score >= 0.5) {
    if (!best.phone) return { ...result, status: 'not_found', maps_url: best.place.mapsUrl };
    return {
      ...result,
      status: 'found',
      telephone: best.phone,
      website: best.place.website,
      maps_url: best.place.mapsUrl
    };
  }
  return { ...result, status: 'ambiguous' };
};

// ---------------------------------------------------------------------
// Enrichit un prospect en base (téléphone, site, lien Maps, statut)
// ---------------------------------------------------------------------
export const enrichProspect = async (prospect) => {
  let result;
  try {
    result = await findPhone(prospect);
  } catch (err) {
    if (err instanceof EnrichmentFatalError) throw err;
    await supabase.from('prospects')
      .update({ enrichment_status: 'error', enriched_at: new Date().toISOString() })
      .eq('id', prospect.id);
    return { id: prospect.id, nom_entreprise: prospect.nom_entreprise, status: 'error', error: err.message };
  }

  const updates = { enrichment_status: result.status, enriched_at: new Date().toISOString() };
  if (result.maps_url) updates.google_maps_url = result.maps_url;
  if (result.status === 'found') {
    updates.telephone = result.telephone;
    if (result.website && !prospect.url_site) updates.url_site = result.website;
  }

  let { error } = await supabase.from('prospects').update(updates).eq('id', prospect.id);

  // Numéro déjà utilisé par un autre prospect SaaS (unicité téléphone + espace)
  if (error?.code === '23505') {
    result = { ...result, status: 'duplicate_phone' };
    delete updates.telephone;
    updates.enrichment_status = 'duplicate_phone';
    ({ error } = await supabase.from('prospects').update(updates).eq('id', prospect.id));
  }
  if (error) {
    return { id: prospect.id, nom_entreprise: prospect.nom_entreprise, status: 'error', error: error.message };
  }

  if (result.status === 'found') {
    await supabase.from('activity_logs').insert({
      prospect_id: prospect.id,
      event_type: 'phone_enriched',
      old_value: null,
      new_value: result.telephone
    });
  }

  return {
    id: prospect.id,
    nom_entreprise: prospect.nom_entreprise,
    status: result.status,
    telephone: result.telephone || null,
    url_site: updates.url_site || null,
    google_maps_url: result.maps_url || null,
    place_name: result.place_name || null
  };
};
