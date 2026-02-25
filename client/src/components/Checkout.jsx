import { useState } from 'react';
import {useNavigate} from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Smartphone, MapPin, ShieldCheck, Loader2   } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const Checkout = ()=>{
    const { cartItems, cartTotal, clearCart} = useCart();
    const navigate = useNavigate();

    //Form  State
    const [tableNumber, setTableNumber] = useState('');
    const [phone, setPhone] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleCheckout = async (e) =>{
        e.preventDefault();

        //1. Basic Validation
        if (!tableNumber || !phone){
            return toast.error("Please fill in all fields");
        }

        if (phone.length < 10){
            return toast.error("Please enter a valid phone number");
        }

        setIsProcessing(true);
        toast.loading("Initiating M-Pesa STK Push...", { id: 'mpesa' });

        try {
            //2. Data Transformation (Mapping Frontend State to Backend Schema)
            const orderPayLoad = {
                table_number: tableNumber,
                phone_number: phone,
                total_amount: cartTotal,
                items: cartItems.map(item=>({
                    item_id: item.id,
                    quantity: item.quantity,
                    price: item.price

                }))
            };

            //3. Network Request
            await axios.post('/api/orders',orderPayLoad);


            //4. Success Handling
            toast.success("Payment Received! Order placed.",{ id: 'mpesa'});
            clearCart();

            //Navigate to orders page (In the future, we can pass the specific order ID)
            navigate('/orders');

        } catch (error){
            //5. Error Handling
            console.error("Checkout Error:",error);

            const errorMessage = error.response?.data?.message || "Checkout failed. Please try again.";
            toast.error(errorMessage, {id: 'mpesa'});
        } finally {
            //6. Cleanup (Always runs)
            setIsProcessing(false);
        }


    }

    //Prevent checkout if cart is empty
    if (cartItems.length ===0){
        return (
            <div className="flex flex-col items-center justify-center h-96 text-center px-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
                <p className="text-gray-500 mb-6">Add some delicious items before Checking out.</p>
                <button className="bg-brand-primary text-white px-6 py-2 rounded-lg font-medium">
                    Back to Menu
                </button>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto animate-fadeIn">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden md:flex">

                {/**Left Column: Order Summary */}
                <div className="bg-surface-muted p-6 md:w-5/12 border-b md:border-b-0 md:border-r border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
                    <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
                        {cartItems.map(item =>(
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">{item.quantity}x{item.name}</span>
                                <span className='font-medium text-gray-900'>{(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                    <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                        <span className="font-bold text-gray-900 text-lg">Total</span>
                        <span className="font-bold text-brand-primary text-xl">{cartTotal.toLocaleString()} KES</span>
                    </div>
                </div>

                {/* Right Column: Payment Form */}
                <div className="p-6 md:w-7/12">
                    <form onSubmit={handleCheckout} className="space-y-5">

                        {/* Table Number Input */}
                        <div>
                            <label  className="block text-sm font-medium text-gray-700 mb-1">Table Number</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MapPin className="h-5 w-5 text-gray-400"></MapPin>
                                </div>
                                <input 
                                    type="number" 
                                    required
                                    value={tableNumber}
                                    onChange={(e)=> setTableNumber(e.target.value)}
                                    placeholder='e.g. 12'
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-brand-primary focus:border-brand-primary transition-colors" />
                            </div>
                        </div>

                        {/* Phone Number Input (Mpesa Styling) */}
                        <div>
                            <label htmlFor="" className="block text-sm font-medium text-gray-700 mb-1">M-Pesa Mobile Number</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Smartphone className="h-5 w-5 text-[#52B520]"/>
                                </div>
                                <input 
                                    placeholder='07XX XXX XXX'
                                    type="tel"
                                    value={phone} 
                                    onChange={(e)=>setPhone(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-[#52B520] focus:border-[#52B520] transition-colors font-medium" />
                            </div>
                            <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                                <ShieldCheck size={14} className='text-[#52B520]'></ShieldCheck>
                                Keep your phone unlocked. A prompt will appear shortly.
                            </p>
                        </div>

                        {/* Submit Button */}
                        <button 
                            type='submit'
                            disabled={isProcessing}
                            className={`w-full mt-6 py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg
                                ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#52B520] hover:bg-[#459ela] active:scale-95 shadow-[#52B520]/30'}`}
                        >
                            {isProcessing ? (
                                <><Loader2 className='animate-spin' size={20}/> Awaiting PIN...</>

                            ):(
                                `Pay ${cartTotal.toLocaleString()} Kes with Mpesa`
                            )}
                        </button>
                        
                    </form>
                </div>
            </div>
        </div>
    )
};

export default Checkout;