import Venue from '../models/Venue.js';

export const getVenueSettings = async (req, res) =>{
    try {
        const venueId = req.user.venueId; //From JWt middleware
        const venue = await Venue.findByPk(venueId, {
            attributes: { exclude: ['createdAt','updatedAt']}
        });

        if (!venue) return res.status(404).json({ message: "Venue not found"});
        res.status(200).json(venue);
    } catch (error){
        console.error("Fetch Settings Error:",error);
        res.status(500).json({ message: "Failed to load settings."});
    }
};

export const updateVenueSettings = async (req, res) =>{
    try {
        const venueId = req.user.venueId;
        const { name, location,phone_number, tax_rate, is_accepting_orders,allow_cash_payments,wifi_ssid,wifi_password} = req.body;

        const venue = await Venue.findByPk(venueId);
        if (!venue) return res.status(404).json({ message: "Venue not found"});

        //Update fields
        venue.name = name || venue.name;
        venue.location = location || venue.location;
        venue.phone_number = phone_number !== undefined ? phone_number: venue.phone_number
        venue.tax_rate = tax_rate !== undefined ? tax_rate: venue.tax_rate
        venue.is_accepting_orders = is_accepting_orders !== undefined ? is_accepting_orders: venue.is_accepting_orders
        venue.allow_cash_payments = allow_cash_payments !== undefined ? allow_cash_payments: venue.allow_cash_payments;
        venue.wifi_ssid = wifi_ssid !== undefined ? wifi_ssid: venue.wifi_ssid
        venue.wifi_password = wifi_password !== undefined ? wifi_password: venue.wifi_password

        await venue.save();

        res.status(200).json({ message: "Settings updated successfully",venue});
    } catch (error){
        console.error("Update Settings Error:",error);
        res.status(500).json({ message: 'Failed to update settings.'})
    }
}

// --- UPLOAD VENUE LOGO ---
export const uploadVenueLogo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No image file provided." });
        }

        const venueId = req.user.venueId;
        const venue = await Venue.findByPk(venueId);
        
        if (!venue) return res.status(404).json({ message: "Venue not found" });

        // Construct the image URL based on your static folder setup
        const imageUrl = `/uploads/${req.file.filename}`;
        
        venue.logo_url = imageUrl;
        await venue.save();

        res.status(200).json({ 
            message: "Logo updated successfully", 
            logo_url: imageUrl 
        });
    } catch (error) {
        console.error("Upload Logo Error:", error);
        res.status(500).json({ message: "Failed to upload logo." });
    }
};