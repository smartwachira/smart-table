import axios from 'axios';

export const initiateSTK = async (req, res) =>{
    try{
        //1. Extract Data from Frontend Request
        const {phone, amount, orderId} = req.body;

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


        //6. Construct the Strict Daraja Payload
        const payload = {
            "BusinessShortCode": shortCode,
            "Password": password,
            "Timestamp":timestamp,
            "TransactionType": "CustomerPayBillOnline", //Industry standard for testing
            "Amount": Math.ceil(amount), //Safaricom strictly rejects decimals
            "PartyA": phone, // The customer's phone number
            "PartyB": shortCode, //The Paybill/Till number receiving the funds
            "PhoneNumber":phone,
            "CallBackURL": callbackUrl,
            "AccountReference": `ORD-${orderId.substring(0,5)}`, //Max 12 characters
            "TransactionDesc": "SmartTable Order Payment"
        };

        //7. Execute the Request
        const response = await axios.post(url, payload,{
            headers: {
                Authorization: `Bearer ${req.mpesaToken}`
            }
        });

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
        const callbackData = req.body.Body.stkCallback;
        const resultCode = callbackData.ResultCode; // a number indicating success(0)and failure
        const merchantRequestID = callbackData.MerchantRequestID;

        //Safaricom expects a quick response acknowledging receipt, otherwise the keep retrying.
        res.status(200).json({ ResultCode: 0, ResultDesc: 'Callback Received Successfully'});

        //2. Check if the transaction failed (e.g user cancelled, insufficient funds)
        if (resultCode !== 0){
            console.log(`❌ M-Pesa Payment Failed: ${callbackData.ResultDesc}`)
            //You could update your DB here to mark the order as "failed", but for MVP we just log it.
            return;
        }

        //3. Payment Success! Extract thee Receipt Number and Amount
        const meta = callbackData.CallbackMetadata.Item;
        const receiptNumber = meta.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
        const amountPaid = meta.find(item => item.Name === 'Amount')?.Value;

        console.log(`✅ Payment Success! Receipt: ${receiptNumber} for KES ${amountPaid}`);
        // 4. In a production system, you would:
        // A. Look up the Order in your database using a tracking ID linked to MerchantRequestID.
        // B. Update the Order status from 'pending' to 'preparing'.
        // C. Fire a WebSocket event to the Kitchen Display System.
        
        // Example logic (if we had saved MerchantRequestID during the STK Push):
        /*
        const order = await Order.findOne({ where: { mpesa_request_id: merchantRequestID } });
        if (order) {
            order.status = 'preparing'; // Send it to the kitchen!
            await order.save();
            
            const io = req.app.get('socketio');
            if (io) {
                // Notify the specific customer's tracking page
                io.emit(`order_status_${order.order_id}`, { status: 'preparing' });
                // Notify the kitchen
                io.to(order.venue_id).emit('refresh_kds'); 
            }
        }
        */


    } catch (error){
        console.error("Callback Error.", error.message);
        // Do not return a 500 to Safaricom unless you want them to infinitely retry the webhook
    }
};

