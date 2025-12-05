# Cloudinary Setup Guide

## Overview
The application now supports Cloudinary for image storage. When Cloudinary credentials are configured, images will be uploaded to Cloudinary instead of local disk storage.

## Environment Variables

Add these to your `.env` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## How to Get Cloudinary Credentials

1. Sign up at [https://cloudinary.com](https://cloudinary.com) (free tier available)
2. Go to Dashboard
3. Copy your:
   - **Cloud Name** → `CLOUDINARY_CLOUD_NAME`
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET`

## How It Works

### With Cloudinary Configured:
- Images are uploaded directly to Cloudinary
- Images are stored in folder: `bidmaster/products/`
- Automatic image optimization (quality, format)
- Returns secure HTTPS URLs
- No local disk storage needed

### Without Cloudinary (Fallback):
- Images are saved to local `uploads/products/` directory
- Returns localhost URLs (for development)
- Works without any external service

## API Response Format

The API response format remains the same regardless of storage method:

```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "filename": "product-1234567890-123456789",
    "originalName": "my-image.jpg",
    "size": 123456,
    "mimetype": "image/jpeg",
    "url": "https://res.cloudinary.com/..."
  }
}
```

## Testing

1. Start the backend server
2. Check console logs:
   - `☁️  Using Cloudinary for image uploads` - Cloudinary is active
   - `📁 Using local disk storage (Cloudinary not configured)` - Using fallback

3. Upload an image via API:
   ```bash
   POST /api/uploads/image
   Authorization: Bearer <token>
   Content-Type: multipart/form-data
   Body: image file
   ```

## Notes

- Cloudinary free tier includes:
  - 25 GB storage
  - 25 GB monthly bandwidth
  - Image transformations
  - Auto-format optimization (WebP when supported)

- Images are automatically optimized for web delivery
- All images use HTTPS URLs
- Old localhost URLs in database will still work (they're just stored as strings)

