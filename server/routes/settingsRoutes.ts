import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { getVenueSettings, updateVenueSettings, uploadVenueLogo } from '../controllers/settingsController.js';

const router = express.Router();

router.use(protect as any); 
router.get('/venue', getVenueSettings as any);
router.put('/venue', updateVenueSettings as any);
router.post('/venue/logo', upload.single('image'), uploadVenueLogo as any);

export default router;