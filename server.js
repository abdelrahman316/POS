const fs = require('fs');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const express = require('express');
// const session = require('express-session'); // no longer need this
const logger = require("./logger"); // my logging module 
const SessionsManager = require('./SessionsManager'); // my sessions manager module
const db_initializer = require('./DatabaseInitializer'); // my database manager module
const htmlTmps = require('./public/html_templates');
const SessionManager = require('./SessionsManager');

const log = new logger(); // default conf
const app = express();
const port = 3000;

// ====================== Helper Functions ======================
function CompareTwoBuffers(str1, str2) {
    // i miss C
    if (typeof str1 !== 'string' || typeof str2 !== 'string') return false;
    if (str1.length !== str2.length) return false;
    
    for (let i = 0; i < str1.length; i++) {
        if (str1[i] !== str2[i]) return false;
    }
    return true;
}

function encrypt(string) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(string), cipher.final()]);
  
  return { encrypted, key, iv };
}

function decrypt(encryptedBuffer, keyBuffer, ivBuffer) {
  const algorithm = 'aes-256-cbc';
  const decipher = crypto.createDecipheriv(algorithm, keyBuffer, ivBuffer);
  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
}

function sha256(string) {
  return crypto.createHash('sha256').update(string).digest('hex');
}


// ====================== Database Initialization && Setup ======================

// the load base data from a json file for first use 
// if not it'll create one for you containning the base data
// and then init the database
let db = new db_initializer("./data.json");
// now the database is ready for work
db = db.db ;
// that's it 
log.info('Database configured');


// ============================ Middleware ============================
const sessionsManager = new SessionManager(30*60*1000); // session expire-time is 30min of in-activity
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Initialize session
app.use((req, res, next) => {
    const loc = "@SessionsMiddleware:";
    const session_key = Object(req.body).hasOwnProperty("sid") ? req.body.sid : null;
    if (session_key) {
        const session = sessionsManager.get_session(session_key);
        if (session) {
            req.session = session ; // after this point the "sid" only used for responses
            if( req._parsedUrl.href != "/page_reloading"){
                // inject and create a new session key with each response
                const originalJson = res.json ;
                res.json = (data)=>{
                    data = {...data, sid: sessionsManager.update_session_key(session_key)};
                    originalJson.call(res, data);
                };
            }
            return next();
        } else {
            log.warn(`${loc} Invalid session ID: ${session_key.substring(0, 8)}...`);
            sessionsManager.print();
        }
    } else {
        log.debug(`${loc} No session ID in request`);
    } 

    req.session == null ;
    next();
});
log.info('Middleware configured');

// Authentication middleware
const requireLogin = (req, res, next) => {
    const loc = "@requireLogin:";

    if (!req.session ){
        log.warn(`${loc} Unauthorized access attempt - no session `);
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!sessionsManager.get_session(req.session.session_key)){
        log.warn(`${loc} Session expired: ${req.session.session_key.substring(0, 8)}...`);
        req.session = null;
        return res.status(401).json({ success: false, message: "Session expired" });
    }

    next();
};

const requireAdmin = (req, res, next) => {
    const loc = "@requireAdmin:";
    requireLogin(req, res, () => {
        if (req.session.user_role !== 'admin') {
            log.warn(`${loc} Forbidden access attempt by ${req.session.username} (role: ${req.session.user_role})`);
            return res.status(403).json({ success: false, message: "Forbidden" });
        }
        next();
    });
};

// Clear the sessions db 
function logout_all_users() {
    const loc = "@logout_all_users:";    
    if (sessionsManager.remove_all_sessions()) {
        log.info(`${loc} All users logged out and sessions cleared`);
        return true;
    } else {
        log.err(`${loc} Failed to log out all users`);
        return false;
    }
}

