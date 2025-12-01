/**
 * Image URL Fixer Utility
 * Replaces invalid image URLs with placeholder URLs in API responses
 */

const PLACEHOLDER_URL = 'https://placehold.co/400x300?text=No+Image';

// Get base URL from environment or use default
const getBaseUrl = () => {
  // Check for API_BASE_URL or BACKEND_URL in environment
  const apiBaseUrl = process.env.API_BASE_URL || process.env.BACKEND_URL || process.env.BASE_URL;
  
  if (apiBaseUrl) {
    // Remove trailing slash and /api if present
    const baseUrl = apiBaseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    console.log(`🔧 [ImageFix] Using base URL from env: ${baseUrl}`);
    return baseUrl;
  }
  
  // Default based on NODE_ENV
  if (process.env.NODE_ENV === 'production') {
    console.log(`🔧 [ImageFix] Production mode - using: https://api.mazaadati.com`);
    return 'https://api.mazaadati.com';
  }
  
  // Default to localhost:5000 for development
  console.log(`🔧 [ImageFix] Development mode - using: http://localhost:5000`);
  return 'http://localhost:5000';
};

/**
 * Fix localhost URLs to use proper base URL
 * @param {string} url - Image URL to fix
 * @returns {string} - Fixed image URL
 */
function fixLocalhostUrl(url) {
  if (!url || typeof url !== 'string') {
    return url;
  }
  
  // Replace localhost:5000 with proper base URL
  const baseUrl = getBaseUrl();
  
  // Replace http://localhost:5000 or https://localhost:5000
  if (url.includes('localhost:5000')) {
    const fixedUrl = url.replace(/https?:\/\/localhost:5000/, baseUrl);
    console.log(`🔧 [ImageFix] Fixed localhost URL: ${url} → ${fixedUrl}`);
    return fixedUrl;
  }
  
  // Replace relative paths starting with /uploads
  if (url.startsWith('/uploads')) {
    const fixedUrl = `${baseUrl}${url}`;
    console.log(`🔧 [ImageFix] Fixed relative path: ${url} → ${fixedUrl}`);
    return fixedUrl;
  }
  
  return url;
}

/**
 * Check if an image URL is invalid
 * @param {string|null|undefined} url - Image URL to check
 * @returns {boolean} - True if URL is invalid
 */
function isInvalidImageUrl(url) {
  if (!url || url === null || url === undefined || url === '') {
    return true;
  }
  
  if (typeof url !== 'string') {
    return true;
  }
  
  // Check for example.com placeholder URLs
  if (url.includes('example.com')) {
    return true;
  }
  
  // Check for other common placeholder patterns
  if (url.includes('placeholder') && url.includes('example')) {
    return true;
  }
  
  // Check if it's a valid URL format
  try {
    const urlObj = new URL(url);
    // If it's a valid URL format, it's potentially valid
    return false;
  } catch (e) {
    // Not a valid URL format
    return true;
  }
}

/**
 * Fix invalid image URL by replacing with placeholder
 * @param {string|null|undefined} url - Image URL to fix
 * @param {string} context - Context for logging (e.g., "Product ID: 123")
 * @returns {string} - Fixed image URL
 */
function fixImageUrl(url, context = '') {
  if (isInvalidImageUrl(url)) {
    const originalUrl = url || 'null/empty';
    console.log(`🧩 [ImageFix] Replaced invalid image URL → ${originalUrl}${context ? ` (${context})` : ''}`);
    return PLACEHOLDER_URL;
  }
  
  // Fix localhost URLs before returning
  return fixLocalhostUrl(url);
}

/**
 * Fix image URLs in a single product/auction object
 * @param {object} item - Product or auction object
 * @returns {object} - Object with fixed image_url
 */
function fixImageUrlInItem(item) {
  if (!item || typeof item !== 'object') {
    return item;
  }
  
  const context = item.id ? `ID: ${item.id}` : '';
  
  // Fix image_url field
  if ('image_url' in item) {
    item.image_url = fixImageUrl(item.image_url, context);
  }
  
  // Fix imageUrl field (camelCase variant)
  if ('imageUrl' in item) {
    item.imageUrl = fixImageUrl(item.imageUrl, context);
  }
  
  // Fix product_image field (used in some responses)
  if ('product_image' in item) {
    item.product_image = fixImageUrl(item.product_image, context);
  }
  
  return item;
}

/**
 * Fix image URLs in an array of items
 * @param {Array} items - Array of product/auction objects
 * @returns {Array} - Array with fixed image URLs
 */
function fixImageUrlsInArray(items) {
  if (!Array.isArray(items)) {
    return items;
  }
  
  return items.map(item => fixImageUrlInItem(item));
}

/**
 * Fix image URLs in API response data
 * Handles both single objects and arrays
 * @param {object|Array} data - Response data
 * @returns {object|Array} - Data with fixed image URLs
 */
function fixImageUrlsInResponse(data) {
  if (Array.isArray(data)) {
    return fixImageUrlsInArray(data);
  }
  
  if (data && typeof data === 'object') {
    return fixImageUrlInItem(data);
  }
  
  return data;
}

export {
  isInvalidImageUrl,
  fixImageUrl,
  fixLocalhostUrl,
  fixImageUrlInItem,
  fixImageUrlsInArray,
  fixImageUrlsInResponse,
  PLACEHOLDER_URL
};

