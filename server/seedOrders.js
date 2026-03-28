import sequelize from './config/db.js';
import crypto from 'crypto';
import Venue from './models/Venue.js';
import MenuCategory from './models/MenuCategory.js';
import MenuItem from './models/MenuItem.js';
import Order from './models/Order.js';
import OrderItem from './models/OrderItem.js';

const customerNames = ['Alex', 'Sarah', 'John', 'Jane', 'Mike', 'Emma', 'Chris', 'Njeri', 'Kamau', 'Wanjiku', 'Ochieng', 'Guest'];
const tableNumbers = ['T-1', 'T-2', 'T-3', 'T-4', 'VIP-1', 'VIP-2', 'Bar', 'Takeaway'];
const paymentMethods = ['M-PESA', 'M-PESA', 'M-PESA', 'CASH', 'CARD']; // Weighted towards M-PESA

const generateAdvancedSeedData = async () => {
    try {
        console.log('⏳ Connecting to database...');
        await sequelize.authenticate();
        
        // 1. Wipe existing Orders and OrderItems
        console.log('🧹 Wiping old orders for a clean slate...');
        await OrderItem.destroy({ where: {} });
        await Order.destroy({ where: {} });
        console.log('✨ Database slate wiped clean.');

        // 2. Fetch Venue & Menu
        const venue = await Venue.findOne();
        if (!venue) throw new Error('No venues found. Please create a venue first.');

        const categories = await MenuCategory.findAll({ where: { venue_id: venue.venue_id } });
        const categoryIds = categories.map(c => c.category_id);
        if (categoryIds.length === 0) throw new Error('No menu categories found. Please seed categories.');

        const menuItems = await MenuItem.findAll({ where: { category_id: categoryIds } });
        if (menuItems.length === 0) throw new Error('No menu items found. Please seed menu items.');

        console.log(`✅ Found Venue: ${venue.name} with ${menuItems.length} menu items.`);
        console.log('🚀 Generating realistic enterprise dataset...');

        const ordersToInsert = [];
        const orderItemsToInsert = [];
        const now = new Date();

        // --- PART A: Generate Historical Orders (Past 60 Days) ---
        // Simulates the historical curve for the Recharts graphs
        for (let i = 0; i < 250; i++) {
            // Random date between 60 days ago and 1 day ago
            const daysAgo = Math.floor(Math.random() * 60) + 1; 
            const createdDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
            // Randomize hour to simulate lunch/dinner rushes (11am to 10pm)
            createdDate.setHours(Math.floor(Math.random() * 11) + 11, Math.floor(Math.random() * 60), 0, 0);

            // Simulate kitchen time: Completed 8 to 35 minutes later
            const fulfillmentMinutes = Math.floor(Math.random() * 27) + 8;
            const updatedDate = new Date(createdDate.getTime() + (fulfillmentMinutes * 60000));

            const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
            
            // Select random items
            const numItems = Math.floor(Math.random() * 4) + 1;
            let totalAmount = 0;
            const itemsForThisOrder = [];

            for (let j = 0; j < numItems; j++) {
                const item = menuItems[Math.floor(Math.random() * menuItems.length)];
                const quantity = Math.floor(Math.random() * 3) + 1;
                totalAmount += (Number(item.price) * quantity);
                itemsForThisOrder.push({ item, quantity });
            }

            // Create Order Payload (Historical orders are mostly COMPLETED or CANCELLED)
            const isCancelled = Math.random() > 0.95; // 5% cancellation rate
            const orderId = crypto.randomUUID(); 

            ordersToInsert.push({
                order_id: orderId,
                venue_id: venue.venue_id,
                table_number: tableNumbers[Math.floor(Math.random() * tableNumbers.length)],
                customer_name: customerNames[Math.floor(Math.random() * customerNames.length)],
                payment_method: paymentMethod,
                status: isCancelled ? 'CANCELLED' : 'COMPLETED',
                payment_status: isCancelled ? 'FAILED' : 'PAID',
                total_amount: totalAmount,
                createdAt: createdDate,
                updatedAt: updatedDate
            });

            // Link items to this specific order ID using your exact schema
            itemsForThisOrder.forEach(({ item, quantity }) => {
                orderItemsToInsert.push({
                    order_id: orderId,
                    item_id: item.item_id, // Mapped accurately to your model
                    price_at_time: item.price, // Mapped accurately to your model
                    quantity: quantity
                });
            });
        }

        // --- PART B: Generate "Live Pulse" Orders (Today) ---
        // Simulates orders sitting on the expeditor screen right now
        const liveStatuses = ['PENDING', 'PREPARING', 'READY'];
        
        for (let i = 0; i < 8; i++) {
            // Created within the last 45 minutes
            const minutesAgo = Math.floor(Math.random() * 45);
            const createdDate = new Date(now.getTime() - (minutesAgo * 60000));
            
            const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
            const status = liveStatuses[Math.floor(Math.random() * liveStatuses.length)];
            
            let totalAmount = 0;
            const itemsForThisOrder = [];
            const numItems = Math.floor(Math.random() * 3) + 1;

            for (let j = 0; j < numItems; j++) {
                const item = menuItems[Math.floor(Math.random() * menuItems.length)];
                const quantity = Math.floor(Math.random() * 2) + 1;
                totalAmount += (Number(item.price) * quantity);
                itemsForThisOrder.push({ item, quantity });
            }

            const orderId = crypto.randomUUID();

            ordersToInsert.push({
                order_id: orderId,
                venue_id: venue.venue_id,
                table_number: tableNumbers[Math.floor(Math.random() * tableNumbers.length)],
                customer_name: customerNames[Math.floor(Math.random() * customerNames.length)],
                payment_method: paymentMethod,
                status: status,
                payment_status: paymentMethod === 'M-PESA' ? 'PAID' : 'PENDING',
                total_amount: totalAmount,
                createdAt: createdDate,
                updatedAt: createdDate // Hasn't been completed yet
            });

            itemsForThisOrder.forEach(({ item, quantity }) => {
                orderItemsToInsert.push({
                    order_id: orderId,
                    item_id: item.item_id, 
                    price_at_time: item.price,
                    quantity: quantity
                });
            });
        }

        // 3. Bulk Insert Everything into Postgres
        console.log('💾 Injecting data into PostgreSQL...');
        await Order.bulkCreate(ordersToInsert);
        await OrderItem.bulkCreate(orderItemsToInsert);

        console.log(`🎉 Success! ${ordersToInsert.length} orders and ${orderItemsToInsert.length} items securely injected.`);
        console.log('📊 Go check your Dashboard Overview and Live Orders tabs!');
        process.exit(0);

    } catch (error) {
        console.error('🔥 Failed to seed orders:', error);
        process.exit(1);
    }
};

generateAdvancedSeedData();