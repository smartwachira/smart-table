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
            "PartyB": shortCode //
        }


    }
}