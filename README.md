# Point of Sale (POS) System Web App

## Overview

- This is a simple POS system web app built with node.js and sqlite.
- The API powers a complete Point of Sale system with user authentication, product management, transaction processing, and administrative functions. 
- The system uses SQLite for data storage and implements custom session management.

Also most of the component are simple re-usable **modules** with separate [documentations](./documentations) , feel free to use it building your projects

[Demo video at vimeo](https://vimeo.com/1101035736)

## Features

- **User Authentication**: Secure login with a custom sessions management module along with its documentation
- **Product Management & Inventory Control**: all of the products in your stock is under control , you can add, edit and remove any products you want , also it comes with a dynamic simple dashboard to do every thing you need , you can also filter and search the stock products
- **Transaction Processing**: Complete sales with inventory updates, you can see all the transactions history along with all the needed data like username, items, total, time , and subtotla for each product , you can filter and sort the transactions history to collect clear reports.
- **Admin Dashboard**: User management and reporting , this app contain a good simple dashboard to control and manage every thing you need , including the transactions , the stock and the users , you can do all the mentioned things before with this dashboad along with users managament , you can add new users or remove old ones, you can see which users are alive now and whom are not , and of course you can shange your own password as well as any ather non-admin user
- **Stability**: Custom session management with automatic expiration and a custom communecations protocol to make sure every thing is working at its best , you can have two sessions in the same device even in the same browser , you can multiple sessions for the same user , you have a very good auto-login algorithm that allow the users to refresh the page or to reload without closing the session and cookies are noobies here bcz you can have multiple users with multiple sessions on the same browser with zero conflictions 
- **Dynamic Client-Side Interaction** Dynamic interaction through triggering actions on the client-side, the server-side handle all the logic and like 80% of the client-side logic as well
- **Code** Coded in JavaSript, Node.js and SQLite , even the modules
- **Database** The database software is "sqlite" which is a very lite software , the databases it creates are files and you can easly share it and make backups , needing no outer dependecis , to complix configurations.
**Documantaions** every separet module has a small doc file so you get to know what every function and to get a whole over view of how every thing works together
  
## I think watching a demo video is better
[it is just a 3 mins video](https://vimeo.com/1101035736)

## Security Considerations

1. Always use HTTPS in production
2. Session tokens expire after 30 minutes of inactivity ( customizable )
3. Passwords are stored as SHA-256 hashes
4. Admin endpoints require admin privileges
5. Automatic session cleanup removes expired sessions

## Security Suggestions 
( things i with i did )

1. Implement a Custom RSA encryption for both end points
2. Use some sort of secure storage or isolated thread like Web Workers
3. Make the requests and responses a seprate module that impelement all the security features ( also on the client-side )


## Setup Instructions

- you make sure you have node.js
- run this command in you shell `git https://github.com/abdelrahmantheprogrammer/POS.git`
1. Install dependencies: `npm install sqlite3 express crypto-js`
2. Configure database in `data.json` (optional)
3. Start server: `node server.js`
4. Access at `http://localhost:3000`

## License

[MIT License
](./LICENSE)
