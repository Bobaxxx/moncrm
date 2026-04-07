import { supabase } from '../db/database.js';

/**
 * Middleware de sécurité pour vérifier le Token JWT Supabase passé dans le header Authorization.
 * Si le token est absent ou invalide, la requête est rejetée avec un code 401 (Unauthorized).
 */
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Accès non autorisé. Token manquant.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Vérification directe du token avec Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Session invalide ou expirée.' });
    }

    // On attache l'utilisateur à la requête pour usage ultérieur
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(401).json({ error: 'Erreur d\'authentification.' });
  }
};
