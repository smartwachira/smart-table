import express from 'express';
import { generateMpesaToken } from '../middleware/mpesaAuth.js';
import { initiateSTK, mpesaCallBack } from '../controllers/mpesaController.js';

const router = express.Router();


//POST /api/mpesa/stkpush
//The request must pass through generate MpesaToken b4 it hits initiateSTKPush
router.post('/stkpush', generateMpesaToken, initiateSTK);
router.post('/callback',mpesaCallBack);
export default router;