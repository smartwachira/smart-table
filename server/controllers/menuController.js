const Venue = require('../models/Venue');
const MenuCategory = require('../models/MenuCategory');
const MenuItem = require('../models/MenuItem');
const { v4: uuidv4 } = require('uuid'); 
// usage: uuidv4()
// This function sits between user's request(req),
// processes  it, and sends back the final result(res)
exports.getMenu = async (req, res) => {
    try {
        const { venueId } = req.params;

        //Validate UUID format BEFORE hitting the DB
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    
        if (!uuidRegex.test(venueId)) {
        return res.status(400).json({ message: 'Invalid Venue ID format' });
        }

        // "findOne" finds the first match
        // "include" tells Sequelize to perform a JOIN (connect tables).
        const menu = await Venue.findOne({
            where: {venue_id: venueId},
            include: [
                {
                    model: MenuCategory,
                    include: [
                        {
                            model: MenuItem,
                            where: {is_available: true},
                            required: false

                        }
                    ]
                }
            ]
        });

        if (!menu) {
            return res.status(404).json({message: 'Venue not found'});
        }

        res.json (menu);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error'});
    }
};