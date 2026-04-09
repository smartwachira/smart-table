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
router.patch('/staff/:id/status', protect, authorize('OWNER', 'MANAGER'), authController.toggleStaffStatus);

// 2. PIN reset must be SECOND
router.patch('/staff/:id/pin', protect, authorize('OWNER', 'MANAGER'), authController.resetStaffPin);

// 3. General update must be LAST
router.patch('/staff/:id', protect, authorize('OWNER', 'MANAGER'), authController.updateStaff);
router.delete('/staff/:id', protect, authorize('OWNER', 'MANAGER'), authController.deleteStaff);
export default router;
