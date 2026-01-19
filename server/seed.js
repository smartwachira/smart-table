const sequelize = require('./config/db');
const Venue = require('./models/venue');
const MenuCategory = require('./models/MenuCategory');
const MenuItem = require('./models/MenuItem');

// Define associations again to ensure DB schema is created correctly
Venue.hasMany(MenuCategory, { foreignKey: 'venue_id', onDelete: 'CASCADE' });
MenuCategory.belongsTo(Venue, { foreignKey: 'venue_id' });

MenuCategory.hasMany(MenuItem, { foreignKey: 'category_id', onDelete: 'CASCADE' });
MenuItem.belongsTo(MenuCategory, { foreignKey: 'category_id' });

const seedDatabase = async ()=>{

    try {
    // wipe the Db and recreate tables
        await sequelize.sync({force:true});
        console.log('🗑️  Database wiped and recreated.');

        //create venue
        const venue = await Venue.create({
            name: 'Sky Lounge',
            location: "Nairobi, Westlands",
            image_url: "https://example.com/logo.png"
        });
        console.log('✅ Created Venue: ${venue.name}');

        //create category

        const drinksCat = await MenuCategory.create({
            name: 'Drinks',
            venue_id: venue.venue_id
        });


        const mainCat = await MenuCategory.create({
            name:'Main Course',
            venue_id: venue.venue_id

        });
        console.log('✅ Created Categories');

        // Create items for drinks
        await MenuItem.bulkCreate([
            {
                name: 'Cola',
                price: 150.00,
                description: 'ice cold soda',
                category_id: drinksCat.category_id,
                is_available: true
            },
            {
                name: "mineral water",
                price: 100.00,
                description: '500ml bottle',
                category_id: drinksCat.category_id,
                is_available: true
            }
        ]);

        // create items for Main Course
        await MenuItem.bulkCreate([
            {
                name: 'Pepper Steak',
                price: 1200.00,
                description: "Medium rare with pepper sauce",
                category_id: mainCat.category_id,
                is_available: true
            },
            {
                name: 'Masala Fries',
                price: 350.00,
                description: "Spicy fries",
                category_id: mainCat.category_id,
                is_available: true
            }
        ]);
        console.log('✅ Created Menu Items');

        console.log('🌱 Database seeded successfully!');
        process.exit(0); // Exit the script
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);

    }
};

seedDatabase();