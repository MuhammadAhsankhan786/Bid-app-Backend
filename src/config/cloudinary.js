import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Cloudinary Configuration
 * 
 * Required environment variables:
 * - CLOUDINARY_CLOUD_NAME
 * - CLOUDINARY_API_KEY
 * - CLOUDINARY_API_SECRET
 */

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // Use HTTPS
});

// Verify configuration
const isConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

// Log configuration status
if (isConfigured()) {
  console.log('☁️  Cloudinary configured successfully');
  console.log(`   Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  console.log(`   API Key: ${process.env.CLOUDINARY_API_KEY ? 'Set' : 'Missing'}`);
  console.log(`   API Secret: ${process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Missing'}`);
} else {
  console.warn('⚠️  Cloudinary not fully configured');
  console.warn('   Missing environment variables:');
  if (!process.env.CLOUDINARY_CLOUD_NAME) console.warn('     - CLOUDINARY_CLOUD_NAME');
  if (!process.env.CLOUDINARY_API_KEY) console.warn('     - CLOUDINARY_API_KEY');
  if (!process.env.CLOUDINARY_API_SECRET) console.warn('     - CLOUDINARY_API_SECRET');
  console.warn('   Image uploads will fail until these are set.');
}

/**
 * Upload image to Cloudinary
 * @param {Buffer|string} file - File buffer or file path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result with secure_url
 */
const uploadToCloudinary = async (file, options = {}) => {
  if (!isConfigured()) {
    throw new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env');
  }

  const uploadOptions = {
    folder: 'bidmaster/products', // Organize images in folder
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      {
        quality: 'auto:good', // Auto quality optimization
        fetch_format: 'auto', // Auto format (webp when supported)
      }
    ],
    ...options
  };

  try {
    let uploadResult;
    
    if (Buffer.isBuffer(file)) {
      // Upload from buffer (from multer memory storage)
      // Use upload_stream for better performance with buffers
      uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
        
        // Write buffer to stream
        uploadStream.end(file);
      });
    } else {
      // Upload from file path
      uploadResult = await cloudinary.uploader.upload(file, uploadOptions);
    }

    return {
      public_id: uploadResult.public_id,
      secure_url: uploadResult.secure_url,
      url: uploadResult.url,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
      created_at: uploadResult.created_at
    };
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    throw new Error(`Failed to upload image to Cloudinary: ${error.message}`);
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public_id
 * @returns {Promise<Object>} Deletion result
 */
const deleteFromCloudinary = async (publicId) => {
  if (!isConfigured()) {
    throw new Error('Cloudinary is not configured');
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error);
    throw new Error(`Failed to delete image from Cloudinary: ${error.message}`);
  }
};

/**
 * Extract public_id from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string|null} Public ID or null
 */
const extractPublicId = (url) => {
  if (!url || typeof url !== 'string') return null;
  
  // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
  return match ? match[1] : null;
};

export {
  cloudinary,
  isConfigured,
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicId
};

export default cloudinary;

