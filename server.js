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
import cors from 'cors';
import "./Config/Passport.js";

const app = express();

app.use(cors({
  origin: 'http://localhost:3001',  // Allow requests from the frontend
  methods: 'GET,POST,PUT,DELETE',   // Specify allowed methods (optional)
  allowedHeaders: 'Content-Type,Authorization', // Specify allowed headers (optional)
  credentials: true,  // Allow credentials (cookies, etc.)
}));

const port=3000;

console.log(process.env.SESSION_SECRET);
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true, 
      secure: false, 
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 ,
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

console.log(process.env.DB_PASSWORD);

async function testDatabaseConnection() {
  try {
    const [rows] = await pool.execute('SELECT 1');
    console.log('Database connected successfully');
  } catch (err) {
    console.error('Error connecting to the database:', err);
    process.exit(1);  // Exit the process if database connection fails
  }
}

testDatabaseConnection();

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
  