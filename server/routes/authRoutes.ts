import express from "express";
import * as authController from "../controllers/authController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔓 Public Routes
router.post('/register/venue', authController.registerVenue);
router.post('/login/manager', authController.managerLogin);
router.post('/login/staff', authController.staffLogin);
router.post('/guest-session', authController.generateGuestSession);

// 🔒 Protected Routes (Requires a valid JWT + specific role)
// Note: TypeScript enforces that authorize() only accepts valid UserRoles
router.post('/register/staff', protect, authorize('OWNER', 'MANAGER'), authController.registerStaff as any);
router.get('/staff', protect, authorize('OWNER', 'MANAGER'), authController.getStaff as any);
router.patch('/staff/:id/status', protect, authorize('OWNER', 'MANAGER'), authController.toggleStaffStatus as any);
router.patch('/staff/:id/pin', protect, authorize('OWNER', 'MANAGER'), authController.resetStaffPin as any);
router.patch('/staff/:id', protect, authorize('OWNER', 'MANAGER'), authController.updateStaff as any);
router.delete('/staff/:id', protect, authorize('OWNER', 'MANAGER'), authController.deleteStaff as any);

export default router;