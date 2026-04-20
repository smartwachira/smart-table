import {Sequelize} from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Ensure the environment variable exists to satisfy TypeScript
const databaseUrl = process.env.DATABASE_URL as string;

if (!databaseUrl){
    throw new Error("❌ DATABASE_URL is not defined in your .env file");
}

//Create the sequelize instance
const sequelize = new Sequelize(
    //The security Layer (Environment Variables): "All-in -one Connection String"
    databaseUrl,
    {
        //The Location & Language
        dialect: "postgres",

        //Connection Pooling
        pool: {
            max: 5,        // Maximum number of connections in the pool
            min: 0,        // Minimum number of connections in the pool
            acquire: 30000,// Maximum time (in ms) Sequelize will try to get a connection before throwing an error
            idle: 10000    // Maximum time (in ms) a connection can be idle before being released
        },
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