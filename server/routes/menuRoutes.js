import express from 'express';
const router = express.Router();
import * as menuController from '../controllers/menuController.js';

// This defines the URL pattern: /:venueId
// Example: /api/menu/123e4567-e89b-12d3-a456-426614174000
router.get('/:venueId', menuController.getMenu);

export default router;