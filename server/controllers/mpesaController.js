import axios from 'axios';
import Order from '../models/Order.js';

export const initiateSTK = async (req, res) =>{
    try{
        console.log("🔥 HIT STK PUSH ENDPOINT! Payload:", req.body);
        const { orderId, phone } = req.body;
        

        // 1. Fetch the pre-created order
        const order = await Order.findByPk(orderId);
        if (!order) return res.status(404).json({ message: "Order not found." });
        // 2. Format Phone
        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
        else if (formattedPhone.startsWith('+')) formattedPhone = formattedPhone.slice(1);

        if (formattedPhone.length !== 12) {
            return res.status(400).json({ message: "Invalid Safaricom phone format." });
        }

        //2. Extract Credentials from Environment
        const shortCode = process.env.DARAJA_SHORTCODE;
        const passkey = process.env.DARAJA_PASSKEY;
        const callbackUrl = process.env.DARAJA_CALLBACK_URL;
        const environment = process.env.DARAJA_ENVIRONMENT || 'sandbox';

        //3. Generate Cryptographic Timestamp (Format:YYYYMMDDHHmmss)
        const date = new Date();
        const timestamp = date.getFullYear().toString() +
            ("0" + (date.getMonth() + 1)).slice(-2) +
            ("0" + date.getDate()).slice(-2) +
            ("0" + date.getHours()).slice(-2) +
            ("0" + date.getMinutes()).slice(-2) +
            ("0" + date.getSeconds()).slice(-2);


        //4. Generate password
        const password = Buffer.from(shortCode + passkey + timestamp).toString('base64');

        //5. Select the correct API Endpoint
        const url = environment === 'production'
            ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
            : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';


        const pushAmount = process.env.NODE_ENV === 'production' ? order.total_amount : 1;
        //6. Construct the Strict Daraja Payload
        const payload = {
            "BusinessShortCode": shortCode,
            "Password": password,
            "Timestamp":timestamp,
            "TransactionType": "CustomerPayBillOnline", //Industry standard for testing
            "Amount":pushAmount, //Safaricom strictly rejects decimals
            "PartyA": formattedPhone, // The customer's phone number
            "PartyB": shortCode, //The Paybill/Till number receiving the funds
            "PhoneNumber":formattedPhone,
            "CallBackURL": callbackUrl,
            "AccountReference": `ORD-${orderId.substring(0,5)}`, //Max 12 characters
            "TransactionDesc": `Tab ${order.table_number}`
        };

        //7. Execute the Request
        const response = await axios.post(url, payload,{
            headers: {
                Authorization: `Bearer ${req.mpesaToken}`
            }
        });

        // ⚡ THE CRITICAL FIX: Explicitly log and save the ID
        console.log("📥 Safaricom STK Response:",response.data);

        if (response.data && response.data.CheckoutRequestID){
            order.checkout_request_id = response.data.CheckoutRequestID;
            await order.save();
            console.log(`✅ Order updated with CheckoutRequestID: ${order.checkout_request_id}`)

        } else {
            throw new Error("Safaricom did not return a CheckoutRequestID");
        }
        res.status(200).json({
            message: 'STK Push initiated successfully',
            darajaResponse: response.data
        })


    } catch (error){
        console.log("STK Push Error:", error?.response?.data || error.message);
        res.status(500).json({
            message: "Failed to initiate M-Pesa payment",
            error: error?.response?.data
        })
    }
};

//The M-Pesa Webhook (Callback)
export const mpesaCallBack = async (req, res)=>{
    try {
        console.log("🔔 Safaricom Webhook Triggered!");

        //1. Extract the callback data
        const callbackData = req.body?.Body?.stkCallback;
        if (!callbackData){
            console.error("❌ Malformed payload received from Safaricom");
            return res.status(200).send("Acknowledged");// Always return 200 so they stop retrying
        }
        const checkoutRequestId = callbackData.CheckoutRequestID;
        const resultCode = callbackData.ResultCode; // a number indicating success(0)and failure
        const resultDesc = callbackData.ResultDesc;

        // 2. Locate the exact order in PostgreSQl
        const order = await Order.findOne({ where: {checkout_request_id:checkoutRequestId}});

        if (!order){
            console.error("🚨 CRITICAL: Received webhook for untracked CheckoutRequestID!");
            return res.status(200).json({ ResultCode: 0,ResultDesc: 'Accepted'});
        }

        // 3. Process the Result Code

        if (resultCode === 0){
            // ✅ SCENARIO A: SUCCESSFUL PAYMENT
            console.log("✅ Payment Successful!");


            // Extract the precise receipt number from Safaricom's metadata array
            const callbackMetadata = callbackData.CallbackMetadata?.Item || [];
            const receiptObj = callbackMetadata.find(item=> item.Name === 'MpesaReceiptNumber');
            const receiptNumber = receiptObj ? receiptObj.Value : 'UNKNOWN_RECEIPT';

            // Extract Amount Paid (THIS FIXES YOUR ERROR)
            const amountObj = callbackMetadata.find(item => item.Name === 'Amount');
            const amountPaid = amountObj ? amountObj.Value : order.total_amount;
            
            //Update Database
            order.payment_status = 'PAID';
            order.mpesa_receipt = receiptNumber;
            await order.save();

            console.log(`📝 Order ${order.order_id} marked as PAID. Receipt: ${receiptNumber} for KES ${amountPaid}`);

            //⚡REAL-TIME ALERT: Fire to the Kitchen Terminal
            const io = req.app.get('socketio'); // Matches the global pack in your index.js
            if (io){
                io.to(order.venue_id).emit('orderUpdated',{
                    message: `New Paid Order: Table ${order.table_number} (${order.customer_name})`,
                    orderId: order.order_id,
                    status: 'PAID'
                });
            }
            
        } else {
            // ❌ SCENARIO B: PAYMENT FAILED OR CANCELLED
            // Map Safaricom's vague codes to operational realities
            let failureReason = "Payment Failed";

            switch (resultCode){
                case 1032:
                    failureReason = "Cancelled by Customer";
                    break;
                case 1037:
                    failureReason = "Timeout (Customer didn't enter PIN)";
                    break;
                case 1:
                    failureReason = "Insufficient Funds";
                    break;
                default:
                    failureReason = resultDesc;
            }

            console.log(`⚠️ Payment Failed: ${failureReason}`);

            //Update Database: Mark as failed and auto-cancel the order so the kitchen ignores it
            order.payment_status = 'FAILED';
            order.status = 'CANCELLED';
            order.notes = failureReason;

            await order.save();

            console.log(`🗑️ Order ${order.order_id} auto-cancelled due to payment failure.`)
        }

        //4. Always acknowledge Safaricom gracefully
        res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted"});
    } catch (error){
        console.error("🔥 M-Pesa Webhook Execution Error:", error);
        // Even on our internal errors, tell Safaricom 200 OK so they don't DDOS us with retries
        res.status(200).send("Acknowledged with internal errors");
    }
};

