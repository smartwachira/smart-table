import { Request, Response } from 'express';
import axios from 'axios';
import Order from '../models/Order.js';
import Venue from '../models/Venue.js';
import crypto from 'crypto';

// ⚡ HELPER: Standardize Paystack's channels into our global database taxonomy
const determinePaymentMethod = (paystackChannel: string): string => {
    if (!paystackChannel) return 'UNKNOWN';
    
    const channelMap: Record<string, string> = {
        'mobile_money': 'MOBILE_MONEY', // Replaces hardcoded M-PESA
        'card': 'CARD',
        'bank': 'BANK_TRANSFER',
        'eft': 'EFT',
        'apple_pay': 'APPLE_PAY',
        'qr': 'QR_CODE',
        'ussd': 'USSD'
    };
    
    return channelMap[paystackChannel.toLowerCase()] || paystackChannel.toUpperCase();
};

// ============================================================================
// 1. CARDS & HOSTED CHECKOUT: Initialize Payment Redirect
// ============================================================================
export const initializePayment = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const { orderId } = req.body;
        const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
        
        if (!paystackSecret) return res.status(500).json({ message: "Gateway misconfigured." });

        const order = await Order.findByPk(orderId, {
            include: [{ model: Venue, attributes: ['venue_id', 'gateway_subaccount_id', 'is_financially_onboarded', 'name'] }]
        });

        if (!order) return res.status(404).json({ message: "Order not found." });
        if (order.payment_status === 'PAID') return res.status(400).json({ message: "Order is already paid." });

        const venue = (order as any).Venue; 
        if (!venue || !venue.is_financially_onboarded) {
            return res.status(400).json({ message: "Venue is not authorized to receive payments." });
        }

        const payload: any = {
            email: "guest@smarttable.app", 
            amount: Math.round(Number(order.total_amount) * 100), 
            currency: 'KES',
            subaccount: venue.gateway_subaccount_id, 
            metadata: {
                custom_fields: [
                    { display_name: "Order ID", variable_name: "order_id", value: orderId }
                ]
            }
        };

        const response = await axios.post('https://api.paystack.co/transaction/initialize', payload, {
            headers: { Authorization: `Bearer ${paystackSecret}`, 'Content-Type': 'application/json' }
        });

        return res.status(200).json({
            access_code: response.data.data.access_code,
            reference: response.data.data.reference
        });

    } catch (error: any) {
        console.error("Paystack Init Error:", error?.response?.data || error.message);
        return res.status(500).json({ message: "Failed to initialize payment." });
    }
};

// ============================================================================
// 2. MOBILE MONEY: Native Push via Charge API (Global Telco Support)
// ============================================================================
export const chargeMobileMoney = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        // ⚡ NEW: We now accept `provider` (e.g., 'mpesa', 'airtel', 'mtn') from the frontend
        const { orderId, phone, provider } = req.body;
        const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
        
        if (!paystackSecret) return res.status(500).json({ message: "Gateway misconfigured." });

        const order = await Order.findByPk(orderId, {
            include: [{ model: Venue, attributes: ['venue_id', 'gateway_subaccount_id', 'is_financially_onboarded', 'name'] }]
        });

        if (!order) return res.status(404).json({ message: "Order not found." });
        if (order.payment_status === 'PAID') return res.status(400).json({ message: "Order is already paid." });

        const venue = (order as any).Venue;
        if (!venue || !venue.is_financially_onboarded) {
            return res.status(400).json({ message: "Venue is not authorized to receive payments." });
        }

        // Format to standard international format (e.g., 2547XXXXXXXX)
        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);

        const payload = {
            email: "guest@smarttable.app", 
            amount: Math.round(Number(order.total_amount) * 100), 
            currency: "KES",
            subaccount: venue.gateway_subaccount_id, 
            mobile_money: {
                phone: formattedPhone,
                provider: provider || "mpesa" // ⚡ DYNAMIC: Defaults to mpesa but accepts any supported telco!
            },
            metadata: {
                custom_fields: [
                    { display_name: "Order ID", variable_name: "order_id", value: orderId }
                ]
            }
        };

        const response = await axios.post('https://api.paystack.co/charge', payload, {
            headers: { Authorization: `Bearer ${paystackSecret}`, 'Content-Type': 'application/json' }
        });

        return res.status(200).json({
            message: "Mobile Money prompt dispatched.",
            reference: response.data.data.reference
        });

    } catch (error: any) {
        console.error("Paystack Charge Error:", error?.response?.data || error.message);
        return res.status(500).json({ message: "Failed to dispatch Mobile Money prompt." });
    }
};

// ============================================================================
// 3. VENUE ONBOARDING: Create Subaccount
// ============================================================================
export const onboardSubaccount = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const venueId = req.user!.venueId;
        const { settlement_bank, account_number } = req.body;

        const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
        if (!paystackSecret) return res.status(500).json({ message: "Gateway misconfigured." });

        const venue = await Venue.findByPk(venueId);
        if (!venue) return res.status(404).json({ message: "Venue not found." });

        const payload = {
            business_name: venue.name,
            settlement_bank: settlement_bank, 
            account_number: account_number,
            percentage_charge: 2.0, // Skim 2% Platform Fee automatically
            description: `SmartTable SaaS Subaccount for ${venue.name}`
        };

        const response = await axios.post('https://api.paystack.co/subaccount', payload, {
            headers: { Authorization: `Bearer ${paystackSecret}`, 'Content-Type': 'application/json' }
        });

        const subaccountCode = response.data.data.subaccount_code;

        // Securely store ONLY non-sensitive compliance data
        venue.gateway_subaccount_id = subaccountCode;
        venue.settlement_bank = settlement_bank;
        venue.account_number_last_4 = account_number.slice(-4);
        venue.is_financially_onboarded = true;
        await venue.save();

        const io = req.app.get('socketio');
        if (io) io.to(`venue:${venueId}`).emit('settings:updated');

        return res.status(200).json({
            message: "Venue successfully onboarded to Payment Gateway.",
            subaccount_id: subaccountCode,
            account_last_4: venue.account_number_last_4
        });

    } catch (error: any) {
        console.error("Paystack Subaccount Error:", error?.response?.data || error.message);
        return res.status(500).json({ message: "Failed to construct Subaccount." });
    }
};

// ============================================================================
// 4. WEBHOOK HANDLER: Catch Global Responses
// ============================================================================
export const paystackWebhookHandler = async (req: Request, res: Response) => {
    try {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        const hash = crypto.createHmac('sha512', secret!).update(JSON.stringify(req.body)).digest('hex');

        if (hash !== req.headers['x-paystack-signature']) {
            return res.status(403).send("Invalid Signature");
        }

        const event = req.body;
        const io = req.app.get('socketio');

        let metadataOrderId = null;
        if (event.data.metadata && event.data.metadata.custom_fields) {
            const orderField = event.data.metadata.custom_fields.find((f: any) => f.variable_name === 'order_id');
            if (orderField) metadataOrderId = orderField.value;
        }

        // ⚡ MAP THE GLOBAL CHANNEL DYNAMICALLY
        const paymentMethod = determinePaymentMethod(event.data.channel);

        // --- SUCCESSFUL PAYMENTS ---
        if (event.event === 'charge.success') {
            const reference = event.data.reference;
            
            let order = await Order.findOne({ where: { gateway_reference: reference } });
            if (!order && metadataOrderId) order = await Order.findByPk(metadataOrderId);

            if (order && order.payment_status !== 'PAID') {
                await order.update({ 
                    payment_status: 'PAID',
                    payment_method: paymentMethod, // Save dynamic channel to DB
                    gateway_reference: reference 
                });

                if (io) {
                    io.to(`order:${order.order_id}`).emit('payment:completed', { orderId: order.order_id, method: paymentMethod });
                    io.to(`venue:${order.venue_id}`).emit('payment:completed', { orderId: order.order_id, method: paymentMethod });
                }
            }
        }

        // --- FAILED PAYMENTS ---
        if (event.event === 'charge.failed') {
            const reference = event.data.reference;
            
            let order = await Order.findOne({ where: { gateway_reference: reference } });
            if (!order && metadataOrderId) order = await Order.findByPk(metadataOrderId);

            if (order) {
                const failureReason = event.data.gateway_response || "Transaction declined";
                
                await order.update({ 
                    payment_status: 'FAILED',
                    status: 'CANCELLED',
                    payment_method: paymentMethod, // Save dynamic channel to DB
                    notes: `Paystack: ${failureReason}`
                });

                if (io) {
                    io.to(`order:${order.order_id}`).emit('payment:failed', { orderId: order.order_id, method: paymentMethod, reason: failureReason });
                    io.to(`venue:${order.venue_id}`).emit('payment:failed', { orderId: order.order_id, method: paymentMethod, reason: failureReason });
                }
            }
        }

        return res.status(200).send("Webhook Processed");

    } catch (error) {
        console.error("❌ Paystack Webhook Error:", error);
        return res.status(500).send("Internal Server Error");
    }
};