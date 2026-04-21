import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { getDashboardOverview } from '../controllers/dashboardController.js';

const router = express.Router();

router.use(protect as any); 
router.use(authorize('OWNER', 'MANAGER') as any);
router.get('/overview', getDashboardOverview as any);

export default router;