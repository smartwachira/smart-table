//This code is the Middleware (the "Bouncer") for your backend.
import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
const JWT_SECRET = process.env.JWT_SECRET || "YOUR_SECRET_KEY";

dotenv.config(); //Ensure env vars are loaded

export const verifyToken = (req, res, next) => {
    try {
        //1. Get the token from the header
        const authHeader = req.header("Authorization");

        //2. Check if token exists
        if (!authHeader) {
            console.log("❌ Middleware: No Authorization header found")
            return res.status(401).json({ message: "No token, authorization denied"});
        }

    
        // 3. Verify the token (Remove "Bearer" if present, through usually handled by client)
        // If header is "Bearer eyJ...", this splits it and takes the second part
        const token = authHeader.startsWith("Bearer ") 
            ? authHeader.slice(7, authHeader.length).trimLeft() 
            : authHeader;
            
        const decoded = jwt.verify(token, JWT_SECRET);

        //4. Add user info to the request object so routes can use it
        req.user = decoded;

        next(); // Allow the request to proceed
    } catch (err) {
        console.error("❌ Middleware Error:", err.message);
        res.status(401).json({ message: 'Token is not valid'});
    }
};