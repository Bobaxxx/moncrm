import app from './app.js';
import { checkRecurrentBilling } from './services/subscriptionService.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Serveur MonCRM prêt sur le port ${PORT}`);
  
  // Lancer la vérification de la facturation récurrente toutes les 24 heures
  setInterval(() => {
    checkRecurrentBilling().catch(err => console.error('Interval billing error:', err));
  }, 24 * 60 * 60 * 1000);

  // Lancement initial après 30 secondes pour ne pas surcharger le démarrage
  setTimeout(() => {
    checkRecurrentBilling().catch(err => console.error('Initial billing check error:', err));
  }, 30000);
});