// ====================== ROUTE HANDLERS ======================
app.post('/login', (req, res) => {
    const loc = "@/login:";
    const { username, password } = req.body;
    log.info(`${loc} Login attempt from: ${ Object(req.session).hasOwnProperty("session_key") ? req.session.session_key : ( username || "New User") }`);

    // Try auto login ================
    if (Object(req.session).hasOwnProperty("session_key")) {
        const sessionId = req.session.session_key;
        log.debug(`${loc} Auto login attempt with session: ${sessionId.substring(0, 8)}...`);
        const session = sessionsManager.get_session(sessionId);
        
        if (session && (session.autologin == true) ){
            sessionsManager.update_session( sessionId , { autologin : false } )
            log.info(`${loc} Auto login successful for: ${session.username}`);
            return res.json({ 
                success: true, 
                message: "Auto Sign in Successfully", 
                user: { 
                    id: session.user_id,
                    username: session.username, 
                    user_role: session.user_role, 
                },
                appContainerHTML: htmlTmps.appContainerFor(session.user_role),
            });
        } 
        
        // means illegal reloading or illegal auto-login attempt for a live user
        // where some stole the session_key or the session_key was cached in the browser
        if( session && !session.autologin ){
            log.warn(`${loc} illegal auto-login attempt for a live user ${sessionId.substring(0, 8)}...`);
            sessionsManager.remove_session( sessionId );
            log.warn(`${loc} logged them out for their security ${sessionId.substring(0, 8)}...`);
            res.json({ success: false, message: "Session expired, log in please "});
        }

        if( !session ){
            log.warn(`${loc} Auto login failed - invalid session: ${sessionId.substring(0, 8)}...`);
            res.json({ success: false, message: "Auto login failed"});
        }
    }

    // Manual login ==============
    if (!username || !password) {
        log.warn(`${loc} Login attempt with missing credentials`);
        return res.status(400).json({ success: false, message: "Username and password are required" });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            log.err(`${loc} Database error: ${err.message}`);
            return res.status(500).json({ success: false, message: "Server Side error" });
        }
        
        if (!user) {
            log.warn(`${loc} Invalid username: ${username}`);
            return res.status(401).json({ success: false, message: "Invalid username or password" });
        }
        
        if (!CompareTwoBuffers(user.password, password)) {
            log.warn(`${loc} Invalid password for user: ${username}`);
            return res.status(401).json({ success: false, message: "Invalid username or password" });
        }
    
        const new_session = sessionsManager.assign_new_session(user.id, user.username, user.role);
        log.info(`${loc} New session created for ${username} (ID: ${new_session.session_key.substring(0, 8)}...)`);
        log.info(`${loc} Session details: ${JSON.stringify(new_session)}`);
        sessionsManager.print()

        return res.json({ 
            success: true, 
            message: "Sign in Successfully", 
            sid: new_session.session_key,
            user: { 
                id: user.id,
                username: user.username, 
                user_role: user.role, 
            },
            appContainerHTML: htmlTmps.appContainerFor(user.role),
        });
    });
});

// when a user reload the page, apply the auto login for them
app.post("/page_reloading", requireLogin, (req, res)=>{
    const loc = "@/logout:";
    const { session_key } = req.session;
    let session = sessionsManager.get_session( session_key );
    sessionsManager.update_session( session_key , { autologin : true } );
    log.info(`${loc} ${req.user} is reloading the page`);
    res.json({success: true, message : "ready to reload the page"})
});

app.post("/logout", requireLogin, (req, res) => {
    const loc = "@/logout:";
    const { session_key, username } = req.session;
    log.info(`${loc} Logout request from: ${ username }`);
    
    if (sessionsManager.remove_session(session_key)) {
        log.info(`${loc} Session terminated: ${session_key.substring(0, 8)}...`);
        res.json({ success: true, message: "Log out Successfully" });
    } else {
        log.err(`${loc} Failed to terminate session: ${session_key.substring(0, 8)}...`);
        res.json({ success: false, message: "Could not log out, internal error" });
    }
});

app.post('/products', requireLogin, (req, res) => {
    const loc = "@/products:";
    log.debug(`${loc} Fetching products for ${req.session.username}`);
    
    db.all('SELECT * FROM products WHERE stock > 0', (err, rows) => {
        if (err) {
            log.err(`${loc} Database error: ${err.message}`);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        
        log.info(`${loc} Retrieved ${rows.length} products`);
        res.json({ 
            products: rows, 
            success: true, 
            message: "Loaded products successfully", 
            actions: ["render_products"]
        });
    });
});

app.post("/load_cart", requireLogin, (req, res) => {
    const loc = "@/load_cart:";
    log.debug(`${loc} Loading cart for ${req.session.username}`);
    res.json({ 
        success: true, 
        cart: req.session.cart, 
        actions: ["render_cart"],
    });
});

app.post('/update_cart_item', requireLogin, (req, res) => {
    const loc = "@/update_cart_item:";
    const { product_id, action } = req.body;
    log.info(`${loc} ${action} request for product ${product_id} from ${req.session.username}`);

    if (action === "remove_product" || action === "reduce_quantity") {
        const new_cart = sessionsManager.update_cart(req.session.session_key, action, product_id);
        if (!new_cart) {
            log.warn(`${loc} Product not found in cart: ${product_id}`);
            return res.status(404).json({ 
                success: false,
                message: "No product found with that id in your cart",
            });
        }
        log.debug(`${loc} Cart updated - new item count: ${new_cart.length}`);
        res.json({ 
            success: true, 
            cart: new_cart, 
            actions: ["render_cart"],
        });
    } 
    else if (action === "add_product") {
        db.get(`SELECT * FROM products WHERE id = ${product_id}`, (err, product) => {
            if (err || !product) {
                log.warn(`${loc} Product not found: ${product_id}`);
                return res.status(404).json({ success: false, message: "Product not found" });
            }
            
            if (product.stock < 1) {
                log.warn(`${loc} Product out of stock: ${product_id}`);
                return res.status(400).json({ success: false, message: "Product out of stock" });
            }
            
            const cartItem = {
                id: product.id,
                name: product.name,
                batch: product.batch,
                price: product.price,
                imgurl: product.imgurl,
                quantity: 1,
                maxStock: product.stock
            };
            
            const new_cart = sessionsManager.update_cart(req.session.session_key, action, cartItem);
            if (!new_cart) {
                log.warn(`${loc} Stock limit reached for product: ${product_id}`);
                return res.status(400).json({ 
                    success: false, 
                    message: `Only ${product.stock} items available`,
                    maxStock: product.stock,
                    actions: ["render_products"]
                });
            }
            
            log.debug(`${loc} Product added to cart: ${product.name}`);
            res.json({ 
                success: true, 
                cart: new_cart,
                actions: ["render_cart"],
            });
        });
    } 
    else {
        log.warn(`${loc} Invalid action: ${action}`);
        return res.status(400).json({ 
            success: false,
            message: "Action must be 'add_product', 'remove_product' or 'reduce_quantity'",
        });
    }
});

app.post('/checkout', requireLogin, (req, res) => {
    const loc = "@/checkout:";
    const username = req.session.username;
    log.info(`${loc} Checkout started for ${username}`);

    if (!req.session.cart || req.session.cart.length === 0) {
        return res.json({ success: false, message: "Your cart is empty" });
    }

    // Prepare the items list
    const items = req.session.cart;
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    db.serialize(() => {
        // Begin transaction
        // did you knew the db is now locked after this line and until "commit" or "rollback"
        db.run("BEGIN IMMEDIATE TRANSACTION");

        // First:
        // Check if the database has these items within those quantities
        const checkStock = () => {
            const placeholders = items.map(() => '?').join(',');
            db.all(
                `SELECT id, name, stock FROM products 
                 WHERE id IN (${placeholders})`,
                items.map(i => i.id),
                (err, products) => {
                    if (err) return rollback(err);

                    // Check each item's availability
                    for (const item of items) {
                        const product = products.find(p => p.id === item.id);
                        if (!product || item.quantity > product.stock) {
                            return rollback(new Error(
                                `${product?.name || 'Item'} not available`
                            ));
                        }
                    }

                    // If all items available, continue
                    createTransaction();
                }
            );
        };

        // Second: 
        // Create the transaction record
        const createTransaction = () => {
            db.run(
                `INSERT INTO transactions (user_id, total, items) 
                 VALUES(?, ?, ?)`,
                [req.session.user_id, total, JSON.stringify(items)],
                function(err) {
                    if (err) return rollback(err);
                    updateStock();
                }
            );
        };

        // Third:
        // Update product stock
        const updateStock = () => {
            let completed = 0;
            for (const item of items) {
                db.run(
                    `UPDATE products SET stock = stock - ? 
                     WHERE id = ?`,
                    [item.quantity, item.id],
                    (err) => {
                        if (err) return rollback(err);
                        
                        if (++completed === items.length) {
                            finalizeTransaction();
                        }
                    }
                );
            }
        };

        // Finally :
        // Commit everything
        const finalizeTransaction = () => {
            db.run("COMMIT", (err) => {
                if (err) return rollback(err);
                
                // Clear the cart
                sessionsManager.update_cart(req.session.session_key, "empty_cart", true);
                
                return res.json({ 
                    success: true, 
                    message: "Order Completed Successfully !",
                    actions: ["reload_products", "render_cart"]
                });
            });
        };

        // Error handling 
        const rollback = (error) => {
            db.run("ROLLBACK", () => {
                log.err(`${loc} Error: ${error.message}`);
                return res.json({ 
                    success: false, 
                    message: error.message,
                    actions: ["reload_products", "render_cart"]  // trigger actions on the client-side
                });
            });
        };

        // Start the process
        checkStock();
    });
});

// if user role is "admin" see all transactions
// if non-admin user see their transactions only
app.post('/transactions', requireLogin, (req, res) => {
    const loc = "@/transactions:";
    const username = req.session.username;
    const isAdmin = req.session.user_role === 'admin';
    log.info(`${loc} ${isAdmin ? 'Admin' : 'User'} transaction request by ${username}`);

    const query = isAdmin 
        ? `SELECT t.*, u.username 
           FROM transactions t
           JOIN users u ON t.user_id = u.id
           ORDER BY t.timestamp DESC`
        : `SELECT t.*, u.username 
           FROM transactions t
           JOIN users u ON t.user_id = u.id
           WHERE t.user_id = ?
           ORDER BY t.timestamp DESC`;
    
    const params = isAdmin ? [] : [req.session.user_id];
    
    db.all(query, params, (err, rows) => {
        if (err) {
            log.err(`${loc} Transaction query error: ${err.message}`);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        
        try {
            const transactions = rows.map(tx => ({
                ...tx,
                items: JSON.parse(tx.items)
            }));
            
            log.info(`${loc} Returning ${transactions.length} transactions`);
            res.json({ 
                success: true, 
                transactions ,
                actions: ["render_transactions"]
            });
        } catch (parseError) {
            log.err(`${loc} Transaction parse error: ${parseError.message}`);
            res.status(500).json({ success: false, message: "Error processing transactions" });
        }
    });
});

// ======== ADMIN ENDPOINTS =========
app.post('/stock', requireAdmin, (req, res) => {
    const loc = "@/stock:";
    log.info(`${loc} Stock data request by admin: ${req.session.username}`);
    
    db.all("SELECT * FROM products;", (err, rows) => {
        if (err) {
            log.err(`${loc} Stock query error: ${err.message}`);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        
        log.info(`${loc} Returning ${rows.length} stock items`);
        res.json({ 
            success: true, 
            products: rows, 
            message: "Loaded products successfully",
            actions: ["render_stock"]
        });
    });
});

app.post('/update_stock', requireAdmin, (req, res) => {
    const loc = "@/update_stock:";
    const { action, data } = req.body;
    const username = req.session.username;
    log.info(`${loc} Stock update request by ${username}: ${action}`, data);

    const actions = {
        UpdateOneProduct: (data) => {
            if (!data.productId || !data.key || !data.value) {
                log.warn(`${loc} Invalid UpdateOneProduct request`);
                return res.status(400).json({ success: false, message: "Invalid parameters" });
            }
            
            db.run(`UPDATE products SET ${data.key} = ? WHERE id = ?`, 
                [data.value, data.productId], 
                function(err) {
                    if (err) {
                        log.err(`${loc} Update error: ${err.message}`);
                        return res.status(500).json({ success: false, message: err.message });
                    }
                    
                    if (this.changes === 0) {
                        log.warn(`${loc} Product not found: ${data.productId}`);
                        return res.status(404).json({ success: false, message: "Product not found" });
                    }
                    
                    log.info(`${loc} Product ${data.productId} updated: ${data.key}=${data.value}`);
                    res.json({ 
                        success: true,
                        actions: ["reload_stock", "reload_products"]
                    });
                }
            );
        },
        
        AddOneProduct: (data) => {
            const required = ["name", "batch", "category", "price", "stock", "imgurl"];
            if (!required.every(prop => data.hasOwnProperty(prop))) {
                log.warn(`${loc} Invalid AddOneProduct request - missing parameters`);
                return res.status(400).json({ success: false, message: "Missing parameters" });
            }
            
            db.run(`INSERT INTO products (name, batch, category, price, stock, imgurl) VALUES(?, ?, ?, ?, ?, ?)`, 
                [data.name, data.batch, data.category, data.price, data.stock, data.imgurl],
                function(err) {
                    if (err) {
                        log.err(`${loc} Insert error: ${err.message}`);
                        return res.status(500).json({ success: false, message: err.message });
                    }
                    
                    log.info(`${loc} New product added: ${data.name} (ID: ${this.lastID})`);
                    res.json({ 
                        success: true,
                        productId: this.lastID ,
                        actions: ["reload_stock", "reload_products"]
                    });
                }
            );
        },
        
        RemoveOneProduct: (productId) => {
            db.get(`SELECT * FROM products WHERE id = ?`, [productId], (err, row) => {
                if (err) {
                    log.err(`${loc} Product query error: ${err.message}`);
                    return res.status(500).json({ success: false, message: err.message });
                }
                
                if (!row) {
                    log.warn(`${loc} Product not found for deletion: ${productId}`);
                    return res.status(404).json({ success: false, message: "Product not found" });
                }
                
                db.run("DELETE FROM products WHERE id = ?", [productId], (err) => {
                    if (err) {
                        log.err(`${loc} Delete error: ${err.message}`);
                        return res.status(500).json({ success: false, message: err.message });
                    }
                    
                    log.info(`${loc} Product deleted: ${row.name} (ID: ${productId})`);
                    res.json({ 
                        success: true,
                        actions: ["reload_stock", "reload_products"]
                    });
                });
            });
        }
    };

    if (actions[action]) {
        actions[action](data);
    } else {
        log.warn(`${loc} Invalid stock action: ${action}`);
        res.status(400).json({ success: false, message: "Invalid action" });
    }
});

app.post("/users", requireAdmin, (req, res) => {
    const loc = "@/users:";
    log.info(`${loc} User list request by admin: ${req.session.username}`);
    
    db.all(`SELECT * FROM users;`, (err, users) => {
        if (err) {
            log.err(`${loc} User query error: ${err.message}`);
            return res.json({ success: false, message: err.message });
        }

        const live_users = sessionsManager.get_live_users();
        const usersList = users.map(usr => ({
            id: usr.id,
            username: usr.username,
            role: usr.role,
            status: live_users.includes(usr.username)
        }));
        
        log.info(`${loc} Returning ${usersList.length} users`);
        res.json({ 
            success: true, 
            users: usersList,
            actions : ["render_users"]
        });
    });
});

app.post('/update_users', requireAdmin, (req, res) => {
    const loc = "@/update_users:";
    const { action, data } = req.body;
    const username = req.session.username;
    log.info(`${loc} User update by ${username}: ${action}`, data);

    const actions = {
        AddNewUser: (data) => {
            if (!data.username || !data.role) {
                log.warn(`${loc} Invalid AddNewUser request - missing parameters`);
                return res.status(400).json({ success: false, message: "Missing parameters" });
            }
            
            db.run(`INSERT INTO users (username, password, role) VALUES(?, ?, ?)`, 
                [data.username, sha256("0123456789"), data.role], 
                function(err) {
                    if (err) {
                        log.err(`${loc} User insert error: ${err.message}`);
                        return res.status(500).json({ success: false, message: err.message });
                    }
                    
                    log.info(`${loc} New user added: ${data.username} (ID: ${this.lastID})`);
                    res.json({ 
                        success: true, 
                        userId: this.lastID,
                        actions: ["reload_users"]
                    });
                }
            );
        },
        
        RemoveUser: (userId) => {
            db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, row) => {
                if (err) {
                    log.err(`${loc} User query error: ${err.message}`);
                    return res.status(500).json({ success: false, message: err.message });
                }
                
                if (!row) {
                    log.warn(`${loc} User not found for deletion: ${userId}`);
                    return res.status(404).json({ success: false, message: "User not found" });
                }
                
                db.run("DELETE FROM users WHERE id = ?", [userId], (err) => {
                    if (err) {
                        log.err(`${loc} User delete error: ${err.message}`);
                        return res.status(500).json({ success: false, message: err.message });
                    }
                    
                    log.info(`${loc} User deleted: ${row.username} (ID: ${userId})`);
                    res.json({ 
                        success: true,
                        actions: ["reload_users"]
                    });
                });
            });
        }
    };

    if (actions[action]) {
        actions[action](data);
    } else {
        log.warn(`${loc} Invalid user action: ${action}`);
        res.status(400).json({ success: false, message: "Invalid action" });
    }
});

// all users can do this ...
app.post("/change_user_password", requireLogin, (req, res) => {
    const loc = "@/change_user_password:";
    const session_key = req.session.session_key;
    const { data } = req.body;
    const username = req.session.username;
    log.info(`${loc} Password change request for: ${username}`);

    if (!data.oldPassword || !data.newPassword) {
        log.warn(`${loc} Invalid password change request - missing parameters`);
        return res.status(400).json({ success: false, message: "Missing parameters" });
    }

    db.get(`SELECT * FROM users WHERE id = ? AND password = ?`, 
        [req.session.user_id, data.oldPassword], 
        (err, row) => {
            if (err) {
                log.err(`${loc} Password query error: ${err.message}`);
                return res.status(500).json({ success: false, message: err.message });
            }

            if (!row) {
                log.warn(`${loc} Password verification failed for: ${username}`);
                return res.status(403).json({ success: false, message: "Forbidden" });
            }
            
            db.run(`UPDATE users SET password = ? WHERE id = ?`, 
                [data.newPassword, row.id], 
                (err) => {
                    if (err) {
                        log.err(`${loc} Password update error: ${err.message}`);
                        return res.status(500).json({ success: false, message: err.message });
                    }
                    
                    sessionsManager.remove_session(session_key);
                    log.info(`${loc} Password changed for: ${username}`);
                    res.json({
                        success: true, 
                        message: "Password changed successfully",
                        actions: ["logout"]
                    });
                }
            );
        }
    );
});

// ====================== SERVER STARTUP ======================
const loc = "@server:";
app.listen(port, () => {
    log.info(`${loc} POS system running at http://localhost:${port}`);
    log.info(`${loc} Ready to handle requests`);
});

// ====================== SHUTDOWN HANDLING ======================
process.on('uncaughtException', (err) => {
    log.warn(`${loc} Uncaught Exception: ${err.message}`, err.stack);
    // Attempt graceful shutdown
    setTimeout(() => process.exit(1), 1000);
});

process.on('SIGINT', () => {
    log.warn(`${loc} SIGINT received - shutting down`);
    
    logout_all_users();
    db.close();
    log.close();
    log.info(`${loc} Database connection closed`);
    log.info(`${loc} Logger shutdown complete`);
    log.info(`==`.repeat(16));
});

process.on('unhandledRejection', (reason, promise) => {
    log.err(`${loc} Unhandled Rejection at: ${JSON.stringify(promise)}`, reason);
});
