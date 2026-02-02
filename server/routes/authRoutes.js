import express from "express";
import router from express.Router();
import authControler from "../controllers/authController";

// POST /api/auth/login
router.post('/login', authControler.login );

export default router;
