import dotenv from "dotenv";
dotenv.config();

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import bcrypt from "bcrypt";
import pool from "./db.js";

import crypto from "crypto";




console.log("Outside GoogleStrategy - GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);

// Local Strategy
passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      
      try {
        // Query the user from PostgreSQL
        console.log("🔍 Checking login for:", email);
        const result = await pool.query('SELECT * FROM "Stock_portfolio".users WHERE email= $1',[email]);

        const user = result.rows[0]; // Get the first user object (if found)

        if (!user) {
          console.warn("⚠️ No user found with this email.");
          return done(null, false, { message: "User not found" });
        }

        // Compare passwords using bcrypt
        const isValidPassword = await bcrypt.compare(password, user.passwords);
        if (!isValidPassword) {
          console.warn("⚠️ Incorrect password.");
          return done(null, false, { message: "Incorrect password." });
        }
        console.log("✅ User authenticated:", user.id);
        // Authentication successful
        return done(null, user);
      } catch (err) {
        console.error("❌ Error in LocalStrategy:", err);
        return done(err);
      }
    }
  )
);


passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      console.log("Google Client ID inside:", process.env.GOOGLE_CLIENT_ID || "Client ID not found");
      console.log("Google Client Secret:", process.env.GOOGLE_CLIENT_SECRET || "Client Secret not found");
      
      try {
        const email = profile.emails[0].value;
        const googleId = profile.id;

        console.log(email);
        console.log(googleId);

        // Check if the user already exists
        const existingUser = await pool.query(
          'SELECT * FROM "Stock_portfolio".users WHERE email=$1',
      
          [email]
        );

        if (existingUser.rows.length > 0) {
          // User exists, log them in
          return done(null, existingUser.rows[0]);
        } else {
          // Generate a random placeholder password for Google login
          const uniqueToken = crypto.randomBytes(32).toString("hex");

          // Insert new user into PostgreSQL
          const newUser = await pool.query(
            'INSERT INTO "Stock_portfolio".users ( email, passwords, google_id) VALUES($1, $2, $3) RETURNING *',
            [email, uniqueToken, googleId]
          )

          return done(null, newUser.rows[0]); // Return the newly created user
        }
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Serialize user
passport.serializeUser((user, done) => {
  console.log("✅ Serializing User:", user.id); // Debug log
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  console.log("🔥 Running deserializeUser with ID:", id); // Debugging log

  try {
    const { rows } = await pool.query('SELECT * FROM "Stock_portfolio".users WHERE id = $1', [id]);
    if (rows.length === 0) {
      return done(null, false);
    }
    return done(null, rows[0]); // Store minimal user data in session
  } catch (err) {
    return done(err, null);
  }
});




