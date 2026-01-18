const {Sequelize} = require('sequelize');
require('dotenv').config()

//Create the sequelize instance
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: process.env.DB_Dialect,
        logging:false, //Disable logging every SQL query to the console (cleaner)
    }
);

module.exports = sequelize;