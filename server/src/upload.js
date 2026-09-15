import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

const dir = path.resolve('../uploads');
fs.mkdirSync(dir, { recursive: true });
const allowed = new Set(['.pdf','.doc','.docx','.ppt','.pptx','.jpg','.jpeg','.jfif','.png','.webp']);
const allowedImages = new Set(['image/jpeg','image/png','image/webp']);
export const upload = multer({
  storage: multer.diskStorage({ destination: dir, filename: (_r, f, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(f.originalname).toLowerCase()}`) }),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 20) * 1024 * 1024 },
  fileFilter: (_r, f, cb) => allowed.has(path.extname(f.originalname).toLowerCase()) ? cb(null, true) : cb(new Error('Unsupported file type.'))
});

// Profile pictures have a separate image-only validator.
export const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: dir,
    filename: (_r, f, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(f.originalname).toLowerCase() || '.jpg'}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_r, f, cb) => allowedImages.has(f.mimetype.toLowerCase())
    ? cb(null, true)
    : cb(new Error('Please select a JPG, PNG, or WebP image.'))
});
