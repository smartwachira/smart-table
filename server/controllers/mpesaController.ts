import { Request, Response } from 'express';
import axios from 'axios';
import Order from '../models/Order.js'; 
import { MpesaRequest } from '../middleware/mpesaAuth.js';

interface StkPushRequestBody {
    orderId: string;
    phone: string;
}

export const initiateSTK = async (req: MpesaRequest, res: Response): Promise<Response | void> => {
    try {
        const { orderId, phone } = req.body as StkPushRequestBody;
        
        const order = await Order.findByPk(orderId);
        if (!order) return res.status(404).json({ message: "Order not found." });

        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
        else if (formattedPhone.startsWith('+')) formattedPhone = formattedPhone.slice(1);

        if (formattedPhone.length !== 12) {
            return res.status(400).json({ message: "Invalid Safaricom phone format." });
        }

        const shortCode = process.env.MPESA_SHORTCODE as string; 
        const passkey = process.env.MPESA_PASSKEY as string;
        const callbackUrl = `${process.env.PUBLIC_API_URL}/api/mpesa/webhook`; 
        const environment = process.env.DARAJA_ENVIRONMENT || 'sandbox';

        const date = new Date();
        const timestamp = date.getFullYear().toString() +
            (date.getMonth() + 1).toString().padStart(2, '0') +
            date.getDate().toString().padStart(2, '0') +
            date.getHours().toString().padStart(2, '0') +
            date.getMinutes().toString().padStart(2, '0') +
            date.getSeconds().toString().padStart(2, '0');

        const password = Buffer.from(shortCode + passkey + timestamp).toString('base64');
        const amount = Math.round(Number(order.total_amount));

        const url = environment === 'production'
            ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
            : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

        const response = await axios.post(url, {
            BusinessShortCode: shortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: formattedPhone,
            PartyB: shortCode,
            PhoneNumber: formattedPhone,
            CallBackURL: callbackUrl,
            AccountReference: `Table ${order.table_number}`,
            TransactionDesc: `SmartTable Order`
        }, {
            headers: { Authorization: `Bearer ${req.mpesaToken}` }
        });

        order.checkout_request_id = response.data.CheckoutRequestID;
        await order.save();

        return res.status(200).json({ message: "STK Push sent to customer.", data: response.data });

    } catch (error: any) {
        console.error("🔥 STK Push Error:", error?.response?.data || error.message);
        return res.status(500).json({ message: "Failed to initiate M-Pesa payment." });
    }
};

export const mpesaCallBack = async (req: Request, res: Response): Promise<void> => {
    try {
        // ⚡ Safely extract payload to prevent "Cannot read properties of undefined" 500 errors
        const stkCallback = req.body?.Body?.stkCallback;
        if (!stkCallback) {
            console.warn("⚠️ Invalid M-Pesa Webhook Payload Received");
            res.status(200).send("Acknowledged");
            return;
        }

        const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

        const order = await Order.findOne({ where: { checkout_request_id: CheckoutRequestID } });
        
        if (!order) {
            console.warn(`⚠️ M-Pesa Callback received for unknown order: ${CheckoutRequestID}`);
            res.status(200).send("Acknowledged");
            return;
        }

        // ⚡ Safely grab the socket instance regardless of what it was named in index.ts
        const io = req.app.get('socketio') || req.app.get('io'); 

        // ⚡ Cast ResultCode to Number to ensure string "1032" doesn't bypass the switch statement
        if (Number(ResultCode) === 0) {
            
            const items = CallbackMetadata?.Item || [];
            const receiptItem = items.find((item: any) => item.Name === 'MpesaReceiptNumber');
            const receiptNumber = receiptItem ? String(receiptItem.Value) : 'UNKNOWN';

            // ⚡ Use .update() and strictly enforce UPPERCASE statuses
            await order.update({
                payment_status: 'PAID',
                status: 'PENDING', 
                mpesa_receipt: receiptNumber
            });

            if(io) {
                io.to(`order_${order.order_id}`).emit('payment_success', { orderId: order.order_id, method: 'MPESA' });
            }
            
        } else {
            
            let failureReason = "Payment Failed";
            switch (Number(ResultCode)) {
                case 1032: failureReason = "Cancelled by Customer"; break;
                case 1037: failureReason = "Timeout (Customer didn't enter PIN)"; break;
                case 1: failureReason = "Insufficient Funds"; break;
                default: failureReason = ResultDesc || "Failed";
            }

            // ⚡ Use .update() and strictly enforce UPPERCASE statuses
            await order.update({
                payment_status: 'FAILED',
                status: 'CANCELLED',
                notes: failureReason
            });

            if(io) {
                io.to(`order_${order.order_id}`).emit('payment_failed', {
                    orderId: order.order_id,
                    method: 'MPESA',
                    reason: failureReason
                });
            }
        }

        res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (error) {
        console.error("🔥 M-Pesa Webhook Execution Error:", error);
        res.status(200).send("Acknowledged with internal errors");
    }
};