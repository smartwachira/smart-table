import express, {Request,Response} from "express"; //handles API requests
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/db.js';
import http from 'http';
import { Server,Socket } from 'socket.io';
import path from "path";
import { fileURLToPath } from "url";

//Set up __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



//Import Models (This registers them with Sequelize)
import Venue from './models/Venue.js';
import MenuCategory from './models/MenuCategory.js';
import MenuItem from './models/MenuItem.js';
import Order from './models/Order.js';
import OrderItem from './models/OrderItem.js';
import User from './models/User.js';

//Import Routes
import menuRoutes from './routes/menuRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import authRoutes from './routes/authRoutes.js';
import mpesaRoutes from './routes/mpesaRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'

//load environment variables
dotenv.config(); //reads the .env file and attaches the variables to process.env

const app = express();
const server = http.createServer(app); // Create HTTP Server


//Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    credentials:true,
    methods: ["GET", "PATCH","PUT","DELETE","POST"]
  }
});

// ============================================================================
// ⚡ CORS SECURITY CONFIGURATION
// ============================================================================
const corsOptions = {
    // In production, swap this for your actual Vercel/Netlify frontend URL
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], 
    credentials: true,
    // ⚡ THE FIX: Explicitly allow our custom session header to pass the preflight check
    allowedHeaders: ['Content-Type', 'Authorization', 'x-guest-id'], 
    // Expose it just in case the frontend ever needs to read it from a response
    exposedHeaders: ['x-guest-id'] 
};

//Middleware
app.use(cors(corsOptions));
app.use(express.json()); //Crucial for parsing JSON bodies

//Serve static files from  the uploads directory
app.use('/uploads',express.static(path.join(__dirname, 'uploads')));

//Mount Routes
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/mpesa',mpesaRoutes);
app.use('/api/settings',settingsRoutes);
app.use('/api/dashboard',dashboardRoutes)

// Socket Connection Logic
io.on('connection',(socket: Socket)=>{
  console.log(`⚡: New Client Connected (${socket.id})`);

  //Join a specific "Room" based on Venue ID
  socket.on("join_venue", (venueId: string) =>{
    socket.join(venueId);
    console.log(`User joined venue room: ${venueId}`)
  });

  //Listen for "New Order" event from Customer
  socket.on('new_order',(data: { venueId: string; [key: string]: any})=>{
    io.to(data.venueId).emit("receive_order", data);
  });

  //Listen for "Order Update" event from Kitchen
  socket.on("update-order-status", (data: { venueId: string; [key: string]: any})=>{
    io.to(data.venueId).emit(`orderUpdated`, data)
  })

  socket.on('disconnect',()=>{
    console.log('🔥: User Disconnected');
  })

});

app.set('socketio',io);// stores the tool in a global pack

const PORT = process.env.PORT || 5000;


// Define Associations (Relationships)
// ==========================================
// Define Associations (Relationships)
// ==========================================

Venue.hasMany(MenuCategory,{
  foreignKey: 'venue_id',
  sourceKey: 'venue_id',
  onDelete: 'CASCADE'
});
MenuCategory.belongsTo(Venue,{
  foreignKey: 'venue_id',
  targetKey: 'venue_id'
});

MenuCategory.hasMany(MenuItem,{
  foreignKey: 'category_id',
  sourceKey: 'category_id',
  onDelete: 'CASCADE'
});
MenuItem.belongsTo(MenuCategory, {
  foreignKey: 'category_id',
  targetKey: 'category_id'
});

Venue.hasMany(Order, { foreignKey: "venue_id", sourceKey: 'venue_id' });
Order.belongsTo(Venue, { foreignKey: "venue_id", targetKey: 'venue_id' });

Order.hasMany(OrderItem, { foreignKey: "order_id", sourceKey: 'order_id' });
OrderItem.belongsTo(Order, { foreignKey: "order_id", targetKey: 'order_id' });

MenuItem.hasMany(OrderItem, { foreignKey: 'item_id', sourceKey: 'item_id' });
OrderItem.belongsTo(MenuItem, { foreignKey: 'item_id', targetKey: 'item_id' });

Venue.hasMany(User, { 
  foreignKey: 'venue_id',
  sourceKey: 'venue_id',
  onDelete: 'CASCADE',
  as: 'staff'
});
User.belongsTo(Venue, {
  foreignKey: "venue_id",
  targetKey: 'venue_id',
  as: 'venue'
});

// ⚡ THE FIX: Explicitly mapping the User keys prevents the SQL crashes
User.hasMany(Order, {
  foreignKey: 'cash_collected_by',
  sourceKey: 'user_id',
  as: 'CollectedOrders'
});
Order.belongsTo(User, {
  foreignKey: 'cash_collected_by',
  targetKey: 'user_id',
  as: 'CashCollector'
});

// ⚡ Adding the Creator association for the POS
User.hasMany(Order, {
  foreignKey: 'staff_id',
  sourceKey: 'user_id',
  as: 'CreatedOrders'
});
Order.belongsTo(User, {
  foreignKey: 'staff_id',
  targetKey: 'user_id',
  as: 'Creator'
});

//Routes
app.get('/', (req:Request, res:Response) =>{
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
    await sequelize.sync({force: false, alter: true});
    console.log('✅ Database synced.')

    //3. start listening if DB connects
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};

startServer();





