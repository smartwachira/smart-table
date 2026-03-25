import express from 'express';
import {protect,authorize} from '../middleware/authMiddleware.js';
import { getDashboardOverview } from '../controllers/dashboardController.js';

const router = express.Router();

router.use(protect); // Protect routes
router.use(authorize);
router.get('/overview',getDashboardOverview);

export default router;