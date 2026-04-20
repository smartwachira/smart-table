import { Request, Response, NextFunction } from 'express';
import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
import { UserRole } from '../models/User.js';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "YOUR_SECRET_KEY";

// 🛡️ Enterprise Pattern: Declaration Merging
// This permanently teaches TypeScript that EVERY Express request might have these properties.
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                role: UserRole;
                name: string;
                venueId: string;
            };
            guest?: {
                venueId: string;
                tableName: string;
                orderMode: string;
            };
        }
    }
}

// 🛡️ Define the exact shape of our JWT Payload
interface JwtPayload {
    userId?: string;
    id?: string;
    role: UserRole | 'GUEST';
    name?: string;
    venueId: string;
    tableName?: string;
    orderMode?: string;
}

export const protect = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;
        let token;

        if (authHeader && authHeader.startsWith("Bearer")) {
            token = authHeader.split(" ")[1];
        }

        if (!token) {
            res.status(401).json({ message: "Not authorized, no token provided." });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

        if (decoded.role === 'GUEST') {
            res.status(403).json({ message: "Guests cannot access staff endpoints." });
            return;
        }

        req.user = {
            userId: decoded.userId || decoded.id as string,
            role: decoded.role as UserRole,
            name: decoded.name || 'Staff',
            venueId: decoded.venueId
        };
        
        next();
    } catch (err: any) {
        console.error("❌ Auth Middleware Error:", err.message);
        res.status(401).json({ message: 'Not authorized, token failed validation.' });
    }
};

export const authorize = (...roles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ message: `Role (${req.user?.role}) is not authorized to access this route.` });
            return;
        }
        next();
    };
};

export const protectUniversal = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    let token;

    if (authHeader && authHeader.startsWith('Bearer')) {
        token = authHeader.split(' ')[1];
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token provided.' });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

        if (decoded.role === 'GUEST') {
            req.guest = {
                venueId: decoded.venueId,
                tableName: decoded.tableName as string,
                orderMode: decoded.orderMode as string
            };
        } else {
            req.user = {
                userId: decoded.userId || decoded.id as string,
                role: decoded.role as UserRole,
                name: decoded.name || 'Staff',
                venueId: decoded.venueId 
            };
        }

        next();
    } catch (err) {
        res.status(401).json({ message: 'Not authorized, token failed or expired. Please rescan the QR code.' });
    }
};