import sequelize from './config/db.js';
import Venue from './models/Venue.js';
import MenuCategory from './models/MenuCategory.js'; // ⚡ Added MenuCategory import
import MenuItem from './models/MenuItem.js';
import Order from './models/Order.js';
import OrderItem from './models/OrderItem.js';

const customerNames = ['Alex', 'Sarah', 'John', 'Jane', 'Mike', 'Emma', 'Chris', 'Njeri', 'Kamau', 'Guest', 'Guest', 'Guest'];
const tableNumbers = ['T-1', 'T-2', 'T-3', 'T-4', 'VIP-1', 'VIP-2', 'Bar', 'Takeaway'];
const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'READY', 'PREPARING', 'PENDING', 'CANCELLED'];
const paymentMethods = ['M-PESA', 'M-PESA', 'M-PESA', 'M-PESA', 'CASH', 'CASH', 'CARD'];

const getRandomPastDate = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30); 
    
    if (Math.random() > 0.7) {
        const todayStart = new Date();
        todayStart.setHours(0,0,0,0);
        return new Date(todayStart.getTime() + Math.random() * (end.getTime() - todayStart.getTime()));
    }
    
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const generateDummyOrders = async () => {
    try {
        console.log('⏳ Connecting to database...');
        await sequelize.authenticate();
        
        // 1. Get a Venue
        const venue = await Venue.findOne();
        if (!venue) {
            console.error('❌ No venues found. Please create a venue first.');
            process.exit(1);
        }

        // ⚡ 2. Get Menu Categories for this Venue
        const categories = await MenuCategory.findAll({ where: { venue_id: venue.venue_id } });
        const categoryIds = categories.map(c => c.category_id);

        if (categoryIds.length === 0) {
            console.error('❌ No menu categories found for this venue. Please seed categories first.');
            process.exit(1);
        }

        // ⚡ 3. Get Menu Items that belong to those categories
        const menuItems = await MenuItem.findAll({ where: { category_id: categoryIds } });
        
        if (menuItems.length === 0) {
            console.error('❌ No menu items found. Please seed your menu first.');
            process.exit(1);
        }

        console.log(`✅ Found Venue: ${venue.name} and ${menuItems.length} menu items.`);
        console.log('🚀 Generating 100 sample orders...');

        let ordersCreated = 0;

        for (let i = 0; i < 100; i++) {
            const createdAt = getRandomPastDate();
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
            const isPaid = (status === 'COMPLETED' || status === 'READY' || status === 'PREPARING') && paymentMethod === 'M-PESA';
            
            const numItems = Math.floor(Math.random() * 4) + 1;
            const selectedItems = [];
            let totalAmount = 0;

            for (let j = 0; j < numItems; j++) {
                const randomMenuItem = menuItems[Math.floor(Math.random() * menuItems.length)];
                const quantity = Math.floor(Math.random() * 3) + 1; 
                
                selectedItems.push({
                    menu_item_id: randomMenuItem.item_id,
                    name: randomMenuItem.name,
                    price: randomMenuItem.price,
                    quantity: quantity
                });
                
                totalAmount += (Number(randomMenuItem.price) * quantity);
            }

            const newOrder = await Order.create({
                venue_id: venue.venue_id,
                table_number: tableNumbers[Math.floor(Math.random() * tableNumbers.length)],
                customer_name: customerNames[Math.floor(Math.random() * customerNames.length)],
                payment_method: paymentMethod,
                status: status,
                payment_status: isPaid ? 'PAID' : (status === 'CANCELLED' ? 'FAILED' : 'PENDING'),
                total_amount: totalAmount,
                createdAt: createdAt,
                updatedAt: createdAt
            });

            const orderItemsPayload = selectedItems.map(item => ({
                order_id: newOrder.order_id,
                item_id: item.menu_item_id,
                name: item.name,
                price_at_time: item.price,
                quantity: item.quantity
            }));

            await OrderItem.bulkCreate(orderItemsPayload);
            ordersCreated++;
        }

        console.log(`🎉 Success! ${ordersCreated} sample orders securely injected into the database.`);
        process.exit(0);

    } catch (error) {
        console.error('🔥 Failed to seed orders:', error);
        process.exit(1);
    }
};

generateDummyOrders();