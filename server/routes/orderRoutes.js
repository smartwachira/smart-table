const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderControllers');

// POST /api/orders
router.post('/', orderController.createOrder);
router.get("/:venueId", orderController.getOrders);
router.put("/:orderId/status", orderController.updateOrderStatus);

module.exports = router;