# Product CRUD API Guide

## 📋 Overview

Product CRUD operations kaise use ho rahe hain - complete guide with examples.

## 🔐 Authentication & Roles

### Roles:
- **`seller_products`** - Can create, update, delete their own products
- **`company_products`** (buyer) - Can only view products
- **`superadmin`** - Can edit/delete any product

### Authentication:
- All routes (except GET) require `verifyUser` middleware
- Token must be in header: `Authorization: Bearer <token>`

---

## 📍 API Endpoints

### 1. **GET /api/products** (Public - No Auth)
**Description:** Get all approved products with filters

**Query Parameters:**
- `category` (optional) - Filter by category ID or name
- `search` (optional) - Search in title/description
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20)

**Example:**
```bash
# Get all products
GET /api/products

# Filter by category
GET /api/products?category=Electronics

# Search products
GET /api/products?search=laptop

# Pagination
GET /api/products?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Product Name",
      "description": "Product description",
      "image_url": "https://cloudinary.com/...",
      "starting_price": 100,
      "current_bid": 150,
      "status": "approved",
      "category_name": "Electronics",
      "seller_name": "Seller Name",
      "total_bids": 5,
      "hours_left": 48.5
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

---

### 2. **GET /api/products/:id** (Public - No Auth)
**Description:** Get single product by ID

**Example:**
```bash
GET /api/products/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Product Name",
    "description": "Full description",
    "image_url": "https://cloudinary.com/...",
    "starting_price": 100,
    "current_bid": 150,
    "status": "approved",
    "seller_name": "Seller Name",
    "category_name": "Electronics",
    "auction_status": "live",
    "hours_left": 48.5
  }
}
```

---

### 3. **GET /api/products/mine** (Protected - Seller Only)
**Description:** Get seller's own products

**Headers:**
```
Authorization: Bearer <seller_token>
```

**Query Parameters:**
- `status` (optional) - Filter by status (pending, approved, rejected, ended)

**Example:**
```bash
# Get all my products
GET /api/products/mine
Authorization: Bearer <token>

# Get only pending products
GET /api/products/mine?status=pending
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "My Product",
      "status": "pending",
      "starting_price": 100,
      "category_name": "Electronics"
    }
  ]
}
```

---

### 4. **POST /api/products/create** (Protected - Seller Only)
**Description:** Create new product

**Headers:**
```
Authorization: Bearer <seller_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Product Name",
  "description": "Product description",
  "images": [
    "https://cloudinary.com/image1.jpg",
    "https://cloudinary.com/image2.jpg"
  ],
  "startingPrice": 100,
  "duration": 7,
  "category_id": 1
}
```

**Required Fields:**
- `title` - Product title
- `startingPrice` - Starting price
- `category_id` - Category ID (must exist and be active)
- `images` or `image_url` - At least 1 image (max 6 images)

**Optional Fields:**
- `description` - Product description
- `duration` - Auction duration in days (default: 7)

**Example:**
```bash
POST /api/products/create
Authorization: Bearer <seller_token>
Content-Type: application/json

{
  "title": "iPhone 15 Pro",
  "description": "Brand new iPhone",
  "images": ["https://cloudinary.com/iphone.jpg"],
  "startingPrice": 999,
  "duration": 7,
  "category_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product created successfully and pending approval",
  "data": {
    "id": 1,
    "title": "iPhone 15 Pro",
    "status": "pending",
    "starting_price": 999,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Validation Rules:**
- ✅ Must be `seller_products` role
- ✅ Category must exist and be active
- ✅ At least 1 image required
- ✅ Maximum 6 images allowed
- ✅ Title and startingPrice required

---

### 5. **PUT /api/products/:id** (Protected - Seller Only)
**Description:** Update product (seller can only update their own products)

**Headers:**
```
Authorization: Bearer <seller_token>
Content-Type: application/json
```

**Request Body (all fields optional):**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "image_url": "https://cloudinary.com/new-image.jpg",
  "startingPrice": 150,
  "category_id": 2
}
```

**Example:**
```bash
PUT /api/products/1
Authorization: Bearer <seller_token>
Content-Type: application/json

{
  "title": "Updated Product Name",
  "startingPrice": 150
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "id": 1,
    "title": "Updated Product Name",
    "startingPrice": 150,
    "updated_at": "2024-01-02T00:00:00.000Z"
  }
}
```

**Permission Rules:**
- ✅ Seller can only update their own products
- ✅ Superadmin can update any product
- ✅ Product must exist

---

### 6. **DELETE /api/products/:id** (Protected - Seller Only)
**Description:** Delete product (seller can only delete their own products)

**Headers:**
```
Authorization: Bearer <seller_token>
```

**Example:**
```bash
DELETE /api/products/1
Authorization: Bearer <seller_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Product deleted successfully",
  "data": {
    "id": 1,
    "title": "Product Name"
  }
}
```

**Permission Rules:**
- ✅ Seller can only delete their own products
- ✅ Superadmin can delete any product
- ✅ Product must exist

---

## 🔄 Complete CRUD Flow

### Create Product Flow:
```
1. Seller logs in → Gets token
2. POST /api/products/create
   - Headers: Authorization: Bearer <token>
   - Body: { title, images, startingPrice, category_id }
