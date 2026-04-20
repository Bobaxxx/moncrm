import { supabase } from '../db/database.js';
import { createInvoice } from './billingService.js';

export const checkRecurrentBilling = async () => {
  console.log('--- Vérification de la facturation récurrente ---');
  
  const today = new Date().toISOString().split('T')[0];
  
  // 1. Trouver les clients en abonnement dont la date de facturation est échue
  const { data: clients, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('contrat_type', 'abonnement')
    .lte('date_prochaine_facture', today);

  if (error) {
    console.error('Erreur lors de la récupération des abonnements:', error);
    return;
  }

  console.log(`${clients.length} facture(s) récurrente(s) à générer.`);

  for (const client of clients) {
    try {
      console.log(`Génération facture pour : ${client.nom_entreprise}`);
      
      // 2. Préparer les items (Abonnement mensuel + Maintenance if any)
      const items = [
        {
          description: `Abonnement mensuel - ${client.nom_entreprise}`,
          quantity: 1,
          unit_price: parseFloat(client.montant_mensuel) || 89
        }
      ];

      if (client.has_maintenance) {
        items.push({
          description: "Maintenance et support technique",
          quantity: 1,
          unit_price: 0 // Inclus dans l'abonnement ou prix à définir ? 
                        // L'utilisateur a dit "abonnement à 89E avec maintenance facultative", 
                        // si maintenance est à 0 dans le prix facturé ou inclus, on laisse.
        });
      }

      // 3. Créer la facture via le service
      const invoiceData = {
        type: 'invoice',
        prospect_id: client.id,
        client_name: client.nom_entreprise,
        client_address: client.adresse,
        client_siren: '', // À remplir si dispo
        date_emission: today,
        date_echeance: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
        date_prestation: today,
        items
      };

      await createInvoice(invoiceData);

      // 4. Mettre à jour la date de prochaine facture (+1 mois)
      const nextDate = new Date(client.date_prochaine_facture);
      nextDate.setMonth(nextDate.getMonth() + 1);
      const nextDateStr = nextDate.toISOString().split('T')[0];

      await supabase
        .from('prospects')
        .update({ date_prochaine_facture: nextDateStr })
        .eq('id', client.id);

      console.log(`✅ Facture générée et prochaine date fixée au ${nextDateStr}`);

    } catch (err) {
      console.error(`❌ Erreur pour ${client.nom_entreprise}:`, err);
    }
  }
};
