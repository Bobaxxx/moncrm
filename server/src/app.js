import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Routes (Imports déplacés après dotenv pour sécurité)
import prospectsRouter from './routes/prospects.js';
import importsRouter from './routes/imports.js';
import smsRouter from './routes/sms.js';
import planningRouter from './routes/planning.js';
import analyticsRouter from './routes/analytics.js';
import billingRouter from './routes/billing.js';
import productsRouter from './routes/products.js';
import foldersRouter from './routes/folders.js';
import enrichmentRouter from './routes/enrichment.js';
import { checkRecurrentBilling } from './services/subscriptionService.js';
import { UPLOAD_DIR } from './utils/paths.js';

// Middleware Auth
import { requireAuth } from './middleware/authMiddleware.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware globaux
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

// Cron Vercel (facturation récurrente) — protégé par CRON_SECRET, hors auth Supabase
app.get('/api/cron/billing', async (req, res) => {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  try {
    await checkRecurrentBilling();
    res.json({ ok: true });
  } catch (err) {
    console.error('Cron billing error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Sécurité Globale sur l'API
app.use('/api', requireAuth);

// Routes API
app.use('/api/prospects', prospectsRouter);
app.use('/api/imports', importsRouter);
app.use('/api/sms', smsRouter);
app.use('/api/planning', planningRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/billing', billingRouter);
app.use('/api/products', productsRouter);
app.use('/api/folders', foldersRouter);
app.use('/api/enrichment', enrichmentRouter);


// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'MonCRM Node.js Server', time: new Date() });
});

// SERVIR LE FRONTEND (en production hors Vercel ; sur Vercel le front est servi en statique)
if (!process.env.VERCEL) {
const distPath = path.join(__dirname, '../../dist');
app.use(express.static(distPath));

// Fallback pour le SPA (React Router avec HashRouter ou BrowserRouter)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});
}

export default app;
