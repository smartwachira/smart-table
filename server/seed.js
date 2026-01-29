const sequelize = require('./config/db');
const Venue = require('./models/Venue'); // Ensure this matches your filename (Venue.js vs venue.js)
const MenuCategory = require('./models/MenuCategory');
const MenuItem = require('./models/MenuItem');
const Order = require('./models/Order');
const OrderItem = require('./models/OrderItem');

// Define associations to ensure DB schema is created correctly during sync
Venue.hasMany(MenuCategory, { foreignKey: 'venue_id', onDelete: 'CASCADE' });
MenuCategory.belongsTo(Venue, { foreignKey: 'venue_id' });

MenuCategory.hasMany(MenuItem, { foreignKey: 'category_id', onDelete: 'CASCADE' });
MenuItem.belongsTo(MenuCategory, { foreignKey: 'category_id' });

Venue.hasMany(Order, { foreignKey: 'venue_id' });
Order.belongsTo(Venue, { foreignKey: 'venue_id' });

Order.hasMany(OrderItem, { foreignKey: 'order_id' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });

MenuItem.hasMany(OrderItem, { foreignKey: 'item_id' });
OrderItem.belongsTo(MenuItem, { foreignKey: 'item_id' });

const seedDatabase = async () => {
  try {
    // 1. Wipe DB and Recreate Tables
    await sequelize.sync({ force: true });
    console.log('🗑️  Database wiped and recreated.');

    // 2. Create Venue
    const venue = await Venue.create({
      name: 'Sky Lounge',
      location: "Nairobi, Westlands",
      image_url: "https://example.com/logo.png"
    });
    console.log(`✅ Created Venue: ${venue.name}`);

    // 3. Create Categories
    const drinksCat = await MenuCategory.create({
      name: 'Drinks',
      venue_id: venue.venue_id
    });

    const mainCat = await MenuCategory.create({
      name: 'Main Course',
      venue_id: venue.venue_id
    });
    console.log('✅ Created Categories');

    // 4. Create Menu Items
    // We capture the created items in variables so we can order them later
    const [cola, water] = await MenuItem.bulkCreate([
      {
        name: 'Cola',
        price: 150.00,
        description: 'Ice cold soda',
        category_id: drinksCat.category_id,
        is_available: true
      },
      {
        name: "Mineral Water",
        price: 100.00,
        description: '500ml bottle',
        category_id: drinksCat.category_id,
        is_available: true
      }
    ], { returning: true }); // 'returning: true' gives us back the IDs

    const [steak, fries] = await MenuItem.bulkCreate([
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
    ], { returning: true });
    console.log('✅ Created Menu Items');

    // 5. Create a Sample Order (For Kitchen Testing)
    const sampleOrder = await Order.create({
      venue_id: venue.venue_id,
      table_number: "5",
      customer_name: "John Doe", // Testing the new column!
      total_amount: 500.00, // (150 + 350)
      payment_method: "M-Pesa",
      status: "pending"
    });

    // 6. Add Items to that Order (1 Cola, 1 Fries)
    await OrderItem.bulkCreate([
      {
        order_id: sampleOrder.order_id,
        item_id: cola.item_id,
        quantity: 1,
        price_at_time: 150.00
      },
      {
        order_id: sampleOrder.order_id,
        item_id: fries.item_id,
        quantity: 1,
        price_at_time: 350.00
      }
    ]);
    console.log('✅ Created Sample Order for "John Doe"');

    console.log('🌱 Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();