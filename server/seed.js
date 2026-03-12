import sequelize from './config/db.js';
import bcrypt from 'bcryptjs';

import Venue from './models/Venue.js';
import MenuCategory from './models/MenuCategory.js';
import MenuItem from './models/MenuItem.js';
import Order from './models/Order.js';
import OrderItem from './models/OrderItem.js';
import User from './models/User.js';

// Define associations to ensure DB schema is created correctly during sync
Venue.hasMany(User, { foreignKey: 'venue_id', onDelete: 'CASCADE' });
User.belongsTo(Venue, { foreignKey: 'venue_id' });

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

    // 2. Create Venue (Hardcoded ID)
    const TARGET_VENUE_ID = "123e4567-e89b-12d3-a456-426614174000";
    
    const venue = await Venue.create({
      venue_id: TARGET_VENUE_ID, // Exact ID requested
      name: 'SmartTable Exclusive Lounge',
      location: "Westlands, Nairobi",
      image_url: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80"
    });
    console.log(`✅ Created Venue: ${venue.name} (${venue.venue_id})`);

    // 3. Create Categories
    const categoryNames = [
      'Starters', 
      'Signature Burgers', 
      'Wood-Fired Pizzas', 
      'Prime Steaks', 
      'Swahili Dishes', 
      'Cocktails', 
      'Beers & Ciders', 
      'Wines', 
      'Desserts', 
      'Soft Drinks'
    ];

    const categoryData = categoryNames.map(name => ({
      name,
      venue_id: venue.venue_id
    }));

    const createdCategories = await MenuCategory.bulkCreate(categoryData, { returning: true });
    console.log(`✅ Created ${createdCategories.length} Categories`);

    // Create a mapping of Category Name -> Category UUID for easy item assignment
    const catMap = {};
    createdCategories.forEach(cat => {
      // Handles both potential primary key naming conventions (id or category_id)
      catMap[cat.name] = cat.category_id || cat.id; 
    });

    // 4. Create 100 Menu Items (10 per category)
    const menuItems = [
      // --- STARTERS ---
      { name: 'Beef Samosas', price: 800, description: 'Crispy golden pastry filled with spiced minced beef.', category_id: catMap['Starters'], image_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Sticky BBQ Wings', price: 1200, description: 'Charcoal-grilled chicken wings glazed in our house BBQ sauce.', category_id: catMap['Starters'], image_url: 'https://images.unsplash.com/photo-1569691899455-88464f6d3cb1?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Garlic Parmesan Calamari', price: 1500, description: 'Tender squid rings, lightly dusted and fried, served with garlic mayo.', category_id: catMap['Starters'], image_url: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Bruschetta Pomodoro', price: 900, description: 'Toasted baguette topped with fresh tomatoes, basil, and olive oil.', category_id: catMap['Starters'], image_url: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Vegetable Spring Rolls', price: 700, description: 'Crunchy rolls stuffed with julienned vegetables and sweet chili dip.', category_id: catMap['Starters'], image_url: 'https://images.unsplash.com/photo-1585238332058-478aad52ec30?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Halloumi Fries', price: 1100, description: 'Deep-fried halloumi cheese sticks sprinkled with zaatar.', category_id: catMap['Starters'], image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Prawn Cocktail', price: 1600, description: 'Fresh Indian Ocean prawns served in a tangy marie rose sauce.', category_id: catMap['Starters'], image_url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Creamy Mushroom Soup', price: 850, description: 'Rich wild mushroom soup served with garlic croutons.', category_id: catMap['Starters'], image_url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Chicken Tikka Skewers', price: 1300, description: 'Tender chicken pieces marinated in yogurt and Indian spices.', category_id: catMap['Starters'], image_url: 'https://images.unsplash.com/photo-1599487071490-6da46665790a?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Loaded Cheese Nachos', price: 1400, description: 'Tortilla chips smothered in melted cheese, jalapenos, and guacamole.', category_id: catMap['Starters'], image_url: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=800&q=80', is_available: true },

      // --- SIGNATURE BURGERS ---
      { name: 'Classic Beef Burger', price: 1500, description: '100% beef patty with lettuce, tomato, and our secret sauce.', category_id: catMap['Signature Burgers'], image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Double Bacon Cheeseburger', price: 1900, description: 'Two beef patties, crispy bacon, and double cheddar cheese.', category_id: catMap['Signature Burgers'], image_url: 'https://images.unsplash.com/photo-1594212691516-436f8f6c58fb?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Crispy Chicken Burger', price: 1400, description: 'Fried chicken breast with spicy mayo and crunchy slaw.', category_id: catMap['Signature Burgers'], image_url: 'https://images.unsplash.com/photo-1615719413546-198b25453f85?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Pulled Pork Burger', price: 1700, description: 'Slow-cooked pulled pork shoulder smothered in smoky BBQ sauce.', category_id: catMap['Signature Burgers'], image_url: 'https://images.unsplash.com/photo-1525648199074-cee30ba79a4a?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Spicy Lamb Burger', price: 1800, description: 'Mombasa-spiced lamb patty topped with minted yogurt.', category_id: catMap['Signature Burgers'], image_url: 'https://images.unsplash.com/photo-1550547660-d15447fe8f85?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Mushroom Swiss Burger', price: 1600, description: 'Juicy beef patty loaded with sautéed mushrooms and melted Swiss cheese.', category_id: catMap['Signature Burgers'], image_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Veggie Bean Burger', price: 1300, description: 'House-made black bean patty with fresh avocado smash.', category_id: catMap['Signature Burgers'], image_url: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'The SmartTable Tower', price: 2200, description: 'Our massive triple patty burger with onion rings and fried egg.', category_id: catMap['Signature Burgers'], image_url: 'https://images.unsplash.com/photo-1586816001966-79b736744398?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Fish Fillet Burger', price: 1600, description: 'Crumbed red snapper fillet with tangy tartar sauce.', category_id: catMap['Signature Burgers'], image_url: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'BBQ Brisket Burger', price: 2000, description: 'Smoked beef brisket slices stacked on a toasted brioche bun.', category_id: catMap['Signature Burgers'], image_url: 'https://images.unsplash.com/photo-1608767221051-2b9d18f35a1f?auto=format&fit=crop&w=800&q=80', is_available: true },

      // --- WOOD-FIRED PIZZAS ---
      { name: 'Margherita', price: 1200, description: 'Classic Napoli pizza with San Marzano tomatoes and fresh mozzarella.', category_id: catMap['Wood-Fired Pizzas'], image_url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Pepperoni', price: 1600, description: 'Loaded with double spicy pepperoni and premium mozzarella.', category_id: catMap['Wood-Fired Pizzas'], image_url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Hawaiian', price: 1400, description: 'Sweet pineapple chunks and savory honey-glazed ham.', category_id: catMap['Wood-Fired Pizzas'], image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'BBQ Chicken', price: 1700, description: 'Grilled chicken strips, red onions, and a BBQ sauce drizzle.', category_id: catMap['Wood-Fired Pizzas'], image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Vegetarian Supreme', price: 1500, description: 'Bell peppers, olives, mushrooms, and sweetcorn.', category_id: catMap['Wood-Fired Pizzas'], image_url: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Meat Feast', price: 1900, description: 'Bacon, pepperoni, beef mince, and smoked sausage.', category_id: catMap['Wood-Fired Pizzas'], image_url: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Quattro Formaggi', price: 1800, description: 'A decadent blend of mozzarella, gorgonzola, parmesan, and cheddar.', category_id: catMap['Wood-Fired Pizzas'], image_url: 'https://images.unsplash.com/photo-1573821663912-569905455b1c?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Seafood Pizza', price: 2100, description: 'Topped with fresh calamari, prawns, and garlic oil.', category_id: catMap['Wood-Fired Pizzas'], image_url: 'https://images.unsplash.com/photo-1555072956-7758afb20e8f?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Mushroom & Truffle', price: 1700, description: 'Wild mushrooms baked with an aromatic truffle oil glaze.', category_id: catMap['Wood-Fired Pizzas'], image_url: 'https://images.unsplash.com/photo-1585238332058-478aad52ec30?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Spicy Diavola', price: 1600, description: 'Hot salami, fresh chilies, and fiery nduja paste.', category_id: catMap['Wood-Fired Pizzas'], image_url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80', is_available: true },

      // --- PRIME STEAKS ---
      { name: 'Ribeye 300g', price: 3500, description: 'Richly marbled and flavorful, grilled to your liking.', category_id: catMap['Prime Steaks'], image_url: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Sirloin 250g', price: 3000, description: 'Lean and tender cut, served with creamy mash or fries.', category_id: catMap['Prime Steaks'], image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'T-Bone 400g', price: 4000, description: 'The best of both worlds: tender fillet and flavorful strip.', category_id: catMap['Prime Steaks'], image_url: 'https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Filet Mignon 200g', price: 4500, description: 'Our most tender cut of beef, meltingly soft.', category_id: catMap['Prime Steaks'], image_url: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Tomahawk 800g', price: 8500, description: 'A giant bone-in ribeye perfect for sharing.', category_id: catMap['Prime Steaks'], image_url: 'https://images.unsplash.com/photo-1605624796338-7cb7014631dc?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Rump Steak 300g', price: 2800, description: 'Firm texture with a deep, rich beef flavor.', category_id: catMap['Prime Steaks'], image_url: 'https://images.unsplash.com/photo-1508398864700-1c0db92f39d1?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Pepper Steak', price: 3200, description: 'Coated in cracked black pepper and served with peppercorn sauce.', category_id: catMap['Prime Steaks'], image_url: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Garlic Butter Steak', price: 3400, description: 'Basted with roasted garlic and herb butter.', category_id: catMap['Prime Steaks'], image_url: 'https://images.unsplash.com/photo-1615937657715-bc7b4b7962c1?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Chateaubriand', price: 7000, description: 'Center cut tenderloin roasted whole for two guests.', category_id: catMap['Prime Steaks'], image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'NY Strip 300g', price: 3600, description: 'Classic New York strip, expertly seared.', category_id: catMap['Prime Steaks'], image_url: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80', is_available: true },

      // --- SWAHILI DISHES ---
      { name: 'Coconut Fish Curry', price: 1800, description: 'Red snapper fillets simmered in rich coconut milk and spices.', category_id: catMap['Swahili Dishes'], image_url: 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Swahili Beef Pilau', price: 1200, description: 'Aromatic spiced rice cooked with tender beef chunks.', category_id: catMap['Swahili Dishes'], image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Chicken Biryani', price: 1500, description: 'Layered spiced chicken and fragrant basmati rice.', category_id: catMap['Swahili Dishes'], image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Mukimo & Beef Stew', price: 1400, description: 'Traditional mashed peas and potatoes served with hearty beef stew.', category_id: catMap['Swahili Dishes'], image_url: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Nyama Choma 1kg', price: 2500, description: 'Premium goat meat roasted over open charcoal.', category_id: catMap['Swahili Dishes'], image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Kuku Paka', price: 1600, description: 'Char-grilled chicken in a creamy Swahili coconut sauce.', category_id: catMap['Swahili Dishes'], image_url: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Mishkaki Skewers', price: 1200, description: 'Marinated beef skewers grilled to perfection.', category_id: catMap['Swahili Dishes'], image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Goat Curry', price: 1700, description: 'Slow-cooked local goat meat in a robust, spicy curry.', category_id: catMap['Swahili Dishes'], image_url: 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Ugali, Sukuma & Beef', price: 1100, description: 'The ultimate Kenyan staple food combination.', category_id: catMap['Swahili Dishes'], image_url: 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Maharagwe ya Nazi', price: 900, description: 'Red beans slow-cooked in thick coconut cream.', category_id: catMap['Swahili Dishes'], image_url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80', is_available: true },

      // --- COCKTAILS ---
      { name: 'Classic Mojito', price: 1000, description: 'White rum, fresh mint, lime juice, and soda water.', category_id: catMap['Cocktails'], image_url: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Long Island Iced Tea', price: 1500, description: 'A potent mix of vodka, tequila, rum, gin, triple sec, and cola.', category_id: catMap['Cocktails'], image_url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Margarita', price: 1200, description: 'Tequila, triple sec, and lime juice served with a salt rim.', category_id: catMap['Cocktails'], image_url: 'https://images.unsplash.com/photo-1568644396922-5c3bfae12521?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Old Fashioned', price: 1400, description: 'Bourbon whiskey gently stirred with bitters and sugar.', category_id: catMap['Cocktails'], image_url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Cosmopolitan', price: 1100, description: 'Vodka, cranberry juice, Cointreau, and fresh lime.', category_id: catMap['Cocktails'], image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Whiskey Sour', price: 1300, description: 'Whiskey, lemon juice, sugar syrup, and egg white foam.', category_id: catMap['Cocktails'], image_url: 'https://images.unsplash.com/photo-1606132047585-cce86eb9ed0e?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Pina Colada', price: 1200, description: 'A tropical blend of rum, coconut cream, and pineapple juice.', category_id: catMap['Cocktails'], image_url: 'https://images.unsplash.com/photo-1587223962930-cb7f31384c19?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Espresso Martini', price: 1400, description: 'Vodka, coffee liqueur, and a fresh shot of Kenyan espresso.', category_id: catMap['Cocktails'], image_url: 'https://images.unsplash.com/photo-1620219365994-f443a86ea626?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Aperol Spritz', price: 1300, description: 'Aperol, prosecco, and a splash of soda water.', category_id: catMap['Cocktails'], image_url: 'https://images.unsplash.com/photo-1560508180-03f285f67dd5?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Strawberry Daiquiri', price: 1100, description: 'Blended rum, fresh strawberries, and lime.', category_id: catMap['Cocktails'], image_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80', is_available: true },

      // --- BEERS & CIDERS ---
      { name: 'Tusker Lager', price: 500, description: 'Classic Kenyan lager, perfectly chilled.', category_id: catMap['Beers & Ciders'], image_url: 'https://images.unsplash.com/photo-1538593704909-66e285d8e70a?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Tusker Cider', price: 600, description: 'Refreshing apple cider made from premium ingredients.', category_id: catMap['Beers & Ciders'], image_url: 'https://images.unsplash.com/photo-1559526642-c3f001ea68ee?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'White Cap Lager', price: 500, description: 'Crisp and smooth premium local lager.', category_id: catMap['Beers & Ciders'], image_url: 'https://images.unsplash.com/photo-1614316654060-14e38e126fc4?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Guinness Stout', price: 600, description: 'Rich, dark, and perfectly poured.', category_id: catMap['Beers & Ciders'], image_url: 'https://images.unsplash.com/photo-1563514066606-2586f1e82806?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Heineken', price: 700, description: 'World-famous premium pale lager.', category_id: catMap['Beers & Ciders'], image_url: 'https://images.unsplash.com/photo-1610452330449-74d754ec2f3a?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Corona Extra', price: 800, description: 'Served ice cold with a slice of fresh lime.', category_id: catMap['Beers & Ciders'], image_url: 'https://images.unsplash.com/photo-1563514066606-2586f1e82806?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Savanna Dry', price: 700, description: 'Distinctively dry South African apple cider.', category_id: catMap['Beers & Ciders'], image_url: 'https://images.unsplash.com/photo-1559526642-c3f001ea68ee?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Hunter\'s Gold', price: 600, description: 'Sweet and refreshing apple cider.', category_id: catMap['Beers & Ciders'], image_url: 'https://images.unsplash.com/photo-1559526642-c3f001ea68ee?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Balozi Lager', price: 500, description: 'Malt lager with a deep, rich taste.', category_id: catMap['Beers & Ciders'], image_url: 'https://images.unsplash.com/photo-1614316654060-14e38e126fc4?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Stella Artois', price: 700, description: 'Classic Belgian pilsner.', category_id: catMap['Beers & Ciders'], image_url: 'https://images.unsplash.com/photo-1538593704909-66e285d8e70a?auto=format&fit=crop&w=800&q=80', is_available: true },

      // --- WINES ---
      { name: 'House Red Glass', price: 800, description: 'Our sommelier\'s selection of South African Merlot.', category_id: catMap['Wines'], image_url: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'House White Glass', price: 800, description: 'Crisp and refreshing Sauvignon Blanc.', category_id: catMap['Wines'], image_url: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Merlot Bottle', price: 3500, description: 'Smooth red wine with notes of plum and cherry.', category_id: catMap['Wines'], image_url: 'https://images.unsplash.com/photo-1585553616435-2dc0a54e271d?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Cabernet Sauvignon Bottle', price: 4000, description: 'Full-bodied red wine with strong tannins and oak flavors.', category_id: catMap['Wines'], image_url: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Sauvignon Blanc Bottle', price: 3800, description: 'Zesty white wine with tropical fruit aromas.', category_id: catMap['Wines'], image_url: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Chardonnay Bottle', price: 3500, description: 'Buttery and oaky white wine.', category_id: catMap['Wines'], image_url: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Prosecco Bottle', price: 4500, description: 'Italian sparkling wine, perfect for celebrations.', category_id: catMap['Wines'], image_url: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Moët & Chandon', price: 15000, description: 'Premium French Champagne.', category_id: catMap['Wines'], image_url: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Rosé Glass', price: 900, description: 'Light, fruity, and refreshing pink wine.', category_id: catMap['Wines'], image_url: 'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Shiraz Bottle', price: 4200, description: 'Bold and spicy red wine with dark fruit notes.', category_id: catMap['Wines'], image_url: 'https://images.unsplash.com/photo-1585553616435-2dc0a54e271d?auto=format&fit=crop&w=800&q=80', is_available: true },

      // --- DESSERTS ---
      { name: 'Tiramisu', price: 900, description: 'Classic Italian coffee-flavored dessert.', category_id: catMap['Desserts'], image_url: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Chocolate Fondant', price: 1200, description: 'Warm melting chocolate cake served with vanilla ice cream.', category_id: catMap['Desserts'], image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'New York Cheesecake', price: 1100, description: 'Baked vanilla cheesecake with a berry compote.', category_id: catMap['Desserts'], image_url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Vanilla Panna Cotta', price: 1000, description: 'Silky smooth Italian cream dessert with passionfruit.', category_id: catMap['Desserts'], image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Apple Crumble', price: 900, description: 'Warm spiced apples topped with buttery crumble and custard.', category_id: catMap['Desserts'], image_url: 'https://images.unsplash.com/photo-1563805042-7684c8a9e9cb?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Gelato Selection', price: 800, description: 'Three scoops of premium Italian ice cream.', category_id: catMap['Desserts'], image_url: 'https://images.unsplash.com/photo-1563805042-7684c8a9e9cb?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Sticky Toffee Pudding', price: 1100, description: 'Moist sponge cake drenched in rich toffee sauce.', category_id: catMap['Desserts'], image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Creme Brulee', price: 1200, description: 'Rich vanilla custard topped with caramelized sugar.', category_id: catMap['Desserts'], image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Black Forest Gateau', price: 900, description: 'Layers of chocolate sponge, cherries, and whipped cream.', category_id: catMap['Desserts'], image_url: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Passionfruit Sorbet', price: 700, description: 'Light, fruity, and dairy-free frozen dessert.', category_id: catMap['Desserts'], image_url: 'https://images.unsplash.com/photo-1563805042-7684c8a9e9cb?auto=format&fit=crop&w=800&q=80', is_available: true },

      // --- SOFT DRINKS ---
      { name: 'Coca Cola', price: 300, description: '300ml glass bottle.', category_id: catMap['Soft Drinks'], image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Sprite', price: 300, description: '300ml glass bottle.', category_id: catMap['Soft Drinks'], image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Fanta Orange', price: 300, description: '300ml glass bottle.', category_id: catMap['Soft Drinks'], image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Still Water 500ml', price: 200, description: 'Premium bottled mineral water.', category_id: catMap['Soft Drinks'], image_url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Sparkling Water 500ml', price: 300, description: 'Carbonated bottled mineral water.', category_id: catMap['Soft Drinks'], image_url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Fresh Orange Juice', price: 500, description: 'Freshly squeezed oranges.', category_id: catMap['Soft Drinks'], image_url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Mango Juice', price: 500, description: 'Thick and sweet local mango juice.', category_id: catMap['Soft Drinks'], image_url: 'https://images.unsplash.com/photo-1622597467836-f38240662c8c?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Passion Juice', price: 500, description: 'Freshly blended passionfruit juice.', category_id: catMap['Soft Drinks'], image_url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Iced Tea', price: 400, description: 'House-brewed tea chilled with lemon and mint.', category_id: catMap['Soft Drinks'], image_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80', is_available: true },
      { name: 'Red Bull', price: 600, description: 'Energy drink.', category_id: catMap['Soft Drinks'], image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=800&q=80', is_available: true }
    ];

    await MenuItem.bulkCreate(menuItems);
    console.log(`✅ Created 100 Menu Items successfully mapped to their Categories`);

    // --- SETUP BASIC STAFF ACCOUNTS (Optional but helpful for testing) ---
    const managerPassword = await bcrypt.hash("password123", 10);
    const WaiterPin = await bcrypt.hash('1234',10)
    await User.bulkCreate([
      { username: 'JohnOwner',email:'owner001@gmail.com', password: managerPassword, role: 'OWNER', venue_id: venue.venue_id },
      { username: 'SarahWaiter',email: null,pin: WaiterPin, password: null, role: 'WAITER', venue_id: venue.venue_id }
    ]);
    console.log("✅ Created Staff: ");
    console.log("   👨‍💼 Owner (Email: owner001@gmail.com | Pass: password123)");
    console.log("   🏃‍♀️ Waiter (Username: SarahWaiter | PIN: 1234)");

    console.log('🌱 Database seeded successfully with SmartTable High-End Data!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();