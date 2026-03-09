import express, { Router } from "express";
const router = express.Router();
import * as authController from "../controllers/authController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

// POST /api/auth/login

//Public Routes

router.post('/register/venue',authController.registerVenue);
router.post('/login/manager',authController.managerLogin)
router.post('/login/staff',authController.staffLogin);


// Protected Routes (Requires a valid JWT + specific role)
router.post('/register/staff', protect, authorize('OWNER', 'MANAGER'), authController.registerStaff);
router.get('/staff',protect,authController.getStaff);

export default router;
