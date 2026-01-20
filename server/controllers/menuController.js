const Venue = require('../models/venue');
const MenuCategory = require('../models/MenuCategory');
const MenuItem = require('../models/MenuItem');

exports.getMenu = async (req, res) => {
    try {
        const { venueId } = req.params;

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