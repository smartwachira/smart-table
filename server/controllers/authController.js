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
         const newOwner = await User.create({
            username: managerName,
            email: managerEmail,
            password: hashedPassword,
            role: 'OWNER',
            venue_id: newVenue.venue_id
         },{transaction:t});

         await t.commit();

         
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
// Updated to handle Manager creation via Email/Pass

export const registerStaff =  async(req, res)=>{
    
    try{
        //venueId is pulled from the executing Manager's verified JWT, Not the request body
        const managerVenueId = req.user.venueId;
        const creatorRole = req.user.role;
        const { username, pin, role,email,password } = req.body;

        if (!['KITCHEN_STAFF', "WAITER",'MANAGER'].includes(role)){
            return res.status(400).json({ message: 'Invalid role assigment.'});
        }

        //HIERACHY SAFEGUARD: Only Owners can hire Manager
        if (role === 'MANAGER' && creatorRole !== 'OWNER'){
            return res.status(403).json({ message: 'Only the Venue Owner can provision new Managers.'});
        }

        const newUserObj = {username, role, venue_id: managerVenueId}


        // Conditional Auth Setup based on Role
        if (role === 'MANAGER'){
            if (!email || !password) return res.status(400).json({ message: 'Email and Password are requred for Managers.'});

            const existingEmail = await User.findOne({ where: { email,venue_id:managerVenueId}});
            if (existingEmail) return res.status(400).json({ message: 'Email is already registered globally.'});
            const salt = await bcrypt.genSalt(10);
            newUserObj.email = email;
            newUserObj.password = await bcrypt.hash(password,salt)

        } else {
            //Enforce Multi-tenant unique username
        const existingStaff = await User.findOne({ where: { username, venue_id: managerVenueId}});
        if (existingStaff)return res.status(400).json({
            message: "Username already exists at this venue."
        });
        if (!pin || pin.length !== 4) return res.status(400).json({message: 'A 4-digit PIN is required for floor staff.'})

        //Hash the 4-digit PIN
        const salt = await bcrypt.genSalt(10);
        newUserObj.pin = await bcrypt.hash(pin,salt);

        }

        

        await User.create(newUserObj);
        // Do NOT return a token. Managers create staff, they don't log in as them.
        res.status(201).json({
            message: `${role.replace('_',' ')} account provisioned successfully.`
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

        //Update last Active Timestamp
        user.last_login = new Date();
        await user.save();
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

        //Check if manager suspended them
        if (!user.is_active){
            return res.status(403).json({ message: 'Account is suspended. Contact your manager.'})
        }

        const isMatch = await bcrypt.compare(pin, user.pin);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials'});

        //Update last Active Timestamp
        user.last_login = new Date();
        await user.save();

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
        console.error("Staff Login Error:",error);
        res.status(500).json({
            message: "Failed to Login staff ."
        })
    }
}


//get staff
export const getStaff = async (req, res) =>{
    try {
        //The venueId is securely extracted from the Manager's JWT token
        const managerVenueId = req.user.venueId;

        //Fetch all non-manager/owner staff for this specific venue
        const staffList = await User.findAll({
            where: {venue_id: managerVenueId},
            attributes: ['user_id', 'username','email' ,'role', 'is_active', 'last_login', 'created_at'],
            order: [['role','ASC'],['created_at','DESC']]
        });

        res.status(200).json(staffList);
    } catch(error){
        console.error("Fetch Staff Error:",error);
        res.status(500).json({
            message: "Failed to retrive staff roaster."
        })
    }
}

// 5. UPDATE STAFF STATUS (Manager Only)
export const toggleStaffStatus = async (req, res) => {
    try {
        const managerVenueId = req.user.venueId;
        const executingUserId = req.user.userId;
        const { staffId } = req.params;       // The UUID from the URL

        const staff = await User.findOne({ where: {user_id: staffId, venue_id:managerVenueId}});
        if (!staff) return res.status(404).json({message: 'Staff member not found.'});

        //SAFEGUARD 1: Cannot suspend yourself
        if (staff.user_id === executingUserId){
            return res.status(403).json({message: 'You cannot suspend your own account.'})
        }

        //SAFEGUARD 2: Nobody can suspend the Master Owner
        if (staff.role === 'OWNER'){
            return res.status(403).json({ message: 'The Master Owner account cannot be suspended.'});
        }

        //SAFEGUARD 3: Managers cannot suspend other Managers (Only Owners can)
        if(staff.role === 'MANAGER' && req.user.role !== 'OWNER'){
            return res.status(403).json({ message: "Only Owners can suspend Manager accounts."});
        }
        
        

        staff.is_active = !staff.is_active;
        await staffMember.save();

        res.status(200).json({ 
            message: `Staff member is now ${is_active ? 'Active' : 'Inactive'}`,
            is_active: staff.is_active
        });

    } catch (error) {
        // 🌟 THE LIFESAVER: This prevents the server from crashing!
        console.error("Toggle Status Error:", error);
        res.status(500).json({ message: "Failed to update staff status." });
    }
};