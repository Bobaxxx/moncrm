import { supabase } from './database.js';

async function deduplicate() {
  console.log('🧹 Nettoyage des doublons dans l\'historique...');

  try {
    // 1. Récupérer TOUS les logs
    const { data: logs, error } = await supabase
      .from('activity_logs')
      .select('id, prospect_id, new_value, event_type')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const seen = new Set();
    const idsToDelete = [];

    for (const log of logs) {
      const key = `${log.prospect_id}-${log.new_value}-${log.event_type}`;
      if (seen.has(key)) {
        idsToDelete.push(log.id);
      } else {
        seen.add(key);
      }
    }

    if (idsToDelete.length === 0) {
      console.log('✅ Aucun doublon trouvé.');
      return;
    }

    console.log(`🗑️ Suppression de ${idsToDelete.length} doublons...`);

    // Suppression par paquets
    const chunkSize = 20;
    for (let i = 0; i < idsToDelete.length; i += chunkSize) {
      const chunk = idsToDelete.slice(i, i + chunkSize);
      const { error: delError } = await supabase
        .from('activity_logs')
        .delete()
        .in('id', chunk);
      
      if (delError) console.error('Error deleting chunk:', delError.message);
    }

    console.log('✅ Nettoyage terminé !');
  } catch (err) {
    console.error('❌ Erreur lors du nettoyage:', err.message);
  }
}

deduplicate();
