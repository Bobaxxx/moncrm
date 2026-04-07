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

// Middleware Auth
import { requireAuth } from './middleware/authMiddleware.js';

const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware globaux
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Sécurité Globale sur l'API
app.use('/api', requireAuth);

// Routes API
app.use('/api/prospects', prospectsRouter);
app.use('/api/imports', importsRouter);
app.use('/api/sms', smsRouter);
app.use('/api/planning', planningRouter);
app.use('/api/analytics', analyticsRouter);


// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'MonCRM Node.js Server', time: new Date() });
});

// SERVIR LE FRONTEND (En production)
const distPath = path.join(__dirname, '../../dist');
app.use(express.static(distPath));

// Fallback pour le SPA (React Router avec HashRouter ou BrowserRouter)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
