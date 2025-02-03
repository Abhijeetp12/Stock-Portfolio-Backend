import express from "express";
import passport from "passport";

const router= express();



router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/portfolio",
  passport.authenticate("google", {
    failureRedirect: "/register",
  }),
  (req, res) => {
    res.redirect("http://localhost:3001/portfolio"); 
  }
);


export default router;
