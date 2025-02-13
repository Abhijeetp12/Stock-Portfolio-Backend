import express from "express";
import dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcrypt";
import passport from "passport";
import pool from "../Config/db.js";
import "../Config/Passport.js";
import path from "path";

console.log("Resolved Path:", path.resolve("Config/db.js"));


const router=express();
const saltRounds = 10;

router.get('/checkauth', (req, res) => {
  try {
      console.log("Session ID:", req.sessionID);
      console.log("Stored User in Session:", req.user); // Debugging Google login issue
      console.log("Stored Session:", req.session);

      if (req.user) { 
          return res.status(200).json({ isAuthenticated: true, user: req.user });
      } else {
          return res.status(200).json({ isAuthenticated: false });
      }
  } catch (error) {
      console.error("Error checking authentication:", error);
      return res.status(500).json({ message: "Internal server error. Please try again." });
  }
});

router.post("/logout", (req, res, next) => {
  req.logout((err) => {
      if (err) {
          console.error("Logout error:", err);
          return res.status(500).json({ message: "Logout failed. Please try again." });
      }

      req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: "Error clearing session from database." });
        }
        res.clearCookie("connect.sid", { path: "/" });
        return res.status(200).json({ message: "Logged out successfully, session cleared." });
      });
      
  });
});



router.get("/portfolio", async (req, res) => {

  try{
   
  const userId = req.session.user?.id || req.user?.id;
if (!userId) {
  return res.status(401).json({ message: "Unauthorized. Please log in" });
}

    console.log("User ID from session:", req.session.user.id);
    
    const result = await pool.query(
      'SELECT * FROM "Stock_portfolio".user_stocks WHERE user_id=$1',
      [req.session.user.id]
    );
    console.log(result.rows);
    console.log(result.rows.length);
    if (result.rows.length === 0) {
      return res.status(200).json({ message: "No stocks available", stocks: result.rows});
    }
   return res.status(200).json({message:'Success', stocks:result.rows});
  } 
  catch(err){
   console.log('Error fetching: ',err);
   res.status(500).json({message:'Server error, Please try again'});
  }
 
   
});


router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: "Internal server error." });
    }
    if (!user) {
      return res.status(401).json({ message: info.message || "Invalid credentials." });
    }
    req.logIn(user, async (err) => {
      if (err) {
        return res.status(500).json({ message: "Login failed." });
      }
    
      req.session.user = { id: user.id, email: user.email }; // Store user in session
      console.log("🚀 Login Successful. User ID Stored:", req.user.id);
      return res.status(200).json({ message: "Login successful.", user:req.user });
    });
    
  })(req, res, next);
});


router.post("/register", async (req, res) => {
  console.log(req.body);
  const email = req.body.email;
  const password = String(req.body.password);

  try {
    // Check if user already exists
    const checkResult = await pool.query(
      'SELECT * FROM "Stock_portfolio".users WHERE email=$1',
      [email]
    );
    console.log(checkResult);
    if (checkResult.rows.length > 0) {
      return res.status(409).json({ error: "User already registered with this email." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert user into database and return new user ID
    const insertResult = await pool.query(
      'INSERT INTO "Stock_portfolio".users (email,passwords) VALUES ($1,$2) RETURNING id',
      [email, hashedPassword]
    );

    const newUserId = insertResult.rows[0].id;

    // Log in the user after successful registration
    req.login({ id: newUserId, email }, async (err) => {
      if (err) {
        console.error("Error logging in after registration:", err);
        return res.status(500).json({ message: "Registration successful but login failed." });
      }
    
      req.session.user = { id: newUserId, email }; // Store user in session
    
      return res.status(201).json({ message: "Registration and login successful.", userId: newUserId });
    });
    
  } catch (error) {
    console.error("Error registering user:", error);
    return res.status(500).json({ message: "Registration failed", error: error.message });
  }
});


export default router;
