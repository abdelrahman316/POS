const fs = require('fs');
const sqlite3 = require('sqlite3');
const crypto = require('crypto');

class db_initializer {
    constructor(jsonFileName = './data.json') {
        this.BASEDATA_FILENAME = jsonFileName;
        this.DEFAULT_DATA = this.getDefaultData(); // to use if loading the json file data failed
        this.basedata = this.initializeBaseData();
        this.db = new sqlite3.Database(this.basedata.sqlite_db_file_name);
        this.initializeDatabase();
    }

    getDefaultData() {
        return {
            sqlite_db_file_name: 'pos.db',
            username: 'admin',
            password: 'admin123',
            products: [
                ['Smartphone X10', '900800700', 'Electronics', 599.99, 15, './tmp/smartphone.jpg'],
                ['Ultrabook Pro', '900800200', 'Electronics', 1299.99, 8, './tmp/ultrabook.jpg'],
                ['Wireless Headphones', '900800077', 'Electronics', 149.99, 22, './tmp/bluetooth_headphones.jpg'],
                ['Premium Coffee', '100987324', 'Groceries', 12.99, 42, './tmp/coffee.gif'],
                ['Bestseller Novel', '200345670', 'Books', 24.99, 17, './tmp/novel.jpg'],
                ['Cotton T-Shirt', '400234587', 'Clothing', 19.99, 36, './tmp/tshirt.jpg'],
                ['Running Shoes', '400937512', 'Clothing', 89.99, 14, './tmp/running_shoes.jpg'],
                ['Bluetooth Speaker', '900700322', 'Electronics', 79.99, 25, './tmp/bluetooth_speaker.jpg']
            ]
        };
    }

    initializeBaseData() {
        try {
            if (!fs.existsSync(this.BASEDATA_FILENAME)) {
                fs.writeFileSync(this.BASEDATA_FILENAME, JSON.stringify(this.DEFAULT_DATA, null, 2));
                return this.DEFAULT_DATA;
            }else{
                const rawData = fs.readFileSync(this.BASEDATA_FILENAME, 'utf8');
                return JSON.parse(rawData);
            }

        } catch (err) {
            console.error('Data initialization error:', err);
            return this.DEFAULT_DATA;
        }
    }

    initializeDatabase() {

        // Create tables 
        this.db.serialize(() => {
            this.db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'cashier'
            )`);

            this.db.run(`CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                batch TEXT NOT NULL ,
                category TEXT NOT NULL,
                price REAL NOT NULL CHECK(price > 0),
                stock INTEGER NOT NULL DEFAULT 10 CHECK(stock >= 0),
                imgurl TEXT NOT NULL DEFAULT './public/tmp/notfound.jpg',
                timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )`);

            this.db.run(`CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
                total REAL NOT NULL CHECK(total >= 0),
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                items TEXT NOT NULL
            )`);

            // Initialize 1st User and demo products
            this.initAdminUser();
            this.initProducts();
        });
    }

    initAdminUser() {
        this.db.get("SELECT COUNT(*) AS count FROM users WHERE username = 'admin'", (err, row) => {
            if (err) return console.error(err.message);
            if (row.count === 0) {
                const hashedPassword = crypto.createHash('sha256')
                    .update(this.basedata.password)
                    .digest('hex');
                
                this.db.run(
                    "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
                    [this.basedata.username, hashedPassword, 'admin']
                );
            }
        });
    }

    initProducts() {
        this.db.get("SELECT COUNT(*) AS count FROM products", (err, row) => {
            if (err) return console.error(err.message);
            if (row.count === 0) {
                const stmt = this.db.prepare(
                    "INSERT INTO products (name, batch, category, price, stock, imgurl) VALUES (?, ?, ?, ?, ?, ?)"
                );
                
                this.basedata.products.forEach(product => {
                    stmt.run(...product, (err) => {
                        if (err) console.error('Product insert error:', product, err);
                    });
                });
                
                stmt.finalize();
            }
        });
    }

    // ================= DISCONNECT THE DB =================

    close() {
        this.db.close();
    }
}

module.exports = db_initializer;