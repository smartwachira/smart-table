import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {upload} from '../middleware/uploadMiddleware.js';
import { getVenueSettings,updateVenueSettings, uploadVenueLogo } from '../controllers/settingsController.js';

const router = express.Router();

router.use(protect); // Protect all settings routes
router.get('/venue', getVenueSettings);
router.put('/venue',updateVenueSettings);
router.post('/venue/logo', upload.single('image'),uploadVenueLogo);

export default router;