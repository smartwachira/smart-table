//import { Outlet} from '../components/Navbar';
import Navbar from '../components/Navbar';

const Mainlayout = ()=>{
    return (
        <div className="min-h-screen bg-surface-light">
            <Navbar/>
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20">
                <Outlet/>
            </main>
        </div>
    );
};

export default Mainlayout;