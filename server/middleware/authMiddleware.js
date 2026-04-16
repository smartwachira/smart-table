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
            userId: decoded.userId || decoded.id,
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
                message: `Role (${req.user.role}) is not authorized to access this resource.`
            });
        }
        next();
    };
};

// GUEST PROTECTION MIDDLEWARE
export const protectGuest = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // Verify the token signature
            const decoded = jwt.verify(token, JWT_SECRET);

            // Ensure this is actually a Guest token
            if (decoded.role !== 'GUEST') {
                return res.status(403).json({ message: 'Not authorized as a guest.' });
            }

            // Attach the verified guest data directly to the request!
            req.guest = {
                venueId: decoded.venueId,
                tableName: decoded.tableName,
                orderMode: decoded.orderMode
            };

            next();
        } catch (error) {
            console.error("Guest Auth Error:", error.message);
            res.status(401).json({ message: 'Session expired or invalid. Please rescan the QR code.' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no session found.' });
    }
};

// ⚡ NEW: UNIVERSAL PROTECTION MIDDLEWARE (For Polymorphic Routes)
// This lets BOTH Staff and Guests through, appropriately tagging them.
export const protectUniversal = (req, res, next) => {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer')) {
        token = authHeader.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.role === 'GUEST') {
            // It's a Customer! Attach to req.guest
            req.guest = {
                venueId: decoded.venueId,
                tableName: decoded.tableName,
                orderMode: decoded.orderMode
            };
        } else {
            // It's a Staff Member! Attach to req.user
            req.user = {
                userId: decoded.userId || decoded.id,
                role: decoded.role,
                name: decoded.name,
                venueId: decoded.venueId 
            };
        }

        next();
    } catch (error) {
        console.error("Universal Auth Error:", error.message);
        res.status(401).json({ message: 'Session expired or invalid token.' });
    }
};