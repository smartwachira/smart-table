//This code is the Middleware (the "Bouncer") for your backend.
import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
dotenv.config(); //Ensure env vars are loaded
const JWT_SECRET = process.env.JWT_SECRET || "YOUR_SECRET_KEY";

// Authentication (Who are you? Which Venue are you in?)

export const protect = (req, res, next) => {
    try {
        let token;
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith("Bearer")) {
            token = authHeader.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({ message: "Not authorized, no token provided." });
        }

        // Verify token and extract payload
        const decoded = jwt.verify(token, JWT_SECRET);

        // Bind strict context to the request object
        req.user = {
            userId: decoded.userId,
            role: decoded.role,
            name: decoded.name,
            venueId: decoded.venueId // CRITICAL: Implicit Multi-tenant boundary
        };
        next();
    } catch (err) {
        console.error("❌ Auth Middleware Error:", err.message);
        res.status(401).json({ message: 'Not authorized, token failed validation.' });
    }
};

// Authorization (RBAC: Are you allowed to do this?)
export const authorize = (...roles)=>{
    return (req,res,next) =>{
        if(!req.user){
            return res.status(401).json({ message: "User not authenticated."});
        }

        if (!roles.includes(req.user.role)){
            return res.status(403).json({
                message: `Role (${req.user.role} is not authorized to access this resource.)`
            });
        }
        next();
    };
};