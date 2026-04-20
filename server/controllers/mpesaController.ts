import { Request, Response } from 'express';
import axios from 'axios';
import Order from '../models/Order.js'; // Keep the .js extension for NodeNext
import { MpesaRequest } from '../middleware/mpesaAuth.js';

// 🛡️ Strict typing for the expected frontend payload
interface StkPushRequestBody {
    orderId: string;
    phone: string;
}

// 🛡️ Strict typing for Safaricom's deeply nested Webhook payload
interface MpesaCallbackItem {
    Name: string;
    Value?: string | number;
}

interface MpesaCallbackPayload {
    Body: {
        stkCallback: {
            MerchantRequestID: string;
            CheckoutRequestID: string;
            ResultCode: number;
            ResultDesc: string;
            CallbackMetadata?: {
                Item: MpesaCallbackItem[];
            };
        };
    };
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

        const shortCode = process.env.DARAJA_SHORTCODE as string;
        const passkey = process.env.DARAJA_PASSKEY as string;
        const callbackUrl = process.env.DARAJA_CALLBACK_URL as string;
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
            headers: {
                Authorization: `Bearer ${req.mpesaToken}`
            }
        });

        // Save the CheckoutRequestID to match it during the callback later
        order.checkout_request_id = response.data.CheckoutRequestID;
        await order.save();

        return res.status(200).json({ message: "STK Push sent to customer.", data: response.data });

    } catch (error: any) {
        console.error("🔥 STK Push Error:", error?.response?.data || error.message);
        return res.status(500).json({ message: "Failed to initiate M-Pesa payment." });
    }
};

// 🛡️ Note how we inject MpesaCallbackPayload directly into the Express Request generic
export const mpesaCallBack = async (req: Request<{}, {}, MpesaCallbackPayload>, res: Response): Promise<void> => {
    try {
        const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = req.body.Body.stkCallback;

        const order = await Order.findOne({ where: { checkout_request_id: CheckoutRequestID } });
        
        if (!order) {
            console.log(`⚠️ M-Pesa Callback received for unknown order: ${CheckoutRequestID}`);
            res.status(200).send("Acknowledged");
            return;
        }

        if (ResultCode === 0) {
            // SUCCESS
            const items = CallbackMetadata?.Item || [];
            const receiptItem = items.find((item) => item.Name === 'MpesaReceiptNumber');
            const receiptNumber = receiptItem ? String(receiptItem.Value) : 'UNKNOWN';

            order.payment_status = 'PAID';
            order.status = 'pending'; // Moves from unpaid to pending kitchen queue
            order.mpesa_receipt = receiptNumber;
            await order.save();

            // Emit Socket event to kitchen here...
            
        } else {
            // FAILURE
            let failureReason = "Payment Failed";
            
            switch (ResultCode) {
                case 1032: failureReason = "Cancelled by Customer"; break;
                case 1037: failureReason = "Timeout (Customer didn't enter PIN)"; break;
                case 1: failureReason = "Insufficient Funds"; break;
                default: failureReason = ResultDesc;
            }

            order.payment_status = 'FAILED';
            order.status = 'cancelled';
            order.notes = failureReason;
            await order.save();
        }

        res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (error) {
        console.error("🔥 M-Pesa Webhook Execution Error:", error);
        res.status(200).send("Acknowledged with internal errors");
    }
};