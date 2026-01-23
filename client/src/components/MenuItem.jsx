// This component handles one single dish. Doesn't care about fetching data; it just displays what it's given
import { useCart } from  '../context/CartContext';
import './Menu.css';

const MenuItem = ({item}) => {
    const {addToCart} = useCart();
    return (
        <div className="menu-item">
            <div className="item-info">
                <h3 className="item-name">{item.name}</h3>
                <p className="item-desc">{item.description}</p>
                <span className="item-price"> KES {item.price}</span>
            </div>

            <button className='add-btn' onClick={()=> addToCart(item )}>+</button>
        </div>
    );

};

export default MenuItem;