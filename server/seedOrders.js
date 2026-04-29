import sequelize from './config/db.js';
import crypto from 'crypto';
import Venue from './models/Venue.js';
import MenuItem from './models/MenuItem.js';
import Order from './models/Order.js';
import OrderItem from './models/OrderItem.js';

const customerNames = ['Kamau', 'Sarah', 'Guest', 'Njeri', 'Ochieng', 'Alex'];
const tableNumbers = ['T-1', 'T-2', 'VIP-1', 'Bar', 'Takeaway'];

const seedLiveOrders = async () => {
    try {
        console.log('⏳ Connecting to database...');
        await sequelize.authenticate();
        
        // 1. Fetch Venue & Menu
        // ⚡ FIX: Added { raw: true } so we get plain JSON objects, bypassing the class property shadowing bug
        const venue = await Venue.findOne({ raw: true });
        if (!venue) throw new Error('No venues found. Please create a venue first.');

        // ⚡ FIX: Added { raw: true } here as well
        const menuItems = await MenuItem.findAll({ limit: 10, raw: true });
        if (menuItems.length === 0) throw new Error('No menu items found.');

        console.log(`✅ Found Venue: ${venue.name}`);
        console.log('🚀 Injecting Live KDS Test Data (Keeping old data safe)...');

        const ordersToInsert = [];
        const orderItemsToInsert = [];
        const now = Date.now();

        // --- THE SCENARIOS TO TEST ---
        const scenarios = [
            // PENDING (New Tickets)
            { status: 'PENDING', minsAgo: 2, payMethod: 'M-PESA', payStatus: 'PAID' }, // Standard
            { status: 'PENDING', minsAgo: 12, payMethod: 'CASH', payStatus: 'PENDING' }, // Amber Warning + Collect Cash
            { status: 'PENDING', minsAgo: 22, payMethod: 'M-PESA', payStatus: 'PAID' }, // Red Critical

            // PREPARING (Cooking)
            { status: 'PREPARING', minsAgo: 5, payMethod: 'CASH', payStatus: 'PENDING' }, // Standard + Collect Cash
            { status: 'PREPARING', minsAgo: 15, payMethod: 'M-PESA', payStatus: 'PAID' }, // Amber Warning
            { status: 'PREPARING', minsAgo: 25, payMethod: 'CARD', payStatus: 'PAID' }, // Red Critical

            // READY (Awaiting Pickup)
            { status: 'READY', minsAgo: 8, payMethod: 'M-PESA', payStatus: 'PAID' }, // Standard
            { status: 'READY', minsAgo: 18, payMethod: 'CASH', payStatus: 'PENDING' }, // Amber Warning + Collect Cash

            // COMPLETED (Recall Tab - Served earlier today)
            { status: 'COMPLETED', minsAgo: 45, payMethod: 'M-PESA', payStatus: 'PAID' },
            { status: 'COMPLETED', minsAgo: 90, payMethod: 'CASH', payStatus: 'PAID' },
            { status: 'COMPLETED', minsAgo: 120, payMethod: 'M-PESA', payStatus: 'PAID' }
        ];

        for (const scenario of scenarios) {
            const createdDate = new Date(now - (scenario.minsAgo * 60000));
            const orderId = crypto.randomUUID(); 
            
            // Pick random items
            let totalAmount = 0;
            const numItems = Math.floor(Math.random() * 3) + 1;
            
            for (let j = 0; j < numItems; j++) {
                const item = menuItems[Math.floor(Math.random() * menuItems.length)];
                const quantity = Math.floor(Math.random() * 2) + 1;
                
                // ⚡ With raw: true, item.price now safely holds the numeric value!
                totalAmount += (Number(item.price) * quantity);
                
                orderItemsToInsert.push({
                    order_id: orderId,
                    item_id: item.item_id, 
                    price_at_time: item.price,
                    quantity: quantity
                });
            }

            ordersToInsert.push({
                order_id: orderId,
                venue_id: venue.venue_id,
                table_number: tableNumbers[Math.floor(Math.random() * tableNumbers.length)],
                customer_name: customerNames[Math.floor(Math.random() * customerNames.length)],
                payment_method: scenario.payMethod,
                status: scenario.status,
                payment_status: scenario.payStatus,
                total_amount: totalAmount,
                createdAt: createdDate,
                updatedAt: scenario.status === 'COMPLETED' ? new Date(createdDate.getTime() + 15*60000) : createdDate
            });
        }

        // 2. Bulk Insert safely alongside your existing data
        console.log('💾 Appending orders into PostgreSQL...');
        await Order.bulkCreate(ordersToInsert);
        await OrderItem.bulkCreate(orderItemsToInsert);

        console.log(`🎉 Success! 11 meticulously timed orders injected.`);
        console.log('📊 Head to the Live Orders tab to test the Kanban board!');
        process.exit(0);

    } catch (error) {
        console.error('🔥 Failed to seed live orders:', error);
        process.exit(1);
    }
};

seedLiveOrders();