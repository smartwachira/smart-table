import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getVenueSettings,updateVenueSettings } from '../controllers/settingsController.js';

const router = express.Router();

router.use(protect); // Protect all settings routes
router.get('/venue', getVenueSettings);
router.put('/venue',updateVenueSettings);

export default router;