import pkg from 'pg';
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

// Set up PostgreSQL connection using environment variables
const pool = new Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  port: 5432,
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
});

(async () => {
  try {
    await pool.query('SET search_path to "Stock_portfolio"'); // Set the schema explicitly
    console.log("Database schema set successfully");
  } catch (err) {
    console.error("Error setting schema:", err);
  }
})();

export default pool;
