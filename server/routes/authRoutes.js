import express from "express";
const router = express.Router();
import * as authControler from "../controllers/authController.js";

// POST /api/auth/login
router.post('/login', authControler.login );

export default router;
