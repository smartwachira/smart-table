import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Venue from '../models/Venue.js';
import sequelize from "../config/db.js";

const JWT_SECRET = process.env.JWT_SECRET || "YOUR_SECRET_KEY";

//1. VENUE ONBOARDING (Creates Restaurant + Manager)

export const registerVenue = async ( req, res) =>{
    //start a transaction: If User creation fails, the venue creation is rolled back!
    const t = await sequelize.transaction();

    try {
         const{ venueName,location,managerName,managerEmail, managerPassword} = req.body;

         //1. Check if the email is already in use across the entire system
         const existingUser = await User.findOne({
            where: {email: managerEmail}
         });
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
         const newManager = await User.create({
            username: managerName,
            email: managerEmail,
            password: hashedPassword,
            role: 'manager',
            venue_id: newVenue.venue_id
         },{transaction:t});

         //5. Commit  the transaction (Save both to database)
         await t.commit();

         //6. Generate JWT Token
         const token = jwt.sign(
            {
                userId: newManager.user_id,
                role: newManager.role,
                venueId: newManager.venueId
            },
            JWT_SECRET,
            { expiresIn: '12h'}
         );

         res.status(201).json({
            message: "Venue and Manager account created successfully!",
            token,
            user: { 
                name: newManager.usernamename,
                role: newManager.role,
                venue_id: newManager.venue_id
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

//2. Staff Registration (Adding Chefs & Waiters)

export const registerStaff =  async(req, res)=>{
    const t = await sequelize.transaction();
    try{
        const { username, email, password ,role, venueId} = req.body;

        //1. Verify the venue actually exists
        const venue = await Venue.findByPk(venueId);
        if (!venue) return res.status(404).json({ message: 'Invalid Venue ID.'});

        //2. Check for duplicate email
        const existingUser = await User.findOne({ where: {email} });
        if (existingUser) return res.status(400).json({ message: "Email already in use."});

        //3. Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        //4. Create Staff Member
        const newStaff = await User.create({
            username,
            email,
            password: hashedPassword,
            role: role || 'kitchen', //Default to kitchen if not provided
            venue_id: venueId
        },{transaction:t});

        await t.commit();

        //5. Generate Token so they are instantly logged in
        const token = jwt.sign(
            {
                userId: newStaff.user_id,
                role:newStaff.role,
                venueId:newStaff.venue_id
            },
            JWT_SECRET,
            { expiresIn: '12h'}
        );

        res.status(201).json({
            message: 'Staff account created successfully!',
            token,
            user: {
                name: newStaff.username,
                role: newStaff.role,
                venue_id: newStaff.venue_id
            }
        })
    } catch (error){
        await t.rollback();
        console.error("Staff Registration Error:", error);
        res.status(500).json({ message: "Failed to register staff."})
    }
    
}

//Universal Login


export const login = async (req,res ) =>{
    try{
        const { username, password } = req.body;

        // 1. Check if user exists
        const user = await User.findOne({ where: {username}});
        if (!user){
            return res.status(401).json({message: 'Invalid credentials'})
        }
        

        // 2. Compare the password (Hash vs Plaintext)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch){
            return res.status(401).json({message: 'Invalid credentials'})
        }

        //3. Generate the Digital Badge (JWT Token)
        const token = jwt.sign(
            {
                userId: user.user_id,
                role: user.role,
                venueId: user.venue_id
            },
            JWT_SECRET,
            { expiresIn: '12h' }
        );

        //4. Send back the token and user info
        res.json({
            message: 'Login successful',
            token,
            user: {
                name:user.name,
                role:user.role,
                venue_id: user.venue_id
            }
        })
    } catch (error){
        console.error('Login Error:', error);
        res.status(500).json({ message:"Server error"});
    }
};
