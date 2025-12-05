# Banner API Documentation

## Overview
Complete CRUD API for banner management with role-based access control.

## Database Table
```sql
CREATE TABLE banners (
  id SERIAL PRIMARY KEY,
  image_url VARCHAR(500) NOT NULL,
  title VARCHAR(255),
  link VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### 1. GET /api/banners
**Description:** Get all banners (public endpoint)

**Access:** Public (anyone can view active banners)

**Query Parameters:** None

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "imageUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/banners/banner1.jpg",
      "title": "Summer Sale",
      "link": "/products?category=electronics",
      "isActive": true,
      "displayOrder": 1,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Notes:**
- Public users see only active banners (`is_active = true`)
- Admin users (with valid admin token) see all banners (including inactive)

---

### 2. GET /api/banners/:id
**Description:** Get single banner by ID

**Access:** Public

**Path Parameters:**
- `id` (integer) - Banner ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "imageUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/banners/banner1.jpg",
    "title": "Summer Sale",
    "link": "/products?category=electronics",
    "isActive": true,
    "displayOrder": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Banner not found"
}
```

---

### 3. POST /api/banners
**Description:** Create new banner

**Access:** Admin only (requires `verifyAdmin` middleware)

**Roles Allowed:**
- `admin`
- `superadmin`
- `moderator`
- `viewer`

**Request Body (Form-Data):**
- `image` (file, optional) - Image file to upload to Cloudinary
- `imageUrl` (string, optional) - Direct Cloudinary URL (if not uploading file)
- `title` (string, optional) - Banner title
- `link` (string, optional) - Navigation link
- `displayOrder` (integer, optional) - Display order (default: 0)
- `isActive` (boolean, optional) - Active status (default: true)

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
```

**Example (with file upload):**
```bash
curl -X POST http://localhost:5000/api/banners \
  -H "Authorization: Bearer <admin_token>" \
  -F "image=@banner.jpg" \
  -F "title=Summer Sale" \
  -F "link=/products?category=electronics" \
  -F "displayOrder=1"
```

**Example (with direct URL):**
```bash
curl -X POST http://localhost:5000/api/banners \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/banners/banner1.jpg",
    "title": "Summer Sale",
    "link": "/products?category=electronics",
    "displayOrder": 1,
    "isActive": true
  }'
```

**Response (201):**
```json
{
  "success": true,
  "message": "Banner created successfully",
  "data": {
    "id": 1,
    "imageUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/banners/banner1.jpg",
    "title": "Summer Sale",
    "link": "/products?category=electronics",
    "isActive": true,
    "displayOrder": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Missing image URL or file
- `401` - Unauthorized (no token or invalid token)
- `403` - Forbidden (not admin role)
- `500` - Server error

---

### 4. PUT /api/banners/:id
**Description:** Update banner

**Access:** Admin only

**Path Parameters:**
- `id` (integer) - Banner ID

**Request Body (Form-Data or JSON):**
- `image` (file, optional) - New image file to upload
- `imageUrl` (string, optional) - New Cloudinary URL
- `title` (string, optional) - Update title
- `link` (string, optional) - Update link
- `isActive` (boolean, optional) - Update active status
- `displayOrder` (integer, optional) - Update display order

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data (if uploading file) or application/json
```

**Example:**
```bash
curl -X PUT http://localhost:5000/api/banners/1 \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Winter Sale",
    "isActive": false,
    "displayOrder": 2
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Banner updated successfully",
  "data": {
    "id": 1,
    "imageUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/banners/banner1.jpg",
    "title": "Winter Sale",
    "link": "/products?category=electronics",
    "isActive": false,
    "displayOrder": 2,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-02T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - No fields to update
- `404` - Banner not found
- `401` - Unauthorized
- `403` - Forbidden (not admin)
- `500` - Server error

---

### 5. DELETE /api/banners/:id
**Description:** Delete banner

**Access:** Admin only

**Path Parameters:**
- `id` (integer) - Banner ID

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Example:**
```bash
curl -X DELETE http://localhost:5000/api/banners/1 \
  -H "Authorization: Bearer <admin_token>"
```

**Response:**
```json
{
  "success": true,
  "message": "Banner deleted successfully"
}
```

**Error Responses:**
- `404` - Banner not found
- `401` - Unauthorized
- `403` - Forbidden (not admin)
- `500` - Server error

---

## Role-Based Access Control

### Admin Roles (All CRUD operations):
- `admin` / `superadmin` - Full access
- `moderator` - Full access
- `viewer` - Full access (read-only in other modules, but full access here)

### Public Access:
- `GET /api/banners` - Anyone can view active banners
- `GET /api/banners/:id` - Anyone can view single banner

### Authentication:
- Admin routes require `Authorization: Bearer <token>` header
- Token must have `scope: 'admin'` or role must be admin/superadmin/moderator/viewer
- Token is verified using `verifyAdmin` middleware

---

## Cloudinary Integration

### Image Upload:
1. If `image` file is provided, it's uploaded to Cloudinary
2. Cloudinary URL is stored in `image_url` field
3. Images are stored in `banners/` folder in Cloudinary

### Image URL Format:
```
https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/banners/{public_id}.{format}
```

### Fallback:
- If Cloudinary is not configured, API returns error
- Admin must configure Cloudinary for image uploads

---

## Flutter Integration

Flutter app automatically:
- ✅ Fetches banners from `/api/banners`
- ✅ Handles Cloudinary URLs (via `ImageUrlHelper`)
- ✅ Caches images (via `cached_network_image`)
- ✅ Shows fallback banners if API fails

No additional Flutter code needed!

---

## Example Usage

### Create Banner (Admin Panel):
```javascript
// Using fetch API
const formData = new FormData();
formData.append('image', fileInput.files[0]);
formData.append('title', 'Summer Sale');
formData.append('link', '/products?category=electronics');
formData.append('displayOrder', '1');

const response = await fetch('http://localhost:5000/api/banners', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`
  },
  body: formData
});

const result = await response.json();
console.log(result);
```

### Get All Banners (Public):
```javascript
const response = await fetch('http://localhost:5000/api/banners');
const result = await response.json();
console.log(result.data); // Array of active banners
```

---

## Database Migration

Run the SQL script to create the table:
```bash
psql -d your_database -f src/scripts/create_banners_table.sql
```

Or manually:
```sql
CREATE TABLE IF NOT EXISTS banners (
  id SERIAL PRIMARY KEY,
  image_url VARCHAR(500) NOT NULL,
  title VARCHAR(255),
  link VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Notes

1. **Image Upload**: Always use Cloudinary for production
2. **Display Order**: Lower numbers appear first
3. **Active Status**: Only active banners are shown to public users
4. **Admin Access**: All admin roles have full CRUD access
5. **Error Handling**: All endpoints have proper error handling
6. **Validation**: Image file size limit: 5MB
7. **Supported Formats**: JPEG, JPG, PNG, GIF, WEBP

