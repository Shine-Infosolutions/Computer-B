# Product Search API Documentation

## 1. Advanced Product Search
**Endpoint:** `GET /api/products/search`

### Query Parameters:
- `search` - Text search in name, brand, model number
- `category` - Filter by category ID
- `brand` - Filter by brand name
- `minPrice` - Minimum price filter
- `maxPrice` - Maximum price filter
- `status` - Filter by status (Active, Inactive, Out of Stock)
- `sortBy` - Sort field (name, sellingRate, createdAt) [default: name]
- `sortOrder` - Sort direction (asc, desc) [default: asc]
- `page` - Page number [default: 1]
- `limit` - Items per page [default: 10]
- `attributes` - JSON string of attribute filters

### Example Requests:
```
GET /api/products/search?search=intel&page=1&limit=5
GET /api/products/search?category=64f1234567890&minPrice=1000&maxPrice=5000
GET /api/products/search?brand=MSI&sortBy=sellingRate&sortOrder=desc
GET /api/products/search?attributes={"socketType":"AM4","ramType":"DDR4"}
```

### Response:
```json
{
  "success": true,
  "data": [...products],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalProducts": 50,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {...applied filters},
  "sort": {"sortBy": "name", "sortOrder": "asc"}
}
```

## 2. Get Search Filters
**Endpoint:** `GET /api/products/search/filters`

Returns available filter options for the frontend.

### Response:
```json
{
  "success": true,
  "filters": {
    "categories": [...category objects],
    "brands": ["MSI", "ASUS", "Intel"],
    "statuses": ["Active", "Inactive"],
    "priceRange": {"minPrice": 100, "maxPrice": 50000},
    "commonAttributes": ["socketType", "ramType", "pcieVersion"]
  }
}
```

## 3. Search Suggestions (Autocomplete)
**Endpoint:** `GET /api/products/search/suggestions`

### Query Parameters:
- `query` - Search term (minimum 2 characters)
- `limit` - Number of suggestions [default: 5]

### Example:
```
GET /api/products/search/suggestions?query=intel&limit=5
```

### Response:
```json
{
  "success": true,
  "suggestions": [
    {
      "suggestion": "Intel Core i7-12700K",
      "type": "product",
      "category": "64f1234567890",
      "brand": "Intel"
    },
    {
      "suggestion": "Intel",
      "type": "brand"
    }
  ]
}
```