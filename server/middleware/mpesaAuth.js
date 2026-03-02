import axios from 'axios';

export const generateMpesaToken = async (req, res, next)=>{
    try {
        const consumerKey = process.env.DARAJA_CONSUMER_KEY;
        const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;
        const environment = process.env.DARAJA_ENVIRONMENT || 'sandbox';

        //1. Daraja requires Base64 encoding of 'key:secret'
        const authString = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

        //2. Set the correct URL based on environment
        const url = environment === 'production'
            ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
            : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';


        //3. Request the Access Token
        const response = await axios.get(url, {
            headers: {
                Authorization: `Basic ${authString}`
            }
        });

        //4. Attach the token to the request on object for the next function to use
        req.mpesaToken = response.data.access_token;

        //Move to the next function (the STK Push controller)
        next();

    } catch (error){
        console.error('Daraja Auth Error:',error?.response?.data || error.message);
        res.status(500).json({
            message: 'Failed to authenticate with safaricom Daraja',
            error: error?.response?.data
        })
    }
}