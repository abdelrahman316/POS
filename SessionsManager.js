const crypto = require('crypto');
const logger = require("./logger");
const log = new logger();

class SessionManager {
    #sessions = []; // Private sessions array
    #sessionExpireTime = 30 * 60  * 1000; // Default 30 min

    constructor(sessionExpireTime = this.#sessionExpireTime) {
        this.#sessionExpireTime = sessionExpireTime;
        
        // Setup automatic cleanup
        setInterval(() => this.clean_up(), this.#sessionExpireTime);
    }

    // Helper methods
    #compareBuffers(a, b) {
        return Buffer.from(a).equals(Buffer.from(b));
    }

    #generateSessionKey() {
        return crypto.createHash('sha256')
            .update(crypto.randomBytes(64).toString('hex'))
            .digest('hex');
    }

    #findSession(sessionKey) {
        return this.#sessions.find(ses => 
            this.#compareBuffers(ses.session_key, sessionKey)
        );
    }

    #findSessionIndex(sessionKey) {
        return this.#sessions.findIndex(ses => 
            this.#compareBuffers(ses.session_key, sessionKey)
        );
    }

    // Public API
    assign_new_session(user_id, username, user_role) {
        const loc = "@SessionManager.assign_new_session:";
        
        if (!user_id || !username || !user_role) {
            throw new Error(`${loc} Invalid inputs`);
        }

        // Check for existing session
        const existingSession = this.#sessions.find(ses => 
            ses.user_id === user_id || this.#compareBuffers(ses.username, username)
        );

        if (existingSession) {
            log.warn(`${loc} User ${username} is already connected`);
            // return existingSession; // blocking two-sessions for same user
        }

        const newSession = {
            session_key: this.#generateSessionKey(),
            user_id,
            username,
            user_role,
            last_req_time: new Date(),
            cart: [],
            autologin : false , // a flag indecate that a user is reloading the page so they can auto login
        };

        this.#sessions.push(newSession);
        return newSession;
    }

    update_session(session_key, data) {
        const loc = "@SessionManager.update_session:";
        
        if (!session_key) {
            throw new Error(`${loc} Invalid session key`);
        }

        const session = this.#findSession(session_key);
        if (!session) {
            log.err(`${loc} Session not found`);
            return false;
        }

        if (Object(data).hasOwnProperty("username") ) session.username = data.username;
        if (Object(data).hasOwnProperty("id") ) session.user_id = data.id;
        if (Object(data).hasOwnProperty("role") ) session.user_role = data.role;
        if (Object(data).hasOwnProperty("cart") ) session.cart = [...data.cart];
        if (Object(data).hasOwnProperty("autologin") ) session.autologin = data.autologin ;
        
        session.last_req_time = new Date();
        return true;
    }

    update_session_key(old_session_key) {
        const loc = "@SessionManager.update_session_key:";
        
        const session = this.#findSession(old_session_key);
        if (!session) {
            log.err(`${loc} Session not found`);
            return false;
        }

        session.session_key = this.#generateSessionKey();
        session.last_req_time = new Date();
        return session.session_key;
    }

    get_session(session_key) {
        const loc = "@SessionManager.get_session:";
        
        const session = this.#findSession(session_key);
        if (!session) {
            log.err(`${loc} Session not found`);
            return false;
        }

        session.last_req_time = new Date();
        return session;
    }

    get_live_users() {
        const loc = "@SessionManager.get_live_users:";

        let live_users = [];
        this.#sessions.forEach( ses=>{
            live_users.push(ses.username);
        });

        return live_users;
    }

    remove_session(session_key) {
        const loc = "@SessionManager.remove_session:";
        
        const index = this.#findSessionIndex(session_key);
        if (index === -1) {
            log.err(`${loc} Session not found`);
            return false;
        }

        this.#sessions.splice(index, 1);
        return true;
    }

    remove_all_sessions() {
        this.#sessions = [];
        return true;
    }

    update_cart(session_key, action, product) {
        const loc = "@SessionManager.update_cart:";
        
        if (!session_key || !action) {
            throw new Error(`${loc} Invalid inputs`);
        }

        const session = this.#findSession(session_key);
        if (!session) {
            log.err(`${loc} Session not found`);
            return false;
        }

        session.last_req_time = new Date();

        switch (action) {
            case "add_product":
                return this.#addToCart(session, product);
            case "remove_product":
                return this.#removeFromCart(session, product);
            case "reduce_quantity":
                return this.#reduceQuantity(session, product);
            case "empty_cart":
                session.cart = [];
                return true;
            default:
                log.err(`${loc} Unknown action: ${action}`);
                return false;
        }
    }

    clean_up() {
        const now = new Date();
        for ( let i = this.#sessions.length - 1; i >= 0; i--) {
            const session = this.#sessions[i];
            const timeDiff = now - session.last_req_time;
            
            if (timeDiff >= this.#sessionExpireTime || session.autologin == true ) {
                this.#sessions.splice(i, 1);
            }
        }
    }

    print() {
        log.debug("Active Sessions:");
        log.debug(this.#sessions);
    }

    // Cart helper methods
    #addToCart(session, product) {
        const loc = "@SessionManager.#addToCart:";
        const requiredProps = ["name", "price", "id", "quantity", "maxStock"];
        
        const missingProps = requiredProps.filter(prop => !(prop in product));
        if (missingProps.length > 0) {
            log.err(`${loc} Missing properties: ${missingProps.join(', ')}`);
            return false;
        }

        const existingItem = session.cart.find(item => item.id === product.id);
        
        if (existingItem) {
            if (existingItem.quantity >= existingItem.maxStock) {
                return false;
            }
            existingItem.quantity += 1;
            return session.cart;
        }
        
        session.cart.push({ ...product });
        return session.cart;
    }

    #removeFromCart(session, productId) {
        const loc = "@SessionManager.#removeFromCart:";
        
        if (typeof productId !== "number") {
            log.err(`${loc} Invalid product ID`);
            return false;
        }

        const index = session.cart.findIndex(item => item.id === productId);
        if (index === -1) {
            log.err(`${loc} Product not found in cart`);
            return false;
        }

        session.cart.splice(index, 1);
        return session.cart;
    }

    #reduceQuantity(session, productId) {
        const loc = "@SessionManager.#reduceQuantity:";
        
        if (typeof productId !== "number") {
            log.err(`${loc} Invalid product ID`);
            return false;
        }

        const item = session.cart.find(item => item.id === productId);
        if (!item) {
            log.err(`${loc} Product not found in cart`);
            return false;
        }

        if (item.quantity > 1) {
            item.quantity -= 1;
            return session.cart;
        }
        
        // Remove item if quantity becomes zero
        const index = session.cart.findIndex(i => i.id === productId);
        session.cart.splice(index, 1);
        return session.cart;
    }
}

module.exports = SessionManager;