import express from 'express';
import * as orderController from '../controllers/orderControllers.js';
import { protect} from "../middleware/authMiddleware.js" //Middleware
 
const router = express.Router();

// POST /api/orders
//public Routes(Customers)
router.post('/', orderController.createOrder);
//router.get("/:venueId", orderController.getOrders);
router.get("/track/:orderId",orderController.getOrderStatus);
router.get('/:orderId/status',orderController.getOrderStatus);


// Protected Routes (Staff Only)
router.patch("/:orderId/status",protect, orderController.updateOrderStatus);
router.get("/live",protect, orderController.getOrders);




export default router;