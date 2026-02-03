import express from 'express';
import * as orderController from '../controllers/orderControllers.js';
import { verifyToken} from "../middleware/authMiddleware.js" //Middleware
 
const router = express.Router();

// POST /api/orders
//public Routes(Customers)
router.post('/', orderController.createOrder);
router.get("/:venueId", orderController.getOrders);
router.get("/track/:orderId",orderController.getOrderStatus);

// Protected Routes (Staff Only)
router.patch("/:orderId/status",verifyToken, orderController.updateOrderStatus);


export default router;