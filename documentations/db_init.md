# Database Initializer Module

A simple Node.js module for initializing a SQLite database with default data for a Point of Sale (POS) system.

## Features

- Creates a SQLite database with three main tables:
- `users` (for system users)
- `products` (for inventory items)
- `transactions` (for sales records)
- Loads configuration from JSON file or uses built-in defaults
- Automatically creates an admin user with hashed password
- Pre-populates with sample product data
- Safe initialization (won't overwrite existing data)

## Installation

1. Ensure you have Node.js installed
2. Install the required dependencies:
```bash
npm install sqlite3
```

## Usage

```javascript
const DBInitializer = require('./db_initializer');

// Initialize with default settings (creates 'pos.db' and 'data.json')
const dbInitializer = new DBInitializer();

// To specify a different configuration file:
const dbInitializer = new DBInitializer('./custom_config.json');

// When done with the database (optional):
dbInitializer.close();
```

## Configuration

The module will look for a `data.json` file in your project root. If not found, it will create one with these default values:

```json
{
    "sqlite_db_file_name": "pos.db",
    "username": "admin",
    "password": "admin123",
    "products": [
        ["Smartphone X10", "900800700", "Electronics", 599.99, 15, "./tmp/smartphone.jpg"],
        ["Ultrabook Pro", "900800200", "Electronics", 1299.99, 8, "./tmp/ultrabook.jpg"],
        // ... more sample products
    ]
}
```

You can customize:
- Database filename
- Default admin credentials
- Initial product inventory

## Database Schema

### Users Table
- `id`: Auto-incrementing primary key
- `username`: Login username
- `password`: SHA-256 hashed password
- `role`: Defualt is 'cashier'

### Products Table
- `id`: Auto-incrementing primary key
- `name`: Product name
- `batch`: Product batch/reference number
- `category`: Product category
- `price`: Unit price (must be positive)
- `stock`: Current inventory (must be non-negative)
- `imgurl`: Product image path
- `timestamp`: Creation timestamp

### Transactions Table
- `id`: Auto-incrementing primary key
- `user_id`: Reference to user who made the sale
- `total`: Transaction total (must be non-negative)
- `timestamp`: Sale timestamp
- `items`: JSON string of purchased items

## Default Admin Credentials
- Username: `admin`
- Password: `admin123`
- Role: `admin`

## Error Handling
The module will:
- Fall back to default values if the config file is missing or corrupted
- Log errors to console during initialization
- Skip inserting data that already exists

## License
MIT License
