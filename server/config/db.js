import {Sequelize} from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

//Create the sequelize instance
const sequelize = new Sequelize(
    //The security Layer (Environment Variables)
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        //The Location & Language
        host: process.env.DB_HOST,
        dialect: process.env.DB_Dialect,
        logging:false, //Disable logging every SQL query to the console (cleaner)
    }
);

export default sequelize;