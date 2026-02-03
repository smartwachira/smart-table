import { Navigate } from 'react-router-dom';

//This component acts as a bouncer
const PrivateRoute = ({ children, allowedRoles }) => {
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("role");

    //1. Check if logged in
    if (!token){
        return <Navigate to="/login"></Navigate>
    }

    //2. Check if the user has the right Rank 
    if (allowedRoles && !allowedRoles.includes(userRole)){
        alert("Access Denied: You do not have permission to view this page.");
        return <Navigate to="/"></Navigate>
    }

    //3. If all clear, render the page (children)
    return children;
};

export default PrivateRoute;