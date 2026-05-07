import { Request, Response } from 'express';
import axios from 'axios';
import Order from '../models/Order.js';
import Venue from '../models/Venue.js';

// Define the shape of the Paystack API response
interface PaystackInitializeResponse {
    status: boolean;
    message: string;
    data: {
        authorization_url: string;
        access_code: string;
        reference: string;
    };
}

export const initializePayment = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const { orderId } = req.body;
        
        // Ensure the environment variable is set
        const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
        if (!paystackSecret) {
            console.error("CRITICAL: PAYSTACK_SECRET_KEY is missing from .env");
            return res.status(500).json({ message: "Payment gateway misconfigured." });
        }

        // 1. Retrieve the full Order and associated Venue details
        const order = await Order.findByPk(orderId, {
            include: [{ model: Venue, attributes: ['venue_id', 'gateway_subaccount_id', 'name'] }]
        });

        if (!order) return res.status(404).json({ message: "Order not found." });
        if (order.payment_status === 'PAID') return res.status(400).json({ message: "Order is already paid." });

        const venue = (order as any).Venue; // Cast for TS inference
        if (!venue) return res.status(500).json({ message: "Order is not associated with a valid venue." });

        // 2. The Floating Point Rule: Convert KES to cents (multiply by 100)
        const amountInCents = Math.round(Number(order.total_amount) * 100);

        // 3. Construct the Paystack Payload
        const payload: any = {
            email: "guest@smarttable.com", // Paystack requires an email. Defaulting for anonymous guests.
            amount: amountInCents,
            currency: "KES",
            metadata: {
                order_id: order.order_id,
                venue_id: venue.venue_id,
                guest_session_id: order.guest_session_id
            }
        };

        // ⚡ SAAS ROUTING: If the venue has a connected subaccount, trigger the split!
        if (venue.gateway_subaccount_id) {
            payload.subaccount = venue.gateway_subaccount_id;
            
            // Define SmartTable's platform fee dynamically.
            // Example: 2% platform fee. (Paystack calculates this based on the total amount).
            // We use 'flat' or 'percentage'. Paystack handles the math.
            const platformFeePercentage = 0.02; 
            const smartTableCutInCents = Math.round(amountInCents * platformFeePercentage);
            
            // Tell Paystack we are charging a transaction fee on top of their processing fee
            payload.transaction_charge = smartTableCutInCents;
            // The merchant bears the Paystack processing charges (standard practice)
            payload.bearer = "subaccount"; 
        }

        // 4. Server-to-Server API Call to Paystack
        const response = await axios.post<PaystackInitializeResponse>(
            'https://api.paystack.co/transaction/initialize',
            payload,
            {
                headers: {
                    Authorization: `Bearer ${paystackSecret}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const responseData = response.data;

        if (!responseData.status) {
            throw new Error(responseData.message || "Failed to initialize Paystack session.");
        }

        // 5. Store the unique reference in our database for Webhook reconciliation later
        await order.update({ gateway_reference: responseData.data.reference });

        // 6. Return the crucial access_code to the React frontend
        return res.status(200).json({
            access_code: responseData.data.access_code,
            reference: responseData.data.reference,
            authorization_url: responseData.data.authorization_url // Provide as a fallback if Drop-in fails
        });

    } catch (error: any) {
        console.error("❌ Paystack Initialization Error:", error.response?.data || error.message);
        return res.status(500).json({ message: "Failed to initialize payment gateway.", error: error.message });
    }
};