import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from "axios";
import './Menu.css';
import MenuCategory from './MenuCategory';
import FloatingCart from './FloatingCart';
import { useCart } from '../context/CartContext';

const Menu = () => {
    const { venueId } = useParams();
    const { setVenueId } = useCart();
    const [venue, setVenue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);


    useEffect(() =>{
        const fetchMenu = async () =>{
            try {
                //API call(The GET Request)
                console.log("fetching menu for:", venueId); //debug log 1
                const response = await axios.get(`/api/menu/${venueId}`);

                console.log("API Response Data:", response.data) //debug log 2
                setVenue(response.data);
                setLoading(false);

            } catch (err) {
                console.error("Error fetching menu:", err);
                setError("Failed to load menu. Please scan the QR code again.");
                setLoading(false);
            }
        };

        if (venueId) {
            fetchMenu();
            setVenueId(venueId); // save 
        }
    }, [venueId,setVenueId]);

    //The Rendering (The Display)

    // Gatekeepers - prevent the app from crashing

    if (loading) return <div className="loading">Loading Menu...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!venue) return <div>No menu found.</div>;

    return (
    <div className="menu-container">
      <header className="venue-header">
        <h1>{venue.name}</h1>
        <p className="venue-location">{venue.location}</p>
      </header>

      <div className="menu-content">
        {/* SAFE GUARD: Check if MenuCategories exists before mapping */}
        {venue.MenuCategories && venue.MenuCategories.length > 0 ? (
          venue.MenuCategories.map((category) => (
            <MenuCategory key={category.category_id} category= {category}/>

          ))
        ) : (
          <div className="empty-menu">
            <p>This venue has no menu categories yet.</p>
          </div>
        )}
      </div>
      <FloatingCart/>
    </div>
  );

};

export default Menu;
