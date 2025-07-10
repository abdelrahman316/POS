# POS System - Client-Side Documentation (`main.js`)

## Overview

This JavaScript file handles all client-side functionality for the Point of Sale (POS) system.
It manages user interfaces, communicates with the server, and maintains application state.

## Key Features

- **User Authentication**: Handles login, auto-login, and logout
- **Product Management**: Displays products, handles search/filtering
- **Cart System**: Manages adding/removing items, quantity adjustments
- **Checkout Process**: Handles transaction processing
- **Admin Features**: Stock management, user management, transaction viewing
- **Server Triggered Actions**: The server handle most of the logic even for the client-side
- **Safe Communication**: On-Protocol server communication

## Core Components

### 1. Global State Object
```javascript
const global = {
    productsArray: [], // Available products
    stock: [],         // Full inventory (admin only)
    cart: [],          // Current shopping cart
    users: [],         // User list (admin only)
    currentUser: null, // Logged in user
    sid: null,         // Session ID
    // DOM element references...
};
```

### 2. Main Functions

#### Authentication
- `showNormalLogin()`: Displays login screen
- `handleManualLogin()`: Processes manual login
- `attemptAutoLogin()`: Tries session-based auto-login
- `logout()`: Ends session and resets UI

#### Product Management
- `loadProducts()`: Fetches products from server
- `renderProducts()`: Displays products in grid
- `renderNewProductCard()`: Creates HTML for single product

#### Cart Operations
- `loadCart()`: Gets current cart from server
- `updateCart()`: Modifies cart contents
- `updateCartDisplay()`: Updates cart UI
- `checkout()`: Processes payment

#### Admin Features
- `loadStock()`/`renderStockView()`: Inventory management
- `loadUsers()`/`renderUsersView()`: User administration
- `loadTransactions()`/`renderTransactionsView()`: Sales reporting

### 3. Server Communication
```javascript
function sendToServer(url, callback, data = {}, async = true) {
    // Handles all AJAX requests with:
    // - Implement on-protocol communication
    // - Error handling
    // - Server-side Actions-Triggering processing
}
```

## How to Use

### Basic Flow
1. **Login**: System attempts auto-login first, falls back to manual login
2. **Browse Products**: Products load automatically after login
3. **Manage Cart**: Add/remove items, adjust quantities
4. **Checkout**: Complete purchase
5. **Admin & Non-Admin Features**: Accessible via settings button 

### Key Interactions

#### Adding Products to Cart
```javascript
// Click handler for product buttons
global.productsGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.product-button');
    if (btn) updateCart(parseInt(btn.dataset.id), "add_product");
});
```

#### Checking Out
```javascript
global.checkoutBtn.addEventListener('click', checkout);
```

#### Admin Access
```javascript
document.getElementById("settingsBtn").addEventListener('click', runSubWindow);
```

## UI Components

### 1. Login Screen
- Username/password fields
- Login button

### 2. Main Interface
- Product grid with search/filter
- Shopping cart panel
- Checkout button
- User info/logout

### 3. Admin Panel (Modal)
- **Transactions**: Filterable sales history
- **Stock**: Editable inventory management just by `dbl-click`
- **Users**: User administration

## Security Features

- Session timeout (30 minutes inactivity)
- Auto-logout when tab is hidden
- Password hashing (SHA-256)
- Admin role verification
- Secure server communication

## Customization Points

1. **Product Cards**: Modify `renderNewProductCard()` for different layouts
2. **Notification System**: Adjust `showNotification()` for different styles
3. **Cart Display**: Update `updateCartDisplay()` for UI changes
4. **Admin Views**: Edit the various render functions in the admin section

## Error Handling

The system provides visual feedback for:
- Failed logins
- Out of stock items
- Network errors
- Invalid operations

## Browser Compatibility

The code uses modern JavaScript features and assumes support for:
- ES6+ syntax
- Fetch API
- CSS Grid/Flexbox
- DOM manipulation APIs

## Initialization

The app starts automatically on page load:
```javascript
window.addEventListener("load", initApp);
```

## Session Persistence

Uses `sessionStorage` to maintain login during page reloads:
```javascript
window.addEventListener("beforeunload", e => {
    sessionStorage.setItem("sid", global.sid);
    fetch("/page_reloading", {
        method: "POST",
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            sid : global.sid
        }),
        keepalive: true,
    });
});
```
