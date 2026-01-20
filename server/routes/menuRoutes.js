const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');

// This defines the URL pattern: /:venueId
// Example: /api/menu/123e4567-e89b-12d3-a456-426614174000
router.get('/:venueId', menuController.getMenu);

module.exports = router;