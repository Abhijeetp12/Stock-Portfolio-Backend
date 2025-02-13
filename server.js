import dotenv from "dotenv";
dotenv.config();

import express from "express";
import bodyParser from "body-parser";
import mainRoutes from "./Routes/index.js";
import passport from "passport";
import session from "express-session";
import authRoutes from "./Routes/authRoutes.js";
import stockRoutes from "./Routes/stockRoutes.js";
import pool from "./Config/db.js";
import pgSession from "connect-pg-simple";
import cors from 'cors';
import "./Config/Passport.js";

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,  // Allow requests from the frontend
  methods: 'GET,POST,PUT,DELETE',   // Specify allowed methods (optional)
  allowedHeaders: 'Content-Type,Authorization', // Specify allowed headers (optional)
  credentials: true,  // Allow credentials (cookies, etc.)
}));

const port=process.env.PORT || 3000;

const pgStore = pgSession(session);

console.log(process.env.SESSION_SECRET);
app.use(
  session({
    store: new pgStore({
      pool: pool, // Use your existing PostgreSQL pool
      schemaName: "Stock_portfolio", 
      tableName: "sessions", // Custom table name (default: 'session')
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 ,
      secure: process.env.NODE_ENV === "production", 
      httpOnly:true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    },
  })
);
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.json());

app.use(passport.initialize());
app.use(passport.session());

app.use('/', mainRoutes);
app.use('/auth', authRoutes);
app.use('/portfolio',stockRoutes);

console.log(process.env.PG_PASSWORD);
async function testDatabaseConnection() {
  try {
    const { rows } = await pool.query('SELECT 1');
    console.log('Database connected successfully');
  } catch (err) {
    console.error('Error connecting to the database:', err);
    process.exit(1); // Exit the process if database connection fails
  }
}

testDatabaseConnection();

const result = await pool.query("SHOW search_path");
console.log("Current search path:", result.rows);


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
  
