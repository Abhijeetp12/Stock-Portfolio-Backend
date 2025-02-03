import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import bcrypt from "bcrypt";
import pool from "./db.js";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();


console.log("Google Client ID:", process.env.GOOGLE_CLIENT_ID || "Client ID not found");
console.log("Google Client Secret:", process.env.GOOGLE_CLIENT_SECRET || "Client Secret not found");

// Local Strategy
passport.use(
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        // Use MySQL to query the user by email
        const [rows] = await pool.query(
          'SELECT * FROM users WHERE email = ?',
          [email]
        );
        
        const user = rows[0];  // Getting the first user object (if found)
        
        if (!user) {
          return done(null, false, { message: 'User not found' });
        }

        // Compare passwords using bcrypt
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return done(null, false, { message: 'Incorrect password.' });
        }

        // Authentication successful
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// GoogleStrategy for OAuth with Google authentication
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;
          const googleId = profile.id;
          // Check if user already exists in the database using MySQL
          const [rows] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
          );
      console.log(email);
      console.log(googleId);

          if (rows.length === 0) {
            // If no user exists, create a new user (Google login does not require password)
            const uniqueToken = crypto.randomBytes(32).toString("hex");

            const [newUser] = await pool.query(
              'INSERT INTO users (email, password,google_ID) VALUES (?, ?, ?)',
              [email, uniqueToken, googleId] // Using "google" as a password placeholder
            );
            const [createdUser] = await pool.query('SELECT * FROM users WHERE id = ?', [newUser.insertId]);
            return done(null, createdUser[0]); // New user created
          } else {
            // User already exists, log them in
            return done(null, rows[0]);
          }
        } catch (err) {
          return done(err);
        }
      }
    )
  );
} else {
  console.warn('Google strategy is not configured because clientID or clientSecret is missing.');
}

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
    if(rows.length === 0){
      return done(null,false);
    }
    return done(null,rows[0]);
  } catch (err) {
    return done(err,null);
  }
});


