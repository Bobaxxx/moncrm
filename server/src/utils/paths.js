import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Sur Vercel, seul /tmp est accessible en écriture (et il est éphémère).
export const UPLOAD_DIR = process.env.VERCEL
  ? '/tmp/uploads'
  : join(__dirname, '..', '..', 'uploads');
