import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from "axios";
import './Menu.css';

const Menu = () => {
    const { venueId } = useParams();
    const [venue, setVenue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() =>{
        const fetchMenu = async () =>{
            try {
                //API call(The Request)
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
        }
    }, [venueId]);

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
            <div key={category.category_id} className="menu-category">
              <h2 className="category-title">{category.name}</h2>
              
              <div className="items-list">
                {/* SAFE GUARD: Check if MenuItems exists */}
                {category.MenuItems && category.MenuItems.map((item) => (
                  <div key={item.item_id} className="menu-item">
                    <div className="item-info">
                      <h3 className="item-name">{item.name}</h3>
                      <p className="item-desc">{item.description}</p>
                      <span className="item-price">KES {item.price}</span>
                    </div>
                    <button className="add-btn">+</button>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-menu">
            <p>This venue has no menu categories yet.</p>
          </div>
        )}
      </div>
    </div>
  );

};

export default Menu;
