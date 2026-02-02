import { useState } from 'react';
import axios from  'axios';
import { useNavigate} from 'react-router-dom';
import './Login.css';

const Login = ()=>{
    //The memory
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e)=>{
        e.preventDefault();
        try{
            //authourise
            //The Handshake
            const res = await axios.post('/api/auth/login',{username, password});

            // SAVE THE BADGE
            localStorage.setItem("token", res.data.token);
            localStorage.setItem('role',res.data.role);
            localStorage.setItem('venueId',res.data.venue_id);

            alert(`Welcome back, ${res.data.role}!`);

            //Redirect based on Rank
            if (res.data.role === "kitchen"){
                navigate(`/kitchen/${res.data.venueId}`);
            } else if(res.data.role === "manager"){
                navigate(`/kitchen/${res.data.venueId}`);
            } else{
                navigate('/')
            }
            
        } catch(err){
            alert("Invalid Username or Password");
            console.log((err));
        }
    };

    return(
        <div className="login-container">
            <form onSubmit={handleLogin} className="login-form">
                <h2>Staff Portal</h2>
                <input type="text" placeholder='Username' value={username} onChange={(e)=>setUsername(e.target.value)}/>
                <input type="password" placeholder=' password' value={password} onChange={(e)=> setPassword(e.target.value)} />
                <button type='submit'>Login</button>
            </form>
        </div>    
    )
};
export default Login;