import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Create connection pool
const db = mysql.createPool(dbConfig);

// Test connection
const testConnection = async () => {
    try {
        const connection = await db.getConnection();
        console.log("Connected to MySQL database successfully!");
        connection.release();
        
    } catch (error) {
        console.error("Database connection failed:", error.message);
        process.exit(1);
    }
};

testConnection();

export default db;