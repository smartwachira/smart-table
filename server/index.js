const express = require("express");
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./config/db');

//1. load environment variables
dotenv.config(); //reads the .env file and attaches the variables to process.env

const app = express();
const PORT = process.env.PORT || 5000;

// 2. Middleware
app.use(cors());
app.use(express.json()); //Crucial for parsing JSON bodies

//3. Routes
app.get('/', (req, res) =>{
    res.json({ message: "SmartTable API is running"});
});


// Wrap startup in an async function
const startServer = async () => {
  try {
    // Test the database connection
    await sequelize.authenticate();
    console.log('✅ Database connected successfully.');

    // Only start listening if DB connects
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};

startServer();





