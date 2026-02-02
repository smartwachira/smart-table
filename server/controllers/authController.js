import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "YOUR_SECRET_KEY";

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
            role: user.role,
            username: user.username,
            venueId: user.venue_id
        })
    } catch (error){
        console.error('Login Error:', error);
        res.status(500).json({ message:"Server error"});
    }
};
