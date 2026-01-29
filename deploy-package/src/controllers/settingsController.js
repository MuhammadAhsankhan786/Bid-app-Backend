import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads/logos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: logo-timestamp.extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `logo-${uniqueSuffix}${ext}`);
  }
});

// File filter for image types only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PNG, JPG, JPEG, and SVG files are allowed.'));
  }
};

// Configure multer
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: fileFilter
});

export const SettingsController = {
  /**
   * Upload platform logo
   * POST /api/admin/settings/logo
   * Only accessible by superadmin
   */
  async uploadLogo(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'No file uploaded. Please select a logo file.' 
        });
      }

      // Get the uploaded file info
      const file = req.file;
      const fileUrl = `/uploads/logos/${file.filename}`;
      
      // TODO: Optionally save logo URL to database settings table
      // For now, we'll just return the file URL
      
      res.json({
        success: true,
        message: 'Logo uploaded successfully!',
        logoUrl: fileUrl,
        filename: file.filename
      });
    } catch (error) {
      console.error('Logo upload error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload logo. Please try again.'
      });
    }
  },

  /**
   * Get current logo URL
   * GET /api/admin/settings/logo
   */
  async getLogo(req, res) {
    try {
      // TODO: Get logo URL from database settings table
      // For now, return default or latest uploaded logo
      const logoFiles = fs.readdirSync(uploadsDir)
        .filter(file => file.startsWith('logo-'))
        .sort()
        .reverse();
      
      if (logoFiles.length > 0) {
        const latestLogo = logoFiles[0];
        return res.json({
          success: true,
          logoUrl: `/uploads/logos/${latestLogo}`
        });
      }
      
      res.json({
        success: true,
        logoUrl: null
      });
    } catch (error) {
      console.error('Get logo error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get logo URL.'
      });
    }
  }
};

