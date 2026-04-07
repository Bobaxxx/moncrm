import { supabase } from './database.js';

async function syncLogs() {
  console.log('🔄 Démarrage de la synchronisation des historiques...');

  try {
    // 1. Récupérer tous les prospects avec un statut avancé
    const { data: prospects, error } = await supabase
      .from('prospects')
      .select('id, statut, sms_sent_at, updated_at, created_at, nom_entreprise');

    if (error) throw error;

    console.log(`Found ${prospects.length} prospects to check.`);

    const logsToInsert = [];
    
    for (const p of prospects) {
      // Pour chaque prospect, on vérifie s'il doit avoir un log historique
      
      // Cas SMS Envoyé
      if (p.statut === 'sms_envoye' || p.sms_sent_at) {
        const date = p.sms_sent_at || p.updated_at || p.created_at;
        logsToInsert.push({
          prospect_id: p.id,
          event_type: 'status_change',
          old_value: 'a_contacter',
          new_value: 'sms_envoye',
          created_at: date
        });
      }

      // Cas Maquette Envoyée
      if (p.statut === 'maquette_envoyee') {
        logsToInsert.push({
          prospect_id: p.id,
          event_type: 'status_change',
          old_value: 'sms_envoye',
          new_value: 'maquette_envoyee',
          created_at: p.updated_at || p.created_at
        });
      }

      // Cas Client Signé
      if (p.statut === 'client_signe') {
        logsToInsert.push({
          prospect_id: p.id,
          event_type: 'status_change',
          old_value: 'maquette_envoyee',
          new_value: 'client_signe',
          created_at: p.updated_at || p.created_at
        });
      }
    }

    if (logsToInsert.length === 0) {
      console.log('✅ Aucun historique à synchroniser.');
      return;
    }

    console.log(`🚀 Insertion de ${logsToInsert.length} entrées dans l'historique...`);

    // On insère par paquets pour éviter de saturer Supabase
    const chunkSize = 50;
    for (let i = 0; i < logsToInsert.length; i += chunkSize) {
      const chunk = logsToInsert.slice(i, i + chunkSize);
      const { error: insError } = await supabase.from('activity_logs').insert(chunk);
      if (insError) {
        console.error('Error inserting chunk:', insError.message);
      }
    }

    console.log('✅ Synchronisation terminée avec succès !');
  } catch (err) {
    console.error('❌ Erreur lors de la synchronisation:', err.message);
  }
}

syncLogs();
