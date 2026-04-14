import { supabase } from './server/src/db/database.js';

async function migrate() {
  console.log('--- Migration: Ajout de la colonne category et initialisation ---');

  // Supabase JS doesn't support 'ALTER TABLE' directly via standard client.
  // We need to use RPC or just warn the user to run SQL.
  // HOWEVER, we can update existing rows if the column already exists.
  
  // Actually, I'll update the server code to handle missing column gracefully OR 
  // ask the user to run the SQL in Supabase dashboard.
  
  // Let's try to update all rows to 'Serrurier' as requested.
  // If the column doesn't exist yet, it might fail.
  const { data, error } = await supabase
    .from('import_history')
    .update({ category: 'Serrurier' })
    .is('category', null);

  if (error) {
    if (error.code === '42703') { // Column does not exist
      console.error('❌ La colonne "category" n''existe pas dans "import_history".');
      console.log('Veuillez exécuter ce SQL dans votre dashboard Supabase :');
      console.log('ALTER TABLE import_history ADD COLUMN IF NOT EXISTS category TEXT DEFAULT \'Serrurier\';');
    } else {
      console.error('❌ Erreur migration:', error);
    }
  } else {
    console.log('✅ Migration réussie (ou déjà faite).');
  }
  process.exit(0);
}

migrate();
