import { Request, Response } from 'express';
import axios from 'axios';
import Order from '../models/Order.js';
import Venue from '../models/Venue.js';
import crypto from 'crypto';

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
        
        const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
        if (!paystackSecret) {
            console.error("CRITICAL: PAYSTACK_SECRET_KEY is missing from .env");
            return res.status(500).json({ message: "Payment gateway misconfigured." });
        }

        const order = await Order.findByPk(orderId, {
            include: [{ model: Venue, attributes: ['venue_id', 'gateway_subaccount_id', 'name'] }]
        });

        if (!order) return res.status(404).json({ message: "Order not found." });
        if (order.payment_status === 'PAID') return res.status(400).json({ message: "Order is already paid." });

        const venue = (order as any).Venue; 
        if (!venue) return res.status(500).json({ message: "Order is not associated with a valid venue." });

        const amountInCents = Math.round(Number(order.total_amount) * 100);

        const payload: any = {
            email: "guest@smarttable.com", 
            amount: amountInCents,
            currency: "KES",
            metadata: {
                order_id: order.order_id,
                venue_id: venue.venue_id,
                guest_session_id: order.guest_session_id
            }
        };

        if (venue.gateway_subaccount_id) {
            payload.subaccount = venue.gateway_subaccount_id;
            const platformFeePercentage = 0.02; 
            const smartTableCutInCents = Math.round(amountInCents * platformFeePercentage);
            payload.transaction_charge = smartTableCutInCents;
            payload.bearer = "subaccount"; 
        }

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

        await order.update({ gateway_reference: responseData.data.reference });

        return res.status(200).json({
            access_code: responseData.data.access_code,
            reference: responseData.data.reference,
            authorization_url: responseData.data.authorization_url 
        });

    } catch (error: any) {
        console.error("❌ Paystack Initialization Error:", error.response?.data || error.message);
        return res.status(500).json({ message: "Failed to initialize payment gateway.", error: error.message });
    }
};

export const paystackWebhookHandler = async (req: Request, res: Response): Promise<Response | void> => {
    
    try {
        const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
        if (!paystackSecret) {
            console.error("CRITICAL: PAYSTACK_SECRET_KEY missing.");
            return res.status(500).send("Misconfigured Server");
        }

        const hash = crypto.createHmac('sha512', paystackSecret)
                           .update(JSON.stringify(req.body))
                           .digest('hex');

        if (hash !== req.headers['x-paystack-signature']) {
            console.warn("⚠️ UNAUTHORIZED WEBHOOK ATTEMPT: Invalid Signature");
            return res.status(401).send("Unauthorized");
        }

        const event = req.body;

        console.log("RAW METADATA DUMP:", JSON.stringify(event.data.metadata, null, 2));
        
        const io = req.app.get('io') || req.app.get('socketio'); // Safely grab socket

        if (event.event === 'charge.success') {
            const reference = event.data.reference;
            const metadataOrderId = event.data.metadata?.order_id; 

            let order = await Order.findOne({ where: { gateway_reference: reference } });

            if (!order && metadataOrderId) {
                console.log(`⚠️ Reference lookup failed. Recovering order via Metadata ID: ${metadataOrderId}`);
                order = await Order.findByPk(metadataOrderId);
            }

            if (order) {
                try {
                    // ⚡ FIX: Strictly enforce UPPERCASE statuses to match M-Pesa and Frontend
                    await order.update({ 
                        payment_status: 'PAID',
                        status: 'PENDING' 
                    });

                    console.log(`✅ Order ${order.order_id} marked as PAID via Paystack Webhook.`);

                    if (io) {
                        io.to(`order_${order.order_id}`).emit('payment_success', { 
                            orderId: order.order_id, 
                            method: 'CARD' 
                        });
                    }
                } catch (dbError) {
                    console.error("🔥 FAILED TO SAVE PAYSTACK SUCCESS TO DATABASE:", dbError);
                }
            } else {
                console.warn(`⚠️ Webhook matched no order for reference: ${reference}`);
            }
        } 
        else if (event.event === 'charge.failed') {
            const reference = event.data.reference;
            const metadataOrderId = event.data.metadata?.order_id; 

            let order = await Order.findOne({ where: { gateway_reference: reference } });

            if (!order && metadataOrderId) {
                order = await Order.findByPk(metadataOrderId);
            }

            if (order) {
                const failureReason = event.data.gateway_response || "Card declined";
                
                try {
                    // ⚡ FIX: Strictly enforce UPPERCASE statuses
                    await order.update({ 
                        payment_status: 'FAILED',
                        status: 'CANCELLED',
                        notes: failureReason
                    });

                    console.log(`❌ Order ${order.order_id} marked as FAILED via Paystack Webhook.`);

                    if (io) {
                        io.to(`order_${order.order_id}`).emit('payment_failed', { 
                            orderId: order.order_id, 
                            method: 'CARD',
                            reason: failureReason
                        });
                    }
                } catch (dbError) {
                    console.error("🔥 FAILED TO SAVE PAYSTACK FAILURE TO DATABASE:", dbError);
                }
            }
        }

        // Always return 200 OK so Paystack knows you received it and stops retrying
        return res.status(200).send("Webhook Received");

    } catch (error) {
        console.error("❌ Paystack Webhook Error:", error);
        return res.status(500).send("Internal Server Error");
    }
};