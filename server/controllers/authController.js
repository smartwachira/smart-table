import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Venue from '../models/Venue.js';
import sequelize from "../config/db.js";

const JWT_SECRET = process.env.JWT_SECRET || "YOUR_SECRET_KEY";

const generateToken = (user)=>{
    return jwt.sign(
        { userId: user.user_id,
            role: user.role,
            venueId: user.venue_id
        },
        JWT_SECRET,
        { expiresIn: '12h'}

    );
};

//1. VENUE ONBOARDING (Creates Venue + Master Owner)

export const registerVenue = async ( req, res) =>{
    //start a transaction: If User creation fails, the venue creation is rolled back!
    const t = await sequelize.transaction();

    try {
         const{ venueName,location,managerName,managerEmail, managerPassword} = req.body;

         //1. Check if the email is already in use across the entire system
         const existingUser = await User.findOne({
            where: {email: managerEmail}
         },{transaction:t});
         if (existingUser){
            return res.status(400).json({ message : "Email is already registered."})
         }

         //2. Create the venue
         const newVenue = await Venue.create({
            name: venueName,
            location: location
         },{transaction:t});

         //3. Hash the Manager's Password securely
         const salt = await bcrypt.genSalt(10);
         const hashedPassword = await bcrypt.hash(managerPassword, salt);

         //4. Create the Master Manager Account tied to the new Venue
         const newOwner = await User.create({
            username: managerName,
            email: managerEmail,
            password: hashedPassword,
            role: 'OWNER',
            venue_id: newVenue.venue_id
         },{transaction:t});

         
         res.status(201).json({
            message: "Venue and Manager account created successfully!",
            token: generateToken(newOwner),
            user: { 
                name: newOwner.username,
                role: newOwner.role,
                venue_id: newOwner.venue_id
            }
         })
    } catch (error){
        await t.rollback();
        console.error("Venue Registration Error:", error);
        res.status(500).json({
            message: "Failed to register venue."
        })
    }
}

//2. STAFF PROVISIONING (Strictly Manager/Owner Execution)

export const registerStaff =  async(req, res)=>{
    
    try{
        //venueId is pulled from the executing Manager's verified JWT, Not the request body
        const managerVenueId = req.user.venueId;
        const { username, pin, role } = req.body;

        if (!['KITCHEN_STAFF', 'WAIT_STAFF'].includes(role)){
            return res.status(400).json({ message: 'Invalid staff role.'});
        }

        //Enforce Multi-tenant unique username
        const existingStaff = await User.findOne({ where: { username, venue_id: managerVenueId}});
        if (existingStaff)return res.status(400).json({
            message: "Username already exists at this venue."
        });

        //Hash the 4-digit PIN
        const salt = await bcrypt.genSalt(10);
        const hashedPin = await bcrypt.hash(pin,salt);

        await User.create({
            username,
            pin: hashedPin,
            role: role,
            venue_id: managerVenueId
        });


        // Do NOT return a token. Managers create staff, they don't log in as them.
        res.status(201).json({
            message: `${role} account created successfully.`
        });

    } catch (error){
        
        console.error("Staff Registration Error:", error);
        res.status(500).json({ message: "Failed to register staff."})
    }
    
};


//3.3. WEB DASHBOARD LOGIN (Owners & Managers)


export const managerLogin = async (req,res ) =>{
    try{
        const { email, password } = req.body;

        // 1. Check if user exists
        const user = await User.findOne({ where: {email}});
        if (!user){
            return res.status(401).json({message: 'Invalid credentials'})
        }
        

        // 2. Compare the password (Hash vs Plaintext)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch){
            return res.status(401).json({message: 'Invalid credentials'})
        }
        //3. Send back the token and user info
        res.json({
            message: 'Login successful',
            token: generateToken(user),
            user: {
                name:user.username,
                role:user.role,
                venue_id: user.venue_id
            }
        })
    } catch (error){
        console.error('Login Error:', error);
        res.status(500).json({ message:"Server error"});
    }
};

// 4. KDS MOBILE LOGIN (Touch-friendly PIN for Staff)
export const staffLogin = async (req,res)=>{
    try {
        const { venue_id, username,pin} = req.body; // KDS App inherently knows its venue_id

        const user = await User.findOne({ where: { venue_id, username}});
        if (!user || !user.pin) return res.status(401).json({message: 'Invalid credentials'});

        const isMatch = await bcrypt.compare(pin, user.pin);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials'});

        res.json({
            token: generateToken(user),
            user: {
                username:user.username,
                role: user.role,
                venue_id: user.venue_id
            },
             message: 'Login successful',
            
        });




    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
}
