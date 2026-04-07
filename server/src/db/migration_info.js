import { supabase } from './database.js';

async function migrate() {
  console.log('🚀 Démarrage de la migration : ajout de la colonne maquette_phone');
  
  // Malheureusement, supabase-js ne permet pas de faire des ALTER TABLE directement.
  // Cependant, nous pouvons essayer de faire une insertion avec ce champ pour forcer
  // la base à l'accepter si c'était possible, mais ce n'est pas le cas pour Postgres.
  
  // La solution correcte est d'utiliser l'interface SQL de Supabase ou une migration.
  
  console.log('⚠️ INFO : Pour que la persistance du nom du téléphone fonctionne parfaitement,');
  console.log('veuillez exécuter cette commande SQL dans votre console Supabase :');
  console.log('\nALTER TABLE prospects ADD COLUMN IF NOT EXISTS maquette_phone TEXT;\n');
}

migrate();
