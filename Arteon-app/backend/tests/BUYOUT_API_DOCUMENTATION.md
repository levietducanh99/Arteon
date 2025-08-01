# Buyout API Documentation

## Base URL
```
http://localhost:3001/api/buyout
```

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/initiate` | Tạo buyout offer mới |
| POST | `/accept` | Chấp nhận buyout offer (mock) |
| POST | `/reject` | Từ chối buyout offer (mock) |
| GET | `/all-offers` | Lấy tất cả buyout offers với filters |
| GET | `/vault/:vaultAddress/offers` | Lấy buyout offers cho vault cụ thể |
| GET | `/buyer/:buyerPublicKey/offers` | Lấy buyout offers của buyer |
| GET | `/top-offers` | Lấy top buyout offers theo amount |
| GET | `/statistics` | Lấy thống kê buyout |
| GET | `/generate-buyer-keypair` | Tạo buyer keypair cho testing |
| POST | `/airdrop-buyer` | Request airdrop SOL cho buyer |

---

## 1. CREATE BUYOUT OFFER

### `POST /buyout/initiate`

Tạo một buyout offer mới cho vault đã được fractionalized.

#### Request Body:
```json
{
  "vaultAddress": "GiRq1nBFmPP5JxUVNAskkya36vtmVv5XDX5ENhqb6BvW",
  "offerLamports": 1000000000,
  "buyerKeypair": [174, 47, 154, 16, 202, 193, 206, 113, 199, 190, 53, 133, 169, 175, 31, 56, 100, 85, 245, 248, 220, 16, 34, 20, 240, 129, 126, 102, 50, 86, 167, 139, 105, 29, 190, 167, 200, 171, 96, 216, 44, 79, 22, 109, 86, 154, 145, 26, 87, 156, 119, 223, 146, 187, 24, 184, 86, 123, 48, 160, 230, 164, 226, 238],
  "buyerNote": "Serious buyer, looking for quick transaction"
}
```

#### Response Success:
```json
{
  "success": true,
  "signature": "mock_buyout_1735776234567_abc123def",
  "data": {
    "vault": "GiRq1nBFmPP5JxUVNAskkya36vtmVv5XDX5ENhqb6BvW",
    "buyer": "22PRfLKmHWH25tzPKPrE1unvjsGUmcfWVqjttrX24UWG",
    "offerAmount": 1000000000,
    "offerAmountSOL": 1,
    "buyoutOfferPDA": "FL6s8MdqTz6ew8NjvwvPEESjvSHmomkwAzwJdgRdJQMh",
    "offerId": "64f8b2a3c1d4e5f6789abc12",
    "status": "pending",
    "createdAt": "2025-01-02T10:30:34.567Z",
    "expiresAt": "2025-01-09T10:30:34.567Z"
  }
}
```

#### Response Error:
```json
{
  "success": false,
  "message": "Vault must be fractionalized before accepting buyout offers"
}
```

---

## 2. GET ALL BUYOUT OFFERS

### `GET /buyout/all-offers`

Lấy tất cả buyout offers với filters và pagination.

#### Query Parameters:
- `page` (number, default: 1): Trang hiện tại
- `limit` (number, default: 20): Số offers per page
- `status` (string, default: 'all'): pending|accepted|rejected|expired|all
- `sortBy` (string, default: 'createdAt'): Field để sort
- `sortOrder` (string, default: 'desc'): asc|desc
- `vaultAddress` (string, optional): Filter theo vault
- `buyerPublicKey` (string, optional): Filter theo buyer
- `minAmount` (number, optional): Minimum offer amount (SOL)
- `maxAmount` (number, optional): Maximum offer amount (SOL)

#### Example Request:
```
GET /buyout/all-offers?page=1&limit=10&status=pending&sortBy=offerAmountSOL&sortOrder=desc&minAmount=0.5
```

#### Response:
```json
{
  "success": true,
  "data": {
    "offers": [
      {
        "_id": "64f8b2a3c1d4e5f6789abc12",
        "vaultAddress": "GiRq1nBFmPP5JxUVNAskkya36vtmVv5XDX5ENhqb6BvW",
        "buyerPublicKey": "22PRfLKmHWH25tzPKPrE1unvjsGUmcfWVqjttrX24UWG",
        "buyoutOfferPDA": "FL6s8MdqTz6ew8NjvwvPEESjvSHmomkwAzwJdgRdJQMh",
        "offerAmount": "2000000000",
        "offerAmountSOL": 2,
        "transactionSignature": "mock_buyout_1735776234567_abc123def",
        "network": "localhost",
        "status": "pending",
        "vaultInfo": {
          "authority": "22PRfLKmHWH25tzPKPrE1unvjsGUmcfWVqjttrX24UWG",
          "metadataUri": "arteon-nft-1754073818582",
          "totalSupply": "1000000",
          "tokenMint": "7K9jPWF8nx76MDqycBnXzwMXC8tFBxbSg2jvC9uTqAbU"
        },
        "buyerNote": "Serious buyer, looking for quick transaction",
        "offerTimestamp": "2025-01-02T10:30:34.567Z",
        "expiresAt": "2025-01-09T10:30:34.567Z",
        "createdAt": "2025-01-02T10:30:34.567Z",
        "updatedAt": "2025-01-02T10:30:34.567Z"
      },
      {
        "_id": "64f8b2a3c1d4e5f6789abc13",
        "vaultAddress": "DNYVphxrfk7yjc97uJPVLLDu2tAG3fwcdAYjRHsrh6Gd",
        "buyerPublicKey": "33QRgMNhWI26uoHx2KwJ456YgoBKK2mrY8yz8Mv6cXcZ",
        "buyoutOfferPDA": "8M7tRA5qUz7fo9MkwwPFGTnvQJImomkwBzwKegSdKRNi",
        "offerAmount": "1500000000",
        "offerAmountSOL": 1.5,
        "transactionSignature": "mock_buyout_1735776298123_def456ghi",
        "network": "localhost",
        "status": "pending",
        "vaultInfo": {
          "authority": "22PRfLKmHWH25tzPKPrE1unvjsGUmcfWVqjttrX24UWG",
          "metadataUri": "arteon-nft-1754073819876",
          "totalSupply": "500000",
          "tokenMint": "9L8kQXE7ny87MeqxdBnXzwNYD9uGDomkwCzwRegTdLPj"
        },
        "buyerNote": "Collector interested in this NFT",
        "offerTimestamp": "2025-01-02T10:31:38.123Z",
        "expiresAt": "2025-01-09T10:31:38.123Z",
        "createdAt": "2025-01-02T10:31:38.123Z",
        "updatedAt": "2025-01-02T10:31:38.123Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalOffers": 25,
      "offersPerPage": 10,
      "hasNext": true,
      "hasPrev": false
    },
    "filters": {
      "status": "pending",
      "vaultAddress": null,
      "buyerPublicKey": null,
      "minAmount": "0.5",
      "maxAmount": null,
      "sortBy": "offerAmountSOL",
      "sortOrder": "desc"
    }
  }
}
```

---

## 3. GET VAULT BUYOUT OFFERS

### `GET /buyout/vault/:vaultAddress/offers`

Lấy tất cả buyout offers cho một vault cụ thể từ database.

#### Path Parameters:
- `vaultAddress` (string): Địa chỉ vault

#### Query Parameters:
- `status` (string, default: 'pending'): pending|accepted|rejected|expired|all
- `sortBy` (string, default: 'offerAmountSOL'): Field để sort
- `sortOrder` (string, default: 'desc'): asc|desc

#### Example Request:
```
GET /buyout/vault/GiRq1nBFmPP5JxUVNAskkya36vtmVv5XDX5ENhqb6BvW/offers?status=pending&sortBy=offerAmountSOL&sortOrder=desc
```

#### Response:
```json
{
  "success": true,
  "data": {
    "vaultAddress": "GiRq1nBFmPP5JxUVNAskkya36vtmVv5XDX5ENhqb6BvW",
    "vaultInfo": {
      "authority": "22PRfLKmHWH25tzPKPrE1unvjsGUmcfWVqjttrX24UWG",
      "metadataUri": "arteon-nft-1754073818582",
      "totalSupply": "1000000",
      "isFractionalized": true,
      "tokenMint": "7K9jPWF8nx76MDqycBnXzwMXC8tFBxbSg2jvC9uTqAbU"
    },
    "totalOffers": 3,
    "offers": [
      {
        "_id": "64f8b2a3c1d4e5f6789abc12",
        "vaultAddress": "GiRq1nBFmPP5JxUVNAskkya36vtmVv5XDX5ENhqb6BvW",
        "buyerPublicKey": "22PRfLKmHWH25tzPKPrE1unvjsGUmcfWVqjttrX24UWG",
        "offerAmount": "2000000000",
        "offerAmountSOL": 2,
        "status": "pending",
        "buyerNote": "Highest offer for this vault",
        "createdAt": "2025-01-02T10:30:34.567Z",
        "expiresAt": "2025-01-09T10:30:34.567Z"
      },
      {
        "_id": "64f8b2a3c1d4e5f6789abc14",
        "vaultAddress": "GiRq1nBFmPP5JxUVNAskkya36vtmVv5XDX5ENhqb6BvW",
        "buyerPublicKey": "44SRhNOiWJ37vqIy3LxK567ZhpCLL3nsZ9ba9Nw7dYdA",
        "offerAmount": "1500000000",
        "offerAmountSOL": 1.5,
        "status": "pending",
        "buyerNote": "Fair price offer",
        "createdAt": "2025-01-02T09:15:22.123Z",
        "expiresAt": "2025-01-09T09:15:22.123Z"
      }
    ],
    "filters": {
      "status": "pending",
      "sortBy": "offerAmountSOL",
      "sortOrder": "desc"
    }
  }
}
```

---

## 4. GET BUYER OFFERS

### `GET /buyout/buyer/:buyerPublicKey/offers`

Lấy tất cả buyout offers của một buyer cụ thể.

#### Path Parameters:
- `buyerPublicKey` (string): Public key của buyer

#### Query Parameters:
- `status` (string, default: 'all'): pending|accepted|rejected|expired|all
- `page` (number, default: 1): Trang hiện tại
- `limit` (number, default: 10): Số offers per page

#### Example Request:
```
GET /buyout/buyer/22PRfLKmHWH25tzPKPrE1unvjsGUmcfWVqjttrX24UWG/offers?status=pending&page=1&limit=5
```

#### Response:
```json
{
  "success": true,
  "data": {
    "buyerPublicKey": "22PRfLKmHWH25tzPKPrE1unvjsGUmcfWVqjttrX24UWG",
    "totalOffers": 8,
    "offers": [
      {
        "_id": "64f8b2a3c1d4e5f6789abc12",
        "vaultAddress": "GiRq1nBFmPP5JxUVNAskkya36vtmVv5XDX5ENhqb6BvW",
        "offerAmount": "2000000000",
        "offerAmountSOL": 2,
        "status": "pending",
        "buyerNote": "My highest offer",
        "createdAt": "2025-01-02T10:30:34.567Z",
        "expiresAt": "2025-01-09T10:30:34.567Z"
      },
      {
        "_id": "64f8b2a3c1d4e5f6789abc15",
        "vaultAddress": "DNYVphxrfk7yjc97uJPVLLDu2tAG3fwcdAYjRHsrh6Gd",
        "offerAmount": "1000000000",
        "offerAmountSOL": 1,
        "status": "accepted",
        "buyerNote": "Quick purchase",
        "createdAt": "2025-01-01T15:20:15.890Z",
        "respondedAt": "2025-01-01T16:45:32.123Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## 5. GET TOP OFFERS

### `GET /buyout/top-offers`

Lấy top buyout offers theo amount cao nhất.

#### Query Parameters:
- `limit` (number, default: 10): Số offers để return
- `status` (string, default: 'pending'): pending|accepted|rejected|expired|all

#### Example Request:
```
GET /buyout/top-offers?limit=5&status=pending
```

#### Response:
```json
{
  "success": true,
  "data": {
    "totalOffers": 5,
    "offers": [
      {
        "_id": "64f8b2a3c1d4e5f6789abc16",
        "vaultAddress": "GiRq1nBFmPP5JxUVNAskkya36vtmVv5XDX5ENhqb6BvW",
        "buyerPublicKey": "55TSkOPjXK48wrJz4MyL678AiqDMM4otA0cb0Ox8eZeB",
        "offerAmount": "5000000000",
        "offerAmountSOL": 5,
        "status": "pending",
        "buyerNote": "Premium offer for rare NFT",
        "createdAt": "2025-01-02T11:00:00.000Z",
        "expiresAt": "2025-01-09T11:00:00.000Z"
      },
      {
        "_id": "64f8b2a3c1d4e5f6789abc17",
        "vaultAddress": "DNYVphxrfk7yjc97uJPVLLDu2tAG3fwcdAYjRHsrh6Gd",
        "buyerPublicKey": "66URlPQkYL59xsKa5NzM789BjrENO5puB1dc1Py9fAfC",
        "offerAmount": "3500000000",
        "offerAmountSOL": 3.5,
        "status": "pending",
        "buyerNote": "Collector's choice",
        "createdAt": "2025-01-02T10:45:30.456Z",
        "expiresAt": "2025-01-09T10:45:30.456Z"
      }
    ],
    "criteria": {
      "sortBy": "offerAmountSOL",
      "sortOrder": "desc",
      "limit": 5,
      "status": "pending"
    }
  }
}
```

---

## 6. GET BUYOUT STATISTICS

### `GET /buyout/statistics`

Lấy thống kê tổng quan về buyout offers.

#### Example Request:
```
GET /buyout/statistics
```

#### Response:
```json
{
  "success": true,
  "data": {
    "offers": {
      "total": 156,
      "pending": 45,
      "accepted": 89,
      "rejected": 18,
      "expired": 4
    },
    "value": {
      "totalValueSOL": 234.75,
      "averageOfferSOL": 1.505,
      "minOfferSOL": 0.1,
      "maxOfferSOL": 10.5
    },
    "topOffer": {
      "id": "64f8b2a3c1d4e5f6789abc16",
      "vaultAddress": "GiRq1nBFmPP5JxUVNAskkya36vtmVv5XDX5ENhqb6BvW",
      "buyerPublicKey": "55TSkOPjXK48wrJz4MyL678AiqDMM4otA0cb0Ox8eZeB",
      "offerAmountSOL": 10.5,
      "status": "pending",
      "createdAt": "2025-01-02T11:00:00.000Z"
    },
    "generatedAt": "2025-01-02T12:30:45.123Z"
  }
}
```

---

## 7. ACCEPT BUYOUT OFFER (Mock)

### `POST /buyout/accept`

Chấp nhận một buyout offer (hiện tại là mock response).

#### Request Body:
```json
{
  "vaultAddress": "GiRq1nBFmPP5JxUVNAskkya36vtmVv5XDX5ENhqb6BvW",
  "buyerPubkey": "22PRfLKmHWH25tzPKPrE1unvjsGUmcfWVqjttrX24UWG"
}
```

#### Response:
```json
{
  "success": true,
  "message": "Buyout offer accepted (mocked)",
  "data": {
    "vault": "GiRq1nBFmPP5JxUVNAskkya36vtmVv5XDX5ENhqb6BvW",
    "buyer": "22PRfLKmHWH25tzPKPrE1unvjsGUmcfWVqjttrX24UWG",
    "offerAmount": "2000000000",
    "status": "accepted",
    "note": "This is a mock response. The accept_buyout instruction needs to be implemented in the smart contract."
  }
}
```

---

## 8. REJECT BUYOUT OFFER (Mock)

### `POST /buyout/reject`

Từ chối một buyout offer (hiện tại là mock response).

#### Request Body:
```json
{
  "vaultAddress": "GiRq1nBFmPP5JxUVNAskkya36vtmVv5XDX5ENhqb6BvW",
  "buyerPubkey": "22PRfLKmHWH25tzPKPrE1unvjsGUmcfWVqjttrX24UWG"
}
```

#### Response:
```json
{
  "success": true,
  "message": "Buyout offer rejected (mocked)",
  "data": {
    "vault": "GiRq1nBFmPP5JxUVNAskkya36vtmVv5XDX5ENhqb6BvW",
    "buyer": "22PRfLKmHWH25tzPKPrE1unvjsGUmcfWVqjttrX24UWG",
    "offerAmount": "2000000000",
    "status": "rejected",
    "note": "This is a mock response. The reject_buyout or close_buyout_offer instruction needs to be implemented in the smart contract."
  }
}
```

---

## 9. UTILITY ENDPOINTS

### Generate Buyer Keypair

#### `GET /buyout/generate-buyer-keypair`

Tạo buyer keypair mới cho testing.

#### Query Parameters:
- `saveToFile` (boolean, default: false): Có lưu vào file không
- `filename` (string, optional): Tên file để lưu

#### Example Request:
```
GET /buyout/generate-buyer-keypair?saveToFile=true&filename=my-buyer-keypair.json
```

#### Response:
```json
{
  "success": true,
  "data": {
    "publicKey": "22PRfLKmHWH25tzPKPrE1unvjsGUmcfWVqjttrX24UWG",
    "secretKey": [174, 47, 154, 16, 202, 193, 206, 113, 199, 190, 53, 133, 169, 175, 31, 56, 100, 85, 245, 248, 220, 16, 34, 20, 240, 129, 126, 102, 50, 86, 167, 139, 105, 29, 190, 167, 200, 171, 96, 216, 44, 79, 22, 109, 86, 154, 145, 26, 87, 156, 119, 223, 146, 187, 24, 184, 86, 123, 48, 160, 230, 164, 226, 238],
    "balance": 0,
    "balanceLamports": 0,
    "savedPath": "/path/to/my-buyer-keypair.json",
    "note": "Store the secretKey safely. You can use it in buyout requests."
  }
}
```

### Airdrop to Buyer

#### `POST /buyout/airdrop-buyer`

Request SOL airdrop cho buyer (chỉ localhost).

#### Request Body:
```json
{
  "buyerPubkey": "22PRfLKmHWH25tzPKPrE1unvjsGUmcfWVqjttrX24UWG",
  "amount": 5
}
```

#### Response:
```json
{
  "success": true,
  "signature": "4xZ8yVq9K2mN5pR3sT6uW7vX1yA2bC3dE4fG5hI6jK7lM8nO9qR0sT1uV2wX3yZ4",
  "data": {
    "buyerPubkey": "22PRfLKmHWH25tzPKPrE1unvjsGUmcfWVqjttrX24UWG",
    "airdropAmount": 5,
    "newBalance": 5,
    "newBalanceLamports": 5000000000
  }
}
```

---

## Error Responses

### Common Error Formats:

#### Validation Error:
```json
{
  "success": false,
  "message": "Missing required fields: vaultAddress, offerLamports"
}
```

#### Not Found Error:
```json
{
  "success": false,
  "message": "Vault not found at address: InvalidVaultAddress123. Make sure the vault exists and is deployed on localhost."
}
```

#### Business Logic Error:
```json
{
  "success": false,
  "message": "Vault must be fractionalized before accepting buyout offers"
}
```

#### Server Error:
```json
{
  "success": false,
  "message": "Failed to initiate buyout: Internal server error"
}
```

---

## Status Codes

- `200` - Success
- `400` - Bad Request (validation errors, business logic errors)
- `404` - Not Found (vault/offer không tồn tại)
- `500` - Internal Server Error

---

## Notes

1. **Mock Responses**: Accept và reject endpoints hiện tại chỉ là mock responses vì smart contract chưa implement các instructions này.

2. **Database Storage**: Tất cả buyout offers được lưu vào MongoDB collection `buyoutoffers`.

3. **Expiry**: Offers mặc định expire sau 7 ngày từ khi tạo.

4. **Lamports vs SOL**: API accepts amounts trong lamports (1 SOL = 1,000,000,000 lamports) nhưng database cũng store converted SOL values để query dễ hơn.

5. **Testing**: Sử dụng generate-buyer-keypair và airdrop-buyer endpoints để setup testing environment.
