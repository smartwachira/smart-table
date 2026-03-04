import express from "express";
const router = express.Router();
import * as authController from "../controllers/authController.js";

// POST /api/auth/login
router.post('/login', authController.login );
router.post('/register/venue',authController.registerVenue);
router.post('/register/staff',authController.registerStaff)

export default router;
