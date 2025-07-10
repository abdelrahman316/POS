# Point of Sale (POS) System API Documentation

## Overview

This API powers a complete Point of Sale system with user authentication, product management, transaction processing, and administrative functions. The system uses SQLite for data storage and implements custom session management.

## Features

- **User Authentication**: Secure login with session management
- **Product Management**: Browse, add to cart, and checkout
- **Inventory Control**: Stock level tracking and management
- **Transaction Processing**: Complete sales with inventory updates
- **Admin Dashboard**: User management and reporting
- **Security**: Custom session management with automatic expiration
- **Dynamic Client-Side Interaction** Dynamic interaction through triggering actions on the client-side

## Base URL

`http://localhost:3000`

## Authentication

All endpoints (except `/login`) require authentication via session token. 
The token should be included in the request body as `sid`.

All responses (except `/page_reloading` failed `/login`) contain a new updated one-time-use authentication session token (`sid`).
The client-side software can perform one more request using it.

## API Endpoints

### Authentication

#### `POST /login`
Authenticates a user and creates a session.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Success Response:**
```json
{
  "success": true,
  "sid": "session_token",
  "user": {
    "id": 1,
    "username": "admin",
    "user_role": "admin"
  },
  "appContainerHTML": "..."
}
```

### Session Management

#### `POST /page_reloading`
Handles page reloads with session persistence.

**Headers:**
- Requires valid session token

**Success Response:**
```json
{"success": true, "message": "ready to reload the page"}
```

#### `POST /logout`
Terminates the current session.

**Headers:**
- Requires valid session token

**Success Response:**
```json
{"success": true, "message": "Log out Successfully"}
```

### Products

#### `POST /products`
Retrieves all available products.

**Headers:**
- Requires valid session token

**Success Response:**
```json
{
  "products": [
    {
      "id": 1,
      "name": "Smartphone X10",
      "batch": "900800700",
      "category": "Electronics",
      "price": 599.99,
      "stock": 15,
      "imgurl": "./tmp/smartphone.jpg"
    }
  ],
  "success": true,
  "actions": ["render_products"]
}
```

### Cart Operations

#### `POST /load_cart`
Retrieves the current user's cart.

**Headers:**
- Requires valid session token

**Success Response:**
```json
{
  "success": true,
  "cart": [
    {
      "id": 1,
      "name": "Smartphone X10",
      "price": 599.99,
      "quantity": 1
    }
  ],
  "actions": ["render_cart"]
}
```

#### `POST /update_cart_item`
Modifies cart contents.

**Request Body:**
```json
{
  "product_id": 1,
  "action": "add_product" // or "remove_product", "reduce_quantity"
}
```

**Success Response:**
```json
{
  "success": true,
  "cart": [/* updated cart */],
  "actions": ["render_cart"]
}
```

### Checkout

#### `POST /checkout`
Processes the current cart as a transaction.

**Headers:**
- Requires valid session token

**Success Response:**
```json
{
  "success": true,
  "message": "Order Completed Successfully!",
  "actions": ["reload_products", "render_products", "reload_cart", "render_cart"]
}
```

### Transactions

#### `POST /transactions`
Retrieves transaction history.

**Headers:**
- Requires valid session token
- Admin users see all transactions
- Regular users see only their transactions

**Success Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": 1,
      "user_id": 1,
      "total": 599.99,
      "timestamp": "2023-05-15T14:23:45.678Z",
      "items": [
        {
          "id": 1,
          "name": "Smartphone X10",
          "price": 599.99,
          "quantity": 1
        }
      ]
    }
  ],
  "actions": ["render_transactions"]
}
```

## Admin Endpoints

### Inventory Management

#### `POST /stock`
Retrieves complete inventory data (admin only).

**Success Response:**
```json
{
  "success": true,
  "products": [/* all products with full details */]
}
```

#### `POST /update_stock`
Modifies inventory (admin only).

**Request Body:**
```json
{
  "action": "UpdateOneProduct", // or "AddOneProduct", "RemoveOneProduct"
  "data": {
    "productId": 1,
    "key": "stock",
    "value": 20
  }
}
```

### User Management

#### `POST /users`
Retrieves user list (admin only).

**Success Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "status": true
    }
  ],
  "actions" : ["render_users"]
}
```

#### `POST /update_users`
Manages users (admin only).

**Request Body:**
```json
{
  "action": "AddNewUser", // or "RemoveUser"
  "data": {
    "username": "newuser",
    "role": "cashier"
  }
}
```

### Password Management

#### `POST /change_user_password`
Allows users to change their password.

**Request Body:**
```json
{
  "data": {
    "oldPassword": "currentpass", 
    "newPassword": "newpass"
  }
}
```

## Error Handling

All error responses follow this format:
```json
{
  "success": false,
  "message": "Error description"
}
```

## Secure Shutdown

- shutdown gracefully after logging the outer shutdown signal
- shutdown the database, sessions manager and the logger

```javascript

// logout_all_users()
sessionManager.remove_all_sessions();
db.close();
logger.close();
```

## Security Considerations

1. Always use HTTPS in production
2. Session tokens expire after 30 minutes of inactivity ( customizable )
3. Passwords are stored as SHA-256 hashes
4. Admin endpoints require admin privileges
5. Automatic session cleanup removes expired sessions

## Security Suggestions

1. Implement a Custom RSA encryption for both end points
2. Use some sort of secure storage or isolated thread like Web Workers
3. Make the requests and responses a seprate module that impelement all the security features ( also on the client-side )


## Setup Instructions

1. Install dependencies: `npm install sqlite3 express crypto-js`
2. Configure database in `data.json`
3. Start server: `node server.js`
4. Access at `http://localhost:3000`

## License

MIT License