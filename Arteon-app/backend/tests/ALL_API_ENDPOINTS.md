ca# API ENDPOINTS OVERVIEW
## Arteon Backend API Documentation

### Base URL: `http://localhost:3001/api`

---

## 📚 API GROUPS

| Group | Base Path | Description |
|-------|-----------|-------------|
| Users | `/users` | User management, authentication |
| Pins | `/pins` | Pin/NFT management |
| Comments | `/comments` | Comment system |
| Boards | `/boards` | Board/collection management |
| Vault | `/vault` | Solana vault & fractionalization |
| Buyout | `/buyout` | Buyout offers & marketplace |

---

## 👤 USER ENDPOINTS
**Base Path:** `/api/users`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/create` | Create new user account | ❌ |
| PATCH | `/update` | Update user information | ✅ |
| POST | `/register` | Register user | ❌ |
| POST | `/login` | User login | ❌ |
| POST | `/logout` | User logout | ✅ |
| GET | `/profile/:username` | Get user profile | ❌ |
| POST | `/follow` | Follow/unfollow user | ✅ |

### Sample Requests:

**Register User:**
```json
POST /api/users/register
{
  "displayName": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Login:**
```json
POST /api/users/login
{
  "email": "john@example.com",
  "password": "password123"
}
```

---

## 📌 PIN ENDPOINTS
**Base Path:** `/api/pins`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get all pins with pagination | ❌ |
| POST | `/create` | Create new pin/NFT | ✅ |
| GET | `/:id` | Get pin by ID | ❌ |
| PATCH | `/:id` | Update pin | ✅ |
| DELETE | `/:id` | Delete pin | ✅ |
| POST | `/:id/like` | Like/unlike pin | ✅ |
| POST | `/:id/save` | Save/unsave pin | ✅ |
| POST | `/:id/fractionalize` | Fractionalize pin vault | ✅ |
| GET | `/:id/fractionalization` | Get pin fractionalization data | ❌ |
| GET | `/user/:userId` | Get pins by user | ❌ |
| GET | `/board/:boardId` | Get pins in board | ❌ |

### Sample Requests:

**Get All Pins:**
```
GET /api/pins?cursor=0&search=&userId=&boardId=&limit=20
```

**Create Pin:**
```json
POST /api/pins/create
{
  "title": "Beautiful Artwork",
  "description": "Digital art piece",
  "media": "https://example.com/image.jpg",
  "tags": ["art", "digital"],
  "boardId": "64f8b2a3c1d4e5f6789abc12"
}
```

---

## 💬 COMMENT ENDPOINTS
**Base Path:** `/api/comments`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/pin/:pinId` | Get comments for pin | ❌ |
| POST | `/create` | Create new comment | ✅ |
| PATCH | `/:id` | Update comment | ✅ |
| DELETE | `/:id` | Delete comment | ✅ |
| POST | `/:id/like` | Like/unlike comment | ✅ |

### Sample Requests:

**Create Comment:**
```json
POST /api/comments/create
{
  "content": "Great artwork!",
  "pinId": "64f8b2a3c1d4e5f6789abc12"
}
```

---

## 📋 BOARD ENDPOINTS
**Base Path:** `/api/boards`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get all boards | ❌ |
| POST | `/create` | Create new board | ✅ |
| GET | `/:id` | Get board by ID | ❌ |
| PATCH | `/:id` | Update board | ✅ |
| DELETE | `/:id` | Delete board | ✅ |
| POST | `/:id/pins` | Add pin to board | ✅ |
| DELETE | `/:id/pins/:pinId` | Remove pin from board | ✅ |
| GET | `/user/:userId` | Get boards by user | ❌ |

### Sample Requests:

**Create Board:**
```json
POST /api/boards/create
{
  "name": "My Art Collection",
  "description": "Collection of digital artworks",
  "isPrivate": false
}
```

---

## 🏛️ VAULT ENDPOINTS
**Base Path:** `/api/vault`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/initialize` | Create new vault (server authority) | ❌ |
| POST | `/initialize-with-specific-wallet` | Create vault (legacy) | ❌ |
| GET | `/generate-keypair` | Generate test keypair | ❌ |
| GET | `/:vaultAddress` | Get vault information | ❌ |
| GET | `/app-wallet` | Get application wallet info | ❌ |
| POST | `/app-wallet/create` | Create new app wallet | ❌ |
| POST | `/fractionalize` | Fractionalize vault | ❌ |
| GET | `/:vaultAddress/fractionalization` | Get fractionalization status | ❌ |
| POST | `/authority-wallet/ensure-balance` | Ensure authority balance | ❌ |
| GET | `/authority-wallet` | Get authority wallet info | ❌ |
| GET | `/fractionalizations` | Get all fractionalizations | ❌ |
| GET | `/:vaultAddress/fractionalization-info` | Get fractionalization by vault | ❌ |
| GET | `/pins-with-fractionalization` | Get pins with fractionalization | ❌ |

### Sample Requests:

**Create Vault:**
```json
POST /api/vault/initialize
{
  "metadataUri": "arteon-nft-1754073818582",
  "totalSupply": 1000000
}
```

**Fractionalize Vault:**
```json
POST /api/vault/fractionalize
{
  "vaultPubkey": "GiRq1nBFmPP5JxUVNAskkya36vtmVv5XDX5ENhqb6BvW",
  "useServerAuthority": true
}
```

---

## 💰 BUYOUT ENDPOINTS
**Base Path:** `/api/buyout`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/initiate` | Create buyout offer | ❌ |
| POST | `/accept` | Accept buyout offer (mock) | ❌ |
| POST | `/reject` | Reject buyout offer (mock) | ❌ |
| GET | `/all-offers` | Get all buyout offers | ❌ |
| GET | `/vault/:vaultAddress/offers` | Get offers for vault | ❌ |
| GET | `/buyer/:buyerPublicKey/offers` | Get offers by buyer | ❌ |
| GET | `/top-offers` | Get top offers by amount | ❌ |
| GET | `/statistics` | Get buyout statistics | ❌ |
| GET | `/generate-buyer-keypair` | Generate buyer keypair | ❌ |
| POST | `/airdrop-buyer` | Airdrop SOL to buyer | ❌ |

### Sample Requests:

**Create Buyout Offer:**
```json
POST /api/buyout/initiate
{
  "vaultAddress": "GiRq1nBFmPP5JxUVNAskkya36vtmVv5XDX5ENhqb6BvW",
  "offerLamports": 1000000000,
  "buyerKeypair": [174, 47, 154, ...],
  "buyerNote": "Serious buyer"
}
```

**Get All Offers:**
```
GET /api/buyout/all-offers?page=1&limit=20&status=pending&sortBy=offerAmountSOL&sortOrder=desc
```

---

## 🔐 AUTHENTICATION

### Headers Required:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Get Token from Login Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f8b2a3c1d4e5f6789abc12",
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

---

## 📊 COMMON QUERY PARAMETERS

### Pagination:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10-20)
- `cursor` (number): Cursor for infinite scroll

### Filtering:
- `search` (string): Search term
- `userId` (string): Filter by user
- `status` (string): Filter by status
- `sortBy` (string): Sort field
- `sortOrder` (string): asc|desc

### Examples:
```
GET /api/pins?page=1&limit=20&search=art&userId=64f8b2a3c1d4e5f6789abc12
GET /api/buyout/all-offers?status=pending&minAmount=1&maxAmount=10
GET /api/vault/fractionalizations?page=1&limit=10&status=active
```

---

## 🔄 COMMON RESPONSE FORMAT

### Success Response:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

### Error Response:
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

### Paginated Response:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## 🚀 SOLANA INTEGRATION

### Server Authority:
- **Fixed Authority**: `22PRfLKmHWH25tzPKPrE1unvjsGUmcfWVqjttrX24UWG`
- **Network**: Localhost (http://localhost:8899)
- **Program ID**: `CRaskU2g9Wzenfm1s89z5LdDkgCoaMqo9dbHn7YXvTAY`

### Key Features:
- ✅ **Vault Creation** with fixed server authority
- ✅ **Vault Fractionalization** into SPL tokens
- ✅ **Buyout Marketplace** for fractionalized vaults
- ✅ **MongoDB Integration** for offer tracking
- ✅ **Automatic SOL Airdrop** for testing

---

## 📝 TESTING

### Postman/Insomnia Collections:
- Import file: `backend/tests/insomnia-pin-api-tests.json`
- Use test data from documentation
- Set base URL to `http://localhost:3001/api`

### Test Flow:
1. **User**: Register → Login → Get Token
2. **Pin**: Create Pin → Get Pins → Like/Save
3. **Vault**: Create Vault → Fractionalize → Create Buyout Offer
4. **Board**: Create Board → Add Pins → Get Board Pins

---

## 📋 STATUS CODES

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## 🔗 RELATED DOCUMENTATION

- [Buyout API Detailed Documentation](./BUYOUT_API_DOCUMENTATION.md)
- [API Test Guide](./API_TEST_GUIDE.md)
- [Postman Collection](./insomnia-pin-api-tests.json)

---

**Last Updated:** January 2, 2025
**Total Endpoints:** 50+
**Base URL:** http://localhost:3001/api
