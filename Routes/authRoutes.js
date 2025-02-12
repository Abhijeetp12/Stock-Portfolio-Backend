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
    failureRedirect: "/register", session:true
  }),
  (req, res) => {
    req.session.user = req.user; 
   res.redirect(`${process.env.FRONTEND_URL}/portfolio`);

  }
);


export default router;
