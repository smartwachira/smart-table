const express = require("express");
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./config/db');

//Import Models (This registers them with Sequelize)
const Venue = require('./models/venue');
const MenuCategory = require('./models/MenuCategory');
const MenuItem = require('./models/MenuItem');

//load environment variables
dotenv.config(); //reads the .env file and attaches the variables to process.env

const app = express();
const PORT = process.env.PORT || 5000;

//Middleware
app.use(cors());
app.use(express.json()); //Crucial for parsing JSON bodies

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





