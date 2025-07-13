# Point of Sale (POS) System Web App

## Overview

- This is a simple POS system web app built with **Node.js** and **SQLite**.
- The API powers a complete Point of Sale system with user authentication, product management, transaction processing, and administrative functions.
- The system uses SQLite for data storage and implements custom session management.

**Additionally**, most of the components are simple re-usable **modules** with separate [documentation](./documentations). Feel free to use them in building your projects.

[Demo video on Vimeo](https://vimeo.com/1101035736)

## Features

- **User Authentication**: Secure login with a custom session management module along with its documentation
- **Product Management & Inventory Control**: All products in your stock are under control. You can add, edit, and remove any products you want. It also comes with a dynamic, simple dashboard to handle everything you need. You can also filter and search the stock products.
- **Transaction Processing**: Complete sales with inventory updates. You can see all transaction history along with all needed data like username, items, total, time, and subtotal for each product. You can filter and sort the transaction history to generate clear reports.
- **Admin Dashboard**: User management and reporting. This app contains a good, simple dashboard to control and manage everything you need, including transactions, stock, and users. You can perform all the mentioned actions through this dashboard along with user management. You can add new users or remove old ones, see which users are currently active, and of course change your own password as well as any other non-admin user's password.
- **Stability**: Custom session management with automatic expiration and a custom communications protocol to ensure everything works at its best. You can have two sessions on the same device, even in the same browser. Multiple sessions for the same user are supported. The auto-login algorithm allows users to refresh the page or reload without closing the session. Cookies are basic here because you can have multiple users with multiple sessions on the same browser with zero conflicts.
- **Dynamic Client-Side Interaction**: Dynamic interaction through triggering actions on the client-side. The server-side handles all the logic and about 80% of the client-side logic as well.
- **Code**: Coded in JavaScript, Node.js and SQLite, including the modules.
- **Database**: The database software is "SQLite", which is very lightweight. The databases it creates are files that you can easily share and back up, requiring no external dependencies or complex configurations.
- **Documentation**: Each separate module has a small documentation file so you can understand what every function does and get an overview of how everything works together.

## I think watching a demo video is better
[It's just a 3-minute video](https://vimeo.com/1101035736)

## Security Considerations

1. Always use HTTPS in production
2. Session tokens expire after 30 minutes of inactivity (customizable)
3. Passwords are stored as SHA-256 hashes
4. Admin endpoints require admin privileges
5. Automatic session cleanup removes expired sessions

## Security Suggestions 
(Things I wish I had implemented)

1. Implement custom RSA encryption for both endpoints
2. Use secure storage or an isolated thread like Web Workers
3. Make the requests and responses a separate module that implements all security features (including client-side)

## Setup Instructions

- Make sure you have Node.js installed
- Run this command in your shell: `git clone https://github.com/abdelrahmantheprogrammer/POS.git`
1. Install dependencies: `npm install sqlite3 express crypto-js`
2. Configure database in `data.json` (optional)
3. Start server: `node server.js`
4. Access at `http://localhost:3000`

## License

[MIT License](./LICENSE)
