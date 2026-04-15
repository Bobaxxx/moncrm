import { supabase } from './server/src/db/database.js';

async function checkSchema() {
  console.log('--- Vérification du schéma import_history ---');
  
  // Essayer de faire un select simple pour voir si la colonne existe
  const { data, error } = await supabase
    .from('import_history')
    .select('id, filename, category')
    .limit(1);

  if (error) {
    console.error('❌ Erreur lors de la vérification :', error.message);
    if (error.message.includes('column "category" does not exist')) {
      console.log('\n>>> SOLUTION : La colonne "category" manque dans votre base de données Supabase.');
      console.log('Allez dans le SQL Editor de Supabase et exécutez :\n');
      console.log('ALTER TABLE import_history ADD COLUMN IF NOT EXISTS category TEXT DEFAULT \'Serrurier\';');
    }
  } else {
    console.log('✅ La colonne "category" existe bien.');
    console.log('Données d''aperçu :', data);
  }
  process.exit(0);
}

checkSchema();
