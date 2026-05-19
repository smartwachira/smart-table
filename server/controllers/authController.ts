import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User, { UserRole } from "../models/User.js";
import Venue from '../models/Venue.js';
import sequelize from "../config/db.js";

const JWT_SECRET = process.env.JWT_SECRET || "YOUR_SECRET_KEY";

const generateToken = (user: User): string => {
    return jwt.sign(
        { 
            userId: user.user_id,
            role: user.role,
            venueId: user.venue_id,
            name: user.username
        },
        JWT_SECRET,
        { expiresIn: '1d' }
    );
};

// 🛡️ Explicitly define ALL incoming payload structures for strict validation
interface GuestSessionBody {
    venueId: string;
    tableName: string;
    mode: 'k' | 't';
}

interface StaffLoginBody {
    venue_id: string;
    username: string;
    pin: string;
}

interface ManagerLoginBody {
    email: string;
    password: string;
}

interface RegisterVenueBody {
    venueName: string;
    location: string;
    managerName: string;
    managerEmail: string;
    managerPassword: string;
}

interface RegisterStaffBody {
    username: string;
    pin?: string;
    role: UserRole;
    email?: string;
    password?: string;
}

interface UpdateStaffBody {
    username?: string;
    role?: UserRole;
    email?: string;
    password?: string;
    pin?: string;
    is_active?: boolean;
}

// 1. VENUE ONBOARDING (Creates Venue + Master Owner)
export const registerVenue = async (req: Request<{}, {}, RegisterVenueBody>, res: Response): Promise<Response | void> => {
    const t = await sequelize.transaction();

    try {
        const { venueName, location, managerName, managerEmail, managerPassword } = req.body;

        const existingUser = await User.findOne({
            where: { email: managerEmail }
        });
        
        if (existingUser) {
            await t.rollback();
            return res.status(400).json({ message: "Email is already registered." });
        }

        const newVenue = await Venue.create({
            name: venueName,
            location: location,
            contact_email: managerEmail,
            tax_rate: 0,
            shift_duration_hours: 14,
            is_accepting_orders: true,
            allow_cash_payments: true
        }, { transaction: t });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(managerPassword, salt);

        const newOwner = await User.create({
            username: managerName,
            email: managerEmail,
            password: hashedPassword,
            role: 'OWNER',
            venue_id: newVenue.venue_id,
            is_active: true
        }, { transaction: t });

        await t.commit();

        res.status(201).json({
            message: "Venue and Manager account created successfully!",
            token: generateToken(newOwner),
            user: { 
                name: newOwner.username,
                role: newOwner.role,
                venue_id: newOwner.venue_id
            }
        });
    } catch (error) {
        await t.rollback();
        console.error("Venue Registration Error:", error);
        res.status(500).json({ message: "Failed to register venue." });
    }
};

// 2. STAFF PROVISIONING (Strictly Manager/Owner Execution)
export const registerStaff = async (req: Request<{}, {}, RegisterStaffBody>, res: Response): Promise<Response | void> => {
    try {
        // req.user is guaranteed by our protect middleware
        const managerVenueId = req.user!.venueId;
        const creatorRole = req.user!.role;
        const { username, pin, role, email, password } = req.body;

        // ⚡ FIX 1: Allow CASHIER and OWNER roles through the gateway
        if (!['KITCHEN_STAFF', 'WAITER', 'CASHIER', 'MANAGER', 'OWNER'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role assignment.' });
        }

        // ⚡ FIX 2: HIERARCHY SAFEGUARD: Only Owners can hire Managers OR Co-Owners
        if (['MANAGER', 'OWNER'].includes(role) && creatorRole !== 'OWNER') {
            return res.status(403).json({ message: 'Only the Venue Owner can provision Dashboard access roles.' });
        }

        const newUserObj: any = { 
            username, 
            role, 
            venue_id: managerVenueId,
            is_active: true
        };

        // ⚡ FIX 3: Group OWNER and MANAGER together as Dashboard users needing Emails/Passwords
        if (['MANAGER', 'OWNER'].includes(role)) {
            if (!email || !password) return res.status(400).json({ message: 'Email and Password are required for Dashboard roles.' });

            const existingEmail = await User.findOne({ where: { email, venue_id: managerVenueId } });
            if (existingEmail) return res.status(400).json({ message: 'Email is already registered.' });
            
            const salt = await bcrypt.genSalt(10);
            newUserObj.email = email;
            newUserObj.password = await bcrypt.hash(password, salt);

        } else {
            // Floor Staff (WAITER, CASHIER, KITCHEN_STAFF) expecting a 4-digit PIN
            const existingStaff = await User.findOne({ where: { username, venue_id: managerVenueId } });
            if (existingStaff) return res.status(400).json({ message: "Username already exists at this venue." });
            
            if (!pin || pin.length !== 4) return res.status(400).json({ message: 'A 4-digit PIN is required for floor staff.' });

            const salt = await bcrypt.genSalt(10);
            newUserObj.pin = await bcrypt.hash(pin, salt);
        }

        await User.create(newUserObj);
        
        res.status(201).json({
            message: `${role.replace('_', ' ')} account provisioned successfully.`
        });

    } catch (error) {
        console.error("Staff Registration Error:", error);
        res.status(500).json({ message: "Failed to register staff." });
    }
};

// 3. WEB DASHBOARD LOGIN (Owners & Managers)
export const managerLogin = async (req: Request<{}, {}, ManagerLoginBody>, res: Response): Promise<Response | void> => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user || !user.password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        user.last_login = new Date();
        await user.save();

        res.json({
            message: 'Login successful',
            token: generateToken(user),
            user: {
                name: user.username,
                role: user.role,
                venue_id: user.venue_id
            }
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: "Server error" });
    }
};

// 4. KDS MOBILE LOGIN (Touch-friendly PIN for Staff)
export const staffLogin = async (req: Request<{}, {}, StaffLoginBody>, res: Response): Promise<Response | void> => {
    try {
        const { venue_id, username, pin } = req.body; 

        const user = await User.findOne({ where: { venue_id, username } });
        if (!user || !user.pin) return res.status(401).json({ message: 'Invalid credentials' });

        if (!user.is_active) {
            return res.status(403).json({ message: 'Account is suspended. Contact your manager.' });
        }

        const isMatch = await bcrypt.compare(pin, user.pin);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        user.last_login = new Date();
        await user.save();

        res.json({
            message: 'Login successful',
            token: generateToken(user),
            user: {
                username: user.username,
                role: user.role,
                venue_id: user.venue_id
            }
        });

    } catch (error) {
        console.error("Staff Login Error:", error);
        res.status(500).json({ message: "Failed to Login staff." });
    }
};

// 5. GET STAFF
export const getStaff = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const managerVenueId = req.user!.venueId;

        const staffList = await User.findAll({
            where: { venue_id: managerVenueId },
            attributes: ['user_id', 'username', 'email', 'role', 'is_active', 'last_login', 'created_at'],
            order: [['role', 'ASC'], ['created_at', 'DESC']]
        });

        res.status(200).json(staffList);
    } catch (error) {
        console.error("Fetch Staff Error:", error);
        res.status(500).json({ message: "Failed to retrieve staff roster." });
    }
};

// 6. UPDATE STAFF STATUS (Manager Only)
export const toggleStaffStatus = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const managerVenueId = req.user!.venueId;
        const executingUserId = req.user!.userId; 
        
        const targetId = req.params.id || req.params.staffId;       
        const { is_active } = req.body;       

        if (!targetId) {
            return res.status(400).json({ message: "Critical Error: No user ID reached the controller." });
        }

        const staff = await User.findOne({ 
            where: { user_id: targetId, venue_id: managerVenueId } 
        });
        
        if (!staff) {
            return res.status(404).json({ message: 'Staff member not found.' });
        }

        if (staff.user_id === executingUserId) {
            return res.status(403).json({ message: 'You cannot suspend your own account.' });
        }
        if (staff.role.toUpperCase() === 'OWNER') {
            return res.status(403).json({ message: 'The Master Owner account cannot be suspended.' });
        }

        const [updatedRows] = await User.update(
            { is_active: is_active },
            { where: { user_id: targetId, venue_id: managerVenueId } }
        );

        if (updatedRows === 0) {
            return res.status(500).json({ message: "Database received the command but failed to modify the row." });
        }

        res.status(200).json({ 
            message: `Staff member is now ${is_active ? 'Active' : 'Suspended'}`,
            is_active: is_active
        });

    } catch (error) {
        console.error("Toggle Status Error:", error);
        res.status(500).json({ message: "Failed to update staff status." });
    }
};

// 7. UPDATE STAFF DETAILS
export const updateStaff = async (req: Request<{id: string}, {}, UpdateStaffBody>, res: Response): Promise<Response | void> => {
    try {
        const { id } = req.params;
        const { username, role, email, password, pin } = req.body;
        const venueId = req.user!.venueId;

        const staffMember = await User.findOne({ where: { user_id: id, venue_id: venueId } });
        if (!staffMember) return res.status(404).json({ message: 'Staff member not found.' });

        if (staffMember.role === 'OWNER' && req.user!.role !== 'OWNER') {
            return res.status(403).json({ message: 'Unauthorized. Only Owners can edit Owners.' });
        }

        const isCurrentlyManager = ['MANAGER', 'OWNER'].includes(staffMember.role);
        const isBecomingManager = role ? ['MANAGER', 'OWNER'].includes(role) : isCurrentlyManager;

        // Handle Promotion
        if (!isCurrentlyManager && isBecomingManager) {
            if (!email || !password) return res.status(400).json({ message: 'Email and password are required for Dashboard access.' });

            const emailExists = await User.findOne({ where: { email } });
            if (emailExists) return res.status(400).json({ message: 'Email already in use.' });

            staffMember.email = email;
            const salt = await bcrypt.genSalt(10);
            staffMember.password = await bcrypt.hash(password, salt);
            staffMember.pin = null;
        }
        
        // Handle Demotion
        if (isCurrentlyManager && !isBecomingManager) {
            if (!pin || pin.length !== 4) return res.status(400).json({ message: 'A 4-digit PIN is required for POS/KDS access.' });

            staffMember.pin = pin;
            staffMember.email = null;
            staffMember.password = null; 
        }

        // Handle Same-Role Updates
        if (isCurrentlyManager && isBecomingManager) {
            if (email && email !== staffMember.email) {
                const emailExists = await User.findOne({ where: { email } });
                if (emailExists && emailExists.user_id !== id) return res.status(400).json({ message: 'Email already in use.' });
                staffMember.email = email;
            }
            if (password) { 
                const salt = await bcrypt.genSalt(10);
                staffMember.password = await bcrypt.hash(password, salt);
            }
        }

        staffMember.username = username || staffMember.username;
        if (role) staffMember.role = role;

        await staffMember.save();
        res.status(200).json({ message: 'Staff updated successfully.', user: staffMember });
    } catch (error) {
        console.error('Error updating staff:', error);
        res.status(500).json({ message: 'Server error updating staff.' });
    }
};

// 8. DELETE STAFF
export const deleteStaff = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const { id } = req.params;
        const venueId = req.user!.venueId;

        if (id === req.user!.userId) {
            return res.status(400).json({ message: 'You cannot delete your own account.' });
        }

        const staffMember = await User.findOne({ where: { user_id: id, venue_id: venueId } });
        if (!staffMember) return res.status(404).json({ message: 'Staff member not found.' });

        if (staffMember.role === 'OWNER' && req.user!.role !== 'OWNER') {
            return res.status(403).json({ message: 'Unauthorized. You cannot delete an Owner account.' });
        }

        await staffMember.destroy();
        res.status(200).json({ message: 'Staff member deleted permanently.' });
    } catch (error) {
        console.error('Error deleting staff:', error);
        res.status(500).json({ message: 'Server error deleting staff.' });
    }
};

// 9. RESET ACCESS PIN
export const resetStaffPin = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const { id } = req.params;
        const { pin } = req.body;
        const venueId = req.user!.venueId;

        if (!pin || pin.length !== 4) return res.status(400).json({ message: "A valid 4-digit PIN is required." });

        const staffMember = await User.findOne({ where: { user_id: id, venue_id: venueId } });
        if (!staffMember) return res.status(404).json({ message: "Staff member not found." });

        if (['MANAGER', 'OWNER'].includes(staffMember.role)) {
            return res.status(400).json({ message: 'Managers and Owners use Passwords, not PINs.' });
        }

        const salt = await bcrypt.genSalt(10);
        staffMember.pin = await bcrypt.hash(pin, salt); 
        
        await staffMember.save();

        res.status(200).json({ message: 'Access PIN reset successfully.', newPin: pin });
    } catch (error) {
        console.error('Error resetting PIN:', error);
        res.status(500).json({ message: 'Server error resetting PIN.' });
    }
};

// 10. GENERATE GUEST SESSION FROM QR SCAN
export const generateGuestSession = async (req: Request<{}, {}, GuestSessionBody>, res: Response): Promise<Response | void> => {
    try {
        const { venueId, tableName, mode } = req.body;

        if (!venueId || !tableName) {
            return res.status(400).json({ message: "Invalid QR Code payload." });
        }

        const venue = await Venue.findByPk(venueId);
        if (!venue) {
            return res.status(404).json({ message: "Venue not found." });
        }

        const guestPayload = {
            role: 'GUEST',
            venueId: venueId,
            tableName: tableName,
            orderMode: mode === 'k' ? 'KIOSK' : 'TAB', 
            sessionStart: new Date().getTime()
        };

        const guestToken = jwt.sign(
            guestPayload, 
            process.env.JWT_SECRET || "YOUR_SECRET_KEY", 
            { expiresIn: '4h' }
        );

        res.status(200).json({
            message: "Guest session initialized.",
            token: guestToken,
            venueName: venue.name
        });

    } catch (error) {
        console.error("Guest Session Error:", error);
        res.status(500).json({ message: "Failed to initialize ordering session." });
    }
};