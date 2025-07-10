# Point of Sale (POS) System API Documentation

## Overview

This API powers a complete Point of Sale system with user authentication, product management, transaction processing, and administrative functions. 
The system uses SQLite for data storage and implements custom session management.

Also most of the component are separate simple re-usable **modules** with separate [documentations](./documentations) , feel free to use it building your projects

## Features

- **User Authentication**: Secure login with session management
- **Product Management**: Browse, add to cart, and checkout
- **Inventory Control**: Stock level tracking and management
- **Transaction Processing**: Complete sales with inventory updates
- **Admin Dashboard**: User management and reporting
- **Security**: Custom session management with automatic expiration
- **Dynamic Client-Side Interaction** Dynamic interaction through triggering actions on the client-side
- **Code** Coded in JavaSript, Node.js only , even the modules


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

[MIT License
](./LICENSE)
