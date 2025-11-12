/**
 * Image URL Fixer Utility
 * Replaces invalid image URLs with placeholder URLs in API responses
 */

const PLACEHOLDER_URL = 'https://placehold.co/400x300?text=No+Image';

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
  return url;
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
  fixImageUrlInItem,
  fixImageUrlsInArray,
  fixImageUrlsInResponse,
  PLACEHOLDER_URL
};

