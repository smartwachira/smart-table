import axios from 'axios';
import { Request, Response, NextFunction } from 'express';

// 🛡️ We extend the base Express Request to include our custom property
export interface MpesaRequest extends Request {
    mpesaToken?: string;
}

export const generateMpesaToken = async (req: MpesaRequest, res: Response, next: NextFunction):Promise<void> =>{
    try {
        const consumerKey = process.env.DARAJA_CONSUMER_KEY as string;
        const consumerSecret = process.env.DARAJA_CONSUMER_SECRET as string;
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

    } catch (error: any){
        console.error('Daraja Auth Error:',error?.response?.data || error.message);
        res.status(500).json({
            message: 'Failed to authenticate with safaricom Daraja',
            error: error?.response?.data
        })
    }
}