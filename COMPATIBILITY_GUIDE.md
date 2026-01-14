# Product Compatibility Guide

## How to Use the Compatibility System

### 1. Add Compatible Products

**Endpoint:** `POST /api/compatibility/add`

**Request Body:**
```json
{
  "productId": "68fdd7f5cad6805c3b8bcba9",
  "compatibleProductIds": [
    "another_product_id_1",
    "another_product_id_2"
  ]
}
```

**Example using curl:**
```bash
curl -X POST http://localhost:5000/api/compatibility/add \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "68fdd7f5cad6805c3b8bcba9",
    "compatibleProductIds": ["product_id_2", "product_id_3"]
  }'
```

---

### 2. Get Compatible Products

**Endpoint:** `GET /api/compatibility/:productId`

**Example:**
```
GET http://localhost:5000/api/compatibility/68fdd7f5cad6805c3b8bcba9
```

**Response:**
```json
{
  "success": true,
  "product": {
    "_id": "68fdd7f5cad6805c3b8bcba9",
    "name": "Product Name",
    "category": { "name": "Category Name" }
  },
  "compatibleProducts": [
    {
      "_id": "product_id_2",
      "name": "Compatible Product 1",
      "brand": "Brand Name",
      "sellingRate": 5000
    }
  ],
  "totalCompatible": 1
}
```

---

### 3. Get All Products with Compatibility Status

**Endpoint:** `GET /api/compatibility/:productId/all`

**Example:**
```
GET http://localhost:5000/api/compatibility/68fdd7f5cad6805c3b8bcba9/all
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "product_id_2",
      "name": "Product 2",
      "brand": "Brand",
      "category": { "name": "RAM" },
      "isCompatible": true    // ✅ Show GREEN
    },
    {
      "_id": "product_id_3",
      "name": "Product 3",
      "brand": "Brand",
      "category": { "name": "GPU" },
      "isCompatible": false   // ⚪ Show WHITE
    }
  ]
}
```

---

### 4. Remove Compatibility

**Endpoint:** `POST /api/compatibility/remove`

**Request Body:**
```json
{
  "productId": "68fdd7f5cad6805c3b8bcba9",
  "compatibleProductId": "product_id_to_remove"
}
```

---

### 5. Check Compatibility Between Two Products

**Endpoint:** `GET /api/compatibility/check/:productId/:targetProductId`

**Example:**
```
GET http://localhost:5000/api/compatibility/check/68fdd7f5cad6805c3b8bcba9/another_product_id
```

**Response:**
```json
{
  "success": true,
  "isCompatible": true
}
```

---

## Frontend Display Example

### React/JavaScript Example:
```jsx
// Fetch products with compatibility status
const response = await fetch(`/api/compatibility/${selectedProductId}/all`);
const { data } = await response.json();

// Display with color indicators
{data.map(product => (
  <div 
    key={product._id}
    className={product.isCompatible ? 'bg-green-100 border-green-500' : 'bg-white border-gray-300'}
  >
    <h3>{product.name}</h3>
    {product.isCompatible && <span className="text-green-600">✓ Compatible</span>}
  </div>
))}
```

### CSS Styling:
```css
.compatible {
  background-color: #d4edda;
  border: 2px solid #28a745;
}

.not-compatible {
  background-color: #ffffff;
  border: 1px solid #dee2e6;
}
```

---

## Quick Start Steps:

1. **Get all products:** `GET /api/products/all`
2. **Select a product ID** from the response
3. **Add compatibility:** Use `POST /api/compatibility/add` with product IDs
4. **View results:** Use `GET /api/compatibility/:productId/all`
5. **Display in frontend** with green/white colors based on `isCompatible` field