3. Product created with status: "pending"
4. Admin approves → Status changes to "approved"
5. Product appears in GET /api/products
```

### Update Product Flow:
```
1. Seller gets their products: GET /api/products/mine
2. PUT /api/products/:id
   - Headers: Authorization: Bearer <token>
   - Body: { title, description, etc. }
3. Product updated
```

### Delete Product Flow:
```
1. Seller identifies product to delete
2. DELETE /api/products/:id
   - Headers: Authorization: Bearer <token>
3. Product deleted from database
```

---

## 🛡️ Security & Permissions

### Role-Based Access:

| Operation | Public | Buyer | Seller | Admin |
|-----------|--------|-------|--------|-------|
| GET /api/products | ✅ | ✅ | ✅ | ✅ |
| GET /api/products/:id | ✅ | ✅ | ✅ | ✅ |
| GET /api/products/mine | ❌ | ❌ | ✅ | ✅ |
| POST /api/products/create | ❌ | ❌ | ✅ | ✅ |
| PUT /api/products/:id | ❌ | ❌ | ✅ (own) | ✅ (all) |
| DELETE /api/products/:id | ❌ | ❌ | ✅ (own) | ✅ (all) |

### Permission Checks:
- ✅ Seller can only edit/delete their own products
- ✅ Superadmin can edit/delete any product
- ✅ Product ownership checked via `seller_id === user.id`

---

## 📝 Code Structure

### Routes (`src/Routes/productRoutes.js`):
```javascript
// Public routes
router.get("/", MobileProductController.getAllProducts);
router.get("/:id", MobileProductController.getProductById);

// Protected routes
router.get("/mine", verifyUser, MobileProductController.getMyProducts);
router.post("/create", verifyUser, MobileProductController.createProduct);
router.put("/:id", verifyUser, MobileProductController.updateProduct);
router.delete("/:id", verifyUser, MobileProductController.deleteProduct);
```

### Controller (`src/controllers/mobileProductController.js`):
- `getAllProducts()` - Get all approved products
- `getProductById()` - Get single product
- `getMyProducts()` - Get seller's products
- `createProduct()` - Create new product
- `updateProduct()` - Update product
- `deleteProduct()` - Delete product

---

## 🧪 Testing Examples

### Test Create Product:
```bash
curl -X POST http://localhost:5000/api/products/create \
  -H "Authorization: Bearer YOUR_SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Product",
    "description": "Test description",
    "images": ["https://images.unsplash.com/photo-123"],
    "startingPrice": 100,
    "category_id": 1,
    "duration": 7
  }'
```

### Test Get Products:
```bash
curl http://localhost:5000/api/products?page=1&limit=10
```

### Test Update Product:
```bash
curl -X PUT http://localhost:5000/api/products/1 \
  -H "Authorization: Bearer YOUR_SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title"
  }'
```

### Test Delete Product:
```bash
curl -X DELETE http://localhost:5000/api/products/1 \
  -H "Authorization: Bearer YOUR_SELLER_TOKEN"
```

---

## 🔍 Key Features

1. **Image Handling:**
   - Supports multiple images (array)
   - Cloudinary URLs automatically handled
   - Max 6 images per product

2. **Status Management:**
   - `pending` - Awaiting admin approval
   - `approved` - Live and visible
   - `rejected` - Not approved
   - `ended` - Auction ended

3. **Category Validation:**
   - Category must exist
   - Category must be active
   - Category ID required

4. **Ownership Validation:**
   - Seller can only edit/delete own products
   - Checked via `seller_id === user.id`

---

## 📊 Database Schema

```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  images JSONB,              -- Array of image URLs
  image_url VARCHAR(500),     -- First image (backward compatibility)
  starting_price DECIMAL(10,2),
  current_bid DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'pending',
  category_id INTEGER REFERENCES categories(id),
  auction_end_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## ✅ Summary

**Product CRUD kaise use ho raha hai:**
1. ✅ **Create** - Seller creates product → Status: pending → Admin approves
2. ✅ **Read** - Public can view approved products, Seller can view their own
3. ✅ **Update** - Seller can update their own products
4. ✅ **Delete** - Seller can delete their own products

**Security:**
- ✅ Role-based access control
- ✅ Ownership validation
- ✅ Token authentication
- ✅ Category validation

**Features:**
- ✅ Multiple images support
- ✅ Cloudinary integration
- ✅ Pagination
- ✅ Search & filter
- ✅ Category filtering

