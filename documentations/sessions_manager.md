# Session Manager Module

A secure session management system for Node.js applications with built-in expiration and shopping cart functionality.

## Features

- Secure session management with SHA-256 hashed session keys
- Automatic session expiration (default: 30 minutes)
- Built-in shopping cart functionality
- Session cleanup scheduler
- User activity tracking
- Thread-safe operations
- Auto-login support

## Installation
- Make sure you have crypto library install
```bash
npm install crypto-js
```

## Usage

```javascript
const SessionManager = require('./sessionManager');

// Initialize with default 30-minute session expiration
const sessionManager = new SessionManager();

// Customize session expiration (in milliseconds)
const sessionManager = new SessionManager(60 * 60 * 1000); // 1 hour

// Create a new session
const newSession = sessionManager.assign_new_session(
    1,              // user_id
    'admin',        // username
    'admin'         // user_role
);

// Use the session key for subsequent requests
const sessionKey = newSession.session_key;

// Get session data
const currentSession = sessionManager.get_session(sessionKey);

// Update session
sessionManager.update_session(sessionKey, {
  username: 'newUsername',
  cart: [...updatedCart]
});

// Update session key
const newSessionKey = sessionManager.update_session_key( sessionKey )

// Manage shopping cart
sessionManager.update_cart(sessionKey, 'add_product', product);
sessionManager.update_cart(sessionKey, 'remove_product', productId);
sessionManager.update_cart(sessionKey, 'reduce_quantity', productId);
sessionManager.update_cart(sessionKey, 'empty_cart');

// End session
sessionManager.remove_session(sessionKey);
```

## Session Structure

Each session contains:

```javascript
{
  session_key: "SHA-256 hash", // Unique session identifier
  user_id: 1,                  // User ID from database
  username: "admin",           // User's username
  user_role: "admin",          // User's role 'admin'
  last_req_time: Date,         // Last activity timestamp
  cart: [],                    // Shopping cart items
  autologin: false             // Auto-login flag
}
```

## Cart Operations

### Adding a Product
```javascript
const product = {
  id: 1,           // Product ID (required)
  name: "Product",  // Product name (required)
  price: 9.99,      // Unit price (required)
  quantity: 1,      // Initial quantity
  maxStock: 10      // Maximum available stock
};

// Add new product or maxmize product quantity by 1 if already exists
sessionManager.update_cart(sessionKey, 'add_product', product);
```

### Removing a Product
```javascript
sessionManager.update_cart(sessionKey, 'remove_product', productId);
```

### Reducing Quantity
```javascript
// reduce quantity by 1
sessionManager.update_cart(sessionKey, 'reduce_quantity', productId);
```

### Emptying Cart
```javascript
sessionManager.update_cart(sessionKey, 'empty_cart');
```

## Security Features

- Session keys regenerated with cryptographic randomness
- Buffer comparison to prevent timing attacks
- Automatic in-active sessions cleanup ( garbage collecting )
- Input validation for all operations
- Activity-based expiration

## Error Handling

All methods return `false` on failure and log error details . Critical errors will throw exceptions.

## Best Practices

1. Always store session keys securely (HTTP-only cookies recommended)
2. Rotate session keys after privilege changes
3. Set appropriate session expiration based on your security requirements
4. Validate all cart operations on the server side
5. Use HTTPS in production environments

## License

MIT License