import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { verifyUser, verifyAdmin } from "../middleware/authMiddleware.js";
import fs from "fs";
import { uploadToCloudinary, isConfigured as isCloudinaryConfigured } from "../config/cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Use memory storage for Cloudinary uploads (we'll upload buffer directly)
// Fallback to disk storage if Cloudinary is not configured
const useCloudinary = isCloudinaryConfigured();

let storage;
if (useCloudinary) {
  // Memory storage for Cloudinary
  storage = multer.memoryStorage();
  console.log('☁️  Using Cloudinary for image uploads');
} else {
  // Disk storage as fallback
  const uploadsDir = path.join(__dirname, '../../uploads/products');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename: timestamp-random-originalname
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      const basename = path.basename(file.originalname, ext);
      cb(null, `${basename}-${uniqueSuffix}${ext}`);
    }
  });
  console.log('📁 Using local disk storage (Cloudinary not configured)');
}

// File filter - only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// POST /api/uploads/image - Upload single image (mobile users)
router.post('/image', verifyUser, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    let imageUrl;
    let filename = req.file.originalname;
    let size = req.file.size;
    let mimetype = req.file.mimetype;

    if (useCloudinary) {
      // Upload to Cloudinary
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, {
          public_id: `product-${Date.now()}-${Math.round(Math.random() * 1E9)}`,
        });

        imageUrl = uploadResult.secure_url;
        filename = uploadResult.public_id;
        size = uploadResult.bytes;
        mimetype = `image/${uploadResult.format}`;

        console.log('✅ [UploadImage] Image uploaded to Cloudinary:', {
          public_id: uploadResult.public_id,
          size: uploadResult.bytes,
          format: uploadResult.format,
          url: imageUrl
        });
      } catch (cloudinaryError) {
        console.error('❌ [UploadImage] Cloudinary upload failed:', cloudinaryError);
        throw new Error(`Cloudinary upload failed: ${cloudinaryError.message}`);
      }
    } else {
      // Fallback to local storage
      // Use production URL if BASE_URL is set, otherwise use localhost
      const baseUrl = process.env.BASE_URL || 
                      (process.env.NODE_ENV === 'production' 
                        ? 'https://api.mazaadati.com' 
                        : `http://localhost:${process.env.PORT || 5000}`);
      imageUrl = `${baseUrl}/uploads/products/${req.file.filename}`;

      console.log('✅ [UploadImage] Image saved locally:', {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: imageUrl
      });
    }

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        filename: filename,
        originalName: req.file.originalname,
        size: size,
        mimetype: mimetype,
        url: imageUrl
      }
    });
  } catch (error) {
    console.error('❌ [UploadImage] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image'
    });
  }
});

// POST /api/uploads/images - Upload multiple images (mobile users)
router.post('/images', verifyUser, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    const uploadedImages = [];

    if (useCloudinary) {
      // Upload all images to Cloudinary in parallel (much faster!)
      const uploadPromises = req.files.map(file => 
        uploadToCloudinary(file.buffer, {
          public_id: `product-${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`,
        }).then(uploadResult => ({
          filename: uploadResult.public_id,
          originalName: file.originalname,
          size: uploadResult.bytes,
          mimetype: `image/${uploadResult.format}`,
          url: uploadResult.secure_url
        })).catch(cloudinaryError => {
          console.error(`❌ [UploadImages] Failed to upload ${file.originalname}:`, cloudinaryError);
          throw new Error(`Failed to upload ${file.originalname}: ${cloudinaryError.message}`);
        })
      );

      // Wait for all uploads to complete in parallel
      uploadedImages.push(...await Promise.all(uploadPromises));

      console.log('✅ [UploadImages] Images uploaded to Cloudinary (parallel):', {
        count: uploadedImages.length
      });
    } else {
      // Fallback to local storage
      // Use production URL if BASE_URL is set, otherwise use localhost
      const baseUrl = process.env.BASE_URL || 
                      (process.env.NODE_ENV === 'production' 
                        ? 'https://api.mazaadati.com' 
                        : `http://localhost:${process.env.PORT || 5000}`);
      for (const file of req.files) {
        uploadedImages.push({
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          url: `${baseUrl}/uploads/products/${file.filename}`
        });
      }

      console.log('✅ [UploadImages] Images saved locally:', {
        count: uploadedImages.length
      });
    }

    res.json({
      success: true,
      message: `${uploadedImages.length} image(s) uploaded successfully`,
      data: uploadedImages
    });
  } catch (error) {
    console.error('❌ [UploadImages] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload images'
    });
  }
});

// Admin upload routes (for admin panel)
// POST /api/uploads/admin/image - Upload single image (admin users)
router.post('/admin/image', verifyAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    let imageUrl;
    let filename = req.file.originalname;
    let size = req.file.size;
    let mimetype = req.file.mimetype;

    if (useCloudinary) {
      // Upload to Cloudinary
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, {
          public_id: `product-${Date.now()}-${Math.round(Math.random() * 1E9)}`,
        });

        imageUrl = uploadResult.secure_url;
        filename = uploadResult.public_id;
        size = uploadResult.bytes;
        mimetype = `image/${uploadResult.format}`;

        console.log('✅ [AdminUploadImage] Image uploaded to Cloudinary:', {
          public_id: uploadResult.public_id,
          size: uploadResult.bytes,
          format: uploadResult.format,
          url: imageUrl
        });
      } catch (cloudinaryError) {
        console.error('❌ [AdminUploadImage] Cloudinary upload failed:', cloudinaryError);
        throw new Error(`Cloudinary upload failed: ${cloudinaryError.message}`);
      }
    } else {
      // Fallback to local storage
      const baseUrl = process.env.BASE_URL || 
                      (process.env.NODE_ENV === 'production' 
                        ? 'https://api.mazaadati.com' 
                        : `http://localhost:${process.env.PORT || 5000}`);
      imageUrl = `${baseUrl}/uploads/products/${req.file.filename}`;

      console.log('✅ [AdminUploadImage] Image saved locally:', {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: imageUrl
      });
    }

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        filename: filename,
        originalName: req.file.originalname,
        size: size,
        mimetype: mimetype,
        url: imageUrl
      }
    });
  } catch (error) {
    console.error('❌ [AdminUploadImage] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image'
    });
  }
});

// POST /api/uploads/admin/images - Upload multiple images (admin users)
router.post('/admin/images', verifyAdmin, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    const uploadedImages = [];

    if (useCloudinary) {
      // Upload all images to Cloudinary in parallel (much faster!)
      const uploadPromises = req.files.map(file => 
        uploadToCloudinary(file.buffer, {
          public_id: `product-${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`,
        }).then(uploadResult => ({
          filename: uploadResult.public_id,
          originalName: file.originalname,
          size: uploadResult.bytes,
          mimetype: `image/${uploadResult.format}`,
          url: uploadResult.secure_url
        })).catch(cloudinaryError => {
          console.error(`❌ [AdminUploadImages] Failed to upload ${file.originalname}:`, cloudinaryError);
          throw new Error(`Failed to upload ${file.originalname}: ${cloudinaryError.message}`);
        })
      );

      // Wait for all uploads to complete in parallel
      uploadedImages.push(...await Promise.all(uploadPromises));

      console.log('✅ [AdminUploadImages] Images uploaded to Cloudinary (parallel):', {
        count: uploadedImages.length
      });
    } else {
      // Fallback to local storage
      const baseUrl = process.env.BASE_URL || 
                      (process.env.NODE_ENV === 'production' 
                        ? 'https://api.mazaadati.com' 
                        : `http://localhost:${process.env.PORT || 5000}`);
      for (const file of req.files) {
        uploadedImages.push({
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          url: `${baseUrl}/uploads/products/${file.filename}`
        });
      }

      console.log('✅ [AdminUploadImages] Images saved locally:', {
        count: uploadedImages.length
      });
    }

    res.json({
      success: true,
      message: `${uploadedImages.length} image(s) uploaded successfully`,
      data: uploadedImages
    });
  } catch (error) {
    console.error('❌ [AdminUploadImages] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload images'
    });
  }
});

export default router;













