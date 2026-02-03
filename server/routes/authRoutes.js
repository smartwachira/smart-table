import express from "express";
const router = express.Router();
import * as authController from "../controllers/authController.js";

// POST /api/auth/login
router.post('/login', authController.login );

export default router;
