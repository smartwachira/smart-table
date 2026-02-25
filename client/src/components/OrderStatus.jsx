import { Clock, ChefHat,CheckCircle2,Receipt} from 'lucide-react';

const MOCK_ORDER = {
    id: "ORD-8X92",
    status: "preparing", //Can be: 'pending', 'preparing', 'delivered'
    total: 2750,
    items: [
        {id: 1, name: "Sizzling Steak", quantity: 1},
        { id: 1, name: "Classic Burger", quantity: 1}
    ],
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})
};

const OrderStatus = ()=>{
    // Helper to determine step colors based on current status
    const getStepColor = (stepStatus) =>{
        const states = ['pending','preparing','delivered'];
        const currentIndex = states.indexOf(MOCK_ORDER.status);
        const stepIndex = states.indexOf(stepStatus);



        if (stepIndex < currentIndex) return 'text-brand-primary bg-brand-primary/10'; //Completed
        if (stepIndex === currentIndex) return 'text-brand-accent bg-brand-accent/10 animate-pulse';
        return 'text-gray-300 bg-gray-50'; //Future
    };

    return (
        <div className="max-w-2xl mx-auto animate-fadeIn">
            <div className="flex items-center gap-3 mb-6">
                <Receipt className="text-brand-primary w-8 h-8"></Receipt>
                <h1 className="text-2xl font-bold text-gray-900">Your Orders</h1>
            </div>

            {/* Order Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                {/* Card Header */}
                <div className="bg-surface-muted p-4 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <p className="text-sm text-gray-500">Order ID</p>
                        <p className="font-bold text-gray-900">{MOCK_ORDER.id}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Time</p>
                        <p className="font-medium text-gray-900">{MOCK_ORDER.createdAt}</p>
                    </div>
                </div>

                {/* Visual Progress Tracker */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex justify-between items-center relative">
                        {/* Connecting Line */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 -z-10 rounded-full"></div>

                        {/* Step 1: Pending */}
                        <div className={`flex flex-col items-center gap-2 bg-white px-2 ${getStepColor('pending')}`}>
                            <div className="p-3 rounded-full bg-inherit"><Clock size={24}></Clock></div>
                            <span className="text-xs font-bold uppercase tracking-wider">Received</span>

                        </div>

                        {/* Step 2: Preparing */}
                        <div className={`flex flex-col items-center gap-2 bg-white px-2 ${getStepColor('preparing')}`}>
                            <div className="p-3 rounded-full bg-inherit"><ChefHat size={24}></ChefHat></div>
                            <span className="text-xs font-bold uppercase tracking">Preparing</span>

                        </div>

                        {/* Step 3: Delivered */}
                        <div className={`flex flex-col items-center gap-2 bg-white px-2 ${getStepColor('delivered')}`}>
                            <div className="p-3 rounded-full bg-inherit"><CheckCircle2 size={24}></CheckCircle2></div>
                            <span className="text-xs font-bold uppercase tracking-wide">Delivered</span>
                        </div>

                         
                    </div>
                </div>

                {/* Order Details */}
                <div className="p-6 bg-surface-muted/30">
                    <h3 className="font-semibold text-gray-900 mb-4">Items</h3>
                    <ul className="space-y-3 mb-4">
                        {MOCK_ORDER.items.map((item,idx) =>(
                            <li key={idx} className="flex justify-between text-sm text-gray-600">
                                <span>{item.quantity}x {item.name}</span>
                            </li>
                        ))}

                    </ul>
                    <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                        <span className="font-bold text-gray-900">Total Paid</span>
                        <span className="font-bold text-brand-primary">{MOCK_ORDER.total.toLocaleString()} KES</span>
                    </div>
                </div>
                

            </div>
        </div>
    );
};

export default OrderStatus;