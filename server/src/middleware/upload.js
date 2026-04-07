import multer from 'multer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadDir = join(__dirname, '..', '..', 'uploads');

mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['text/csv', 'application/json', 'text/plain', 'application/vnd.ms-excel'];
  if (allowed.includes(file.mimetype) || file.originalname.match(/\.(csv|json)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers CSV et JSON sont acceptés'), false);
  }
};

export const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });
