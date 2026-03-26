import { Op } from 'sequelize';
import sequelize from './config/db.js';
import Venue from './models/Venue.js';
import MenuItem from './models/MenuItem.js';
import Order from './models/Order.js';
import OrderItem from './models/OrderItem.js';

// Utility to generate a random number within a range
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Utility to pick a random element from an array
const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Realistic Name Generators
const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson'];

const seedRealVenueDay = async () => {
    try {
        await sequelize.authenticate();
        console.log("🔌 Database connected. Initializing Real Venue Simulation...");

        // 1. Fetch constraints
        const venue = await Venue.findOne();
        if (!venue) throw new Error("No Venue found! Please create a venue first.");
        
        const menuItems = await MenuItem.findAll({ where: { is_available: true } });
        if (menuItems.length < 3) throw new Error("Not enough MenuItems found! Seed your menu first.");

        const paymentMethods = ['MPESA', 'MPESA', 'CASH', 'CARD']; // Weighted towards MPESA
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        const generatedOrders = [];
        const generatedOrderItems = [];

        // 2. Generate 40 realistic orders for today
        for (let i = 0; i < 40; i++) {
            // Simulate Rush Hours
            const hour = Math.random() > 0.6 
                ? randomPick([12, 13, 18, 19, 20]) 
                : randomInt(10, 22);               
            
            const minute = randomInt(0, 59);
            
            const orderDate = new Date(today);
            orderDate.setHours(hour, minute, randomInt(0, 59));

            const isNow = orderDate > new Date(Date.now() - 30 * 60000); 
            const status = isNow ? randomPick(['PENDING', 'PREPARING', 'READY']) : 'COMPLETED';

            const prepTimeMinutes = randomInt(8, 25);
            const updatedDate = new Date(orderDate.getTime() + (prepTimeMinutes * 60000));

            const orderId = crypto.randomUUID(); 
            
            // ⚡ THE FIX: Generate a random customer name
            const customerName = `${randomPick(firstNames)} ${randomPick(lastNames)}`;

            const order = {
                order_id: orderId, 
                venue_id: venue.venue_id,
                customer_name: customerName, // Satisfies the NOT NULL constraint
                table_number: randomInt(1, 15), // Included in case your Smart Table schema requires it
                status: status,
                payment_method: randomPick(paymentMethods),
                total_amount: 0, 
                createdAt: orderDate,
                updatedAt: isNow ? orderDate : updatedDate 
            };

            // 3. Attach realistic Order Items
            const itemCount = randomInt(1, 4);
            let orderTotal = 0;

            for (let j = 0; j < itemCount; j++) {
                const item = randomPick(menuItems);
                const quantity = randomInt(1, 3);
                
                generatedOrderItems.push({
                    order_id: orderId,
                    item_id: item.item_id,
                    quantity: quantity,
                    price_at_time: item.price, 
                    createdAt: orderDate,
                    updatedAt: orderDate
                });

                orderTotal += (Number(item.price) * quantity);
            }

            order.total_amount = orderTotal;
            generatedOrders.push(order);
        }

        // 4. Execute Insertion inside a Transaction
        await sequelize.transaction(async (t) => {
            console.log(`📦 Inserting ${generatedOrders.length} Orders...`);
            await Order.bulkCreate(generatedOrders, { transaction: t });

            console.log(`🍔 Inserting ${generatedOrderItems.length} Order Items...`);
            await OrderItem.bulkCreate(generatedOrderItems, { transaction: t });
        });

        console.log("✅ Venue simulation successfully seeded! Check your dashboard.");
        process.exit(0);

    } catch (error) {
        console.error("❌ Seeding failed:", error.message);
        process.exit(1);
    }
};

seedRealVenueDay();