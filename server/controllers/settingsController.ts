import { Request, Response } from 'express';
import Venue from '../models/Venue.js';

interface UpdateSettingsBody {
    name?: string;
    location?: string;
    phone_number?: string;
    tax_rate?: number;
    is_accepting_orders?: boolean;
    allow_cash_payments?: boolean;
    wifi_ssid?: string;
    wifi_password?: string;
    tab_operating_mode?: 'DISABLED' | 'ENABLED_ALL' | 'VIP_ONLY' | string;
    vip_tables?: string[];
}

export const getVenueSettings = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const venueId = req.user!.venueId; 
        // ⚡ FIX: Removed the global exclusion, so gateway_subaccount_id, settlement_bank, etc., are safely exposed to the owner dashboard.
        const venue = await Venue.findByPk(venueId, {
            attributes: { exclude: ['createdAt','updatedAt'] }
        });

        if (!venue) return res.status(404).json({ message: "Venue not found" });
        res.status(200).json(venue);
    } catch (error) {
        console.error("Fetch Settings Error:", error);
        res.status(500).json({ message: "Failed to load settings." });
    }
};

export const updateVenueSettings = async (req: Request<{}, {}, UpdateSettingsBody>, res: Response): Promise<Response | void> => {
    try {
        const venueId = req.user!.venueId;
        const { 
            name, location, phone_number, tax_rate, is_accepting_orders, 
            allow_cash_payments, wifi_ssid, wifi_password,
            tab_operating_mode, vip_tables
        } = req.body;

        const venue = await Venue.findByPk(venueId);
        if (!venue) return res.status(404).json({ message: "Venue not found" });

        // Standard Updates
        venue.name = name || venue.name;
        venue.location = location || venue.location;
        venue.phone_number = phone_number !== undefined ? phone_number : venue.phone_number;
        venue.tax_rate = tax_rate !== undefined ? tax_rate : venue.tax_rate;
        venue.is_accepting_orders = is_accepting_orders !== undefined ? is_accepting_orders : venue.is_accepting_orders;
        venue.allow_cash_payments = allow_cash_payments !== undefined ? allow_cash_payments : venue.allow_cash_payments;
        venue.wifi_ssid = wifi_ssid !== undefined ? wifi_ssid : venue.wifi_ssid;
        venue.wifi_password = wifi_password !== undefined ? wifi_password : venue.wifi_password;

        // Open Tab Updates
        venue.tab_operating_mode = tab_operating_mode !== undefined ? tab_operating_mode : venue.tab_operating_mode;
        
        // ⚡ FIX: Ensure we only save a strictly parsed array to PostgreSQL
        if (Array.isArray(vip_tables)) {
             venue.vip_tables = vip_tables.map(t => String(t).trim()).filter(t => t.length > 0);
        }

        await venue.save();

        const io = req.app.get('socketio');
        if (io) io.to(`venue:${venueId}`).emit('settings:updated');

        res.status(200).json({ message: "Settings updated successfully", venue });
    } catch (error) {
        console.error("Update Settings Error:", error);
        res.status(500).json({ message: 'Failed to update settings.' });
    }
}

export const uploadVenueLogo = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No image file provided." });
        }

        const venueId = req.user!.venueId;
        const venue = await Venue.findByPk(venueId);
        
        if (!venue) return res.status(404).json({ message: "Venue not found" });

        const imageUrl = `/uploads/${req.file.filename}`;
        
        venue.logo_url = imageUrl;
        await venue.save();

        const io = req.app.get('socketio');
        if (io) io.to(`venue:${venueId}`).emit('settings:updated');

        res.status(200).json({ 
            message: "Logo updated successfully", 
            logo_url: imageUrl 
        });
    } catch (error) {
        console.error("Upload Logo Error:", error);
        res.status(500).json({ message: "Failed to upload logo." });
    }
};