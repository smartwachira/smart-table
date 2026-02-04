import {Sequelize} from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

//Create the sequelize instance
const sequelize = new Sequelize(
    //The security Layer (Environment Variables): "All-in -one Connection String"
    process.env.DATABASE_URL,
    {
        //The Location & Language
        dialect: "postgres",
        //The "Smart Switch"(Secure Sockets Layer(SSL) Configuration)
        dialectOptions: {
            ssl: process.env.NODE_ENV === 'production' ? {
                require: true,
                rejectUnauthorized: false
            } : false
        },
        logging:false,
         //Disable logging every SQL query to the console (cleaner)
    }
);

export default sequelize;