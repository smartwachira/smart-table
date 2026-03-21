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
        const { name, location,phone_number, tax_rate, is_accepting_orders,allow_cash_payments} = req.body;

        const venue = await Venue.findByPk(venueId);
        if (!venue) return res.status(404).json({ message: "Venue not found"});

        //Update fields
        venue.name = name || venue.name;
        venue.location = location || venue.location;
        venue.phone_number = phone_number !== undefined ? phone_number: venue.phone_number
        venue.tax_rate = tax_rate !== undefined ? tax_rate: venue.tax_rate
        venue.is_accepting_orders = is_accepting_orders !== undefined ? is_accepting_orders: venue.is_accepting_orders
        venue.allow_cash_payments = allow_cash_payments !== undefined ? allow_cash_payments: venue.allow_cash_payments;

        await venue.save();

        res.status(200).json({ message: "Settings updated successfully",venue});
    } catch (error){
        console.error("Update Settings Error:",error);
        res.status(500).json({ message: 'Failed to update settings.'})
    }
}