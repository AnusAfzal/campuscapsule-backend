import multer from 'multer';

/**
 * Store uploaded files in memory instead of writing them to disk.
 *
 * The image buffer will be passed directly to Cloudinary.
 */
const storage = multer.memoryStorage();

/**
 * Only allow image files.
 */
const fileFilter: multer.Options['fileFilter'] = (_req, file, callback) => {
  if (file.mimetype.startsWith('image/')) {
    callback(null, true);
    return;
  }

  callback(new Error('Only image files are allowed.'));
};

/**
 * Image upload configuration.
 *
 * Limits:
 * - Maximum file size: 10 MB
 * - Maximum number of files: 1
 */
export const uploadMemoryImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
}).single('image');

