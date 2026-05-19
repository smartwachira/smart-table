import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
    initializePayment, 
    chargeMobileMoney, 
    onboardSubaccount, 
    paystackWebhookHandler 
} from '../controllers/paystackController.js'; 

const router = Router();

// ⚡ GUEST/STAFF CHECKOUT ROUTES
router.post('/initialize', initializePayment);        // Card Payments
router.post('/charge-mobile-money', chargeMobileMoney); // M-Pesa STK Push

// ⚡ DASHBOARD ONBOARDING ROUTES
router.post('/onboard-subaccount', protect, onboardSubaccount); // Secure Venue Setup

// ⚡ PAYSTACK WEBHOOK
router.post('/webhook', paystackWebhookHandler);

export default router;