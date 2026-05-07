import { Router } from 'express';
import { initializePayment } from '../controllers/paystackController.js'; // Ensure the .js extension for Node ESM

const router = Router();

/**
 * @route   POST /api/paystack/initialize
 * @desc    Initializes a Paystack transaction and returns the access_code. 
 *          Automatically handles multi-tenant sub-account routing if configured.
 * @access  Public (Guest Checkout) or Protected (Waitstaff)
 */
router.post('/initialize', initializePayment);

// ⚡ PLACEHOLDER FOR NEXT STEP: 
// We will build the webhook controller next. It requires raw body parsing for signature verification.
// router.post('/webhook', paystackWebhookHandler);

export default router;