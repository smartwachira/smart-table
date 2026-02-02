import express from "express";
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/db';

//Import Models (This registers them with Sequelize)
import Venue from './models/Venue';
import MenuCategory from './models/MenuCategory';
import MenuItem from './models/MenuItem';
import Order from './models/Order';
import OrderItem from './models/OrderItem';
import User from './models/User';

//Import Routes
import menuRoutes from './routes/menuRoutes';
import orderRoutes from './routes/orderRoutes';
import authRoutes from './routes/authRoutes';

//load environment variables
dotenv.config(); //reads the .env file and attaches the variables to process.env

const app = express();
const PORT = process.env.PORT || 5000;

//Middleware
app.use(cors());
app.use(express.json()); //Crucial for parsing JSON bodies

//Mount Routes
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes)

// Define Associations (Relationships)
Venue.hasMany(MenuCategory,{
  foreignKey: 'venue_id',
  onDelete: 'CASCADE'

});
MenuCategory.belongsTo(Venue,{
  foreignKey: 'venue_id'
});

MenuCategory.hasMany(MenuItem,{
  foreignKey: 'category_id',
  onDelete: 'CASCADE'
});
MenuItem.belongsTo(MenuCategory, {
  foreignKey: 'category_id'
});

Venue.hasMany(Order, {foreignKey: "venue_id"});
Order.belongsTo(Venue, {foreignKey: "venue_id"});

Order.hasMany(OrderItem, {foreignKey: "order_id"});
OrderItem.belongsTo(Order, {foreignKey: "order_id"});

MenuItem.hasMany(OrderItem, {foreignKey: 'item_id'});
OrderItem.belongsTo(MenuItem, {foreignKey: 'item_id'});

Venue.hasMany(User, { foreignKey: 'venue_id'});
User.belongsTo(Venue, {foreignKey: "venue_id"})

//Routes
app.get('/', (req, res) =>{
    res.json({ message: "SmartTable API is running"});
});


// Wrap startup in an async function
const startServer = async () => {
  try {
    // 1. Authenticate connection
    await sequelize.authenticate();
    console.log('✅ Database connected successfully.');

    //2. Sync models to database
    // This creates the tables if they don't exit
    await sequelize.sync({force: false});
    console.log('✅ Database synced.')

    //3. start listening if DB connects
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};

startServer();





