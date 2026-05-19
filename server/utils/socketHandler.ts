import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "YOUR_SECRET_KEY";

export const initializeSockets = (io: Server) => {
    
    // ============================================================================
    // 🛡️ 1. AUTHENTICATION MIDDLEWARE
    // ============================================================================
    io.use((socket, next) => {
        // The React frontend will pass tokens here during the initial connection handshake
        const { token, guest_token } = socket.handshake.auth;

        try {
            // A. Authenticate Staff / Managers
            if (token) {
                const decoded = jwt.verify(token, JWT_SECRET) as any;
                // Securely attach the identity to the socket session
                socket.data = { type: 'STAFF', venueId: decoded.venueId, userId: decoded.userId, role: decoded.role };
                return next();
            }
            
            // B. Authenticate Guests
            if (guest_token) {
                const decoded = jwt.verify(guest_token, JWT_SECRET) as any;
                // Securely attach the guest identity and table context
                socket.data = { type: 'GUEST', venueId: decoded.venueId, tableName: decoded.tableName };
                return next();
            }

            // C. Reject unauthenticated connections instantly
            return next(new Error('Authentication error: No tokens provided'));
        } catch (err) {
            return next(new Error('Authentication error: Invalid or expired token'));
        }
    });

    // ============================================================================
    // 🔌 2. CONNECTION & ROOM ROUTING
    // ============================================================================
    io.on('connection', (socket: Socket) => {
        console.log(`⚡ Socket Connected [${socket.id}] | Type: ${socket.data.type}`);

        const { type, venueId } = socket.data;

        // ⚡ AUTO-JOIN: The server strictly dictates room assignment based on the JWT
        socket.join(`venue:${venueId}`);
        
        if (type === 'STAFF') {
            console.log(`🛡️ Staff joined -> venue:${venueId}`);
        } else if (type === 'GUEST') {
            console.log(`📱 Guest (Table ${socket.data.tableName}) joined -> venue:${venueId}`);
        }

        // ⚡ EXPLICIT JOIN: Guests checking out will request to join their specific order room
        socket.on('join_order_room', (orderId: string) => {
            // In the future, we can add validation here to ensure this guest owns this order
            socket.join(`order:${orderId}`);
            console.log(`📡 Socket [${socket.id}] joined -> order:${orderId}`);
        });

        socket.on('disconnect', () => {
            console.log(`🔥 Socket Disconnected [${socket.id}]`);
        });
    });
};