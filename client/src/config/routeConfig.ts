import { 
    LayoutDashboard, 
    MonitorSmartphone, 
    ChefHat, 
    History, 
    UtensilsCrossed, 
    QrCode, 
    Users, 
    Settings,
    Receipt
} from 'lucide-react';
import { UserRole } from '../context/AuthContext';

// 🛡️ Strict typing for our configuration
export interface RouteConfig {
    label: string;
    path: string;
    icon: React.ElementType;
    allowedRoles: UserRole[];
    showInSidebar: boolean; // Allows us to have hidden routes (like /checkout) that still have RBAC
}

export const dashboardRoutes: RouteConfig[] = [
    {
        label: 'Overview',
        path: '/dashboard',
        icon: LayoutDashboard,
        allowedRoles: ['OWNER', 'MANAGER'],
        showInSidebar: true,
    },
    {
        label: 'Live Orders',
        path: '/dashboard/orders',
        icon: ChefHat,
        // Everyone needs to see live orders, but their view/actions will differ inside the component
        allowedRoles: ['OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN_STAFF'],
        showInSidebar: true,
    },
    {
        label: 'Terminal (POS)',
        path: '/dashboard/pos',
        icon: MonitorSmartphone,
        allowedRoles: ['OWNER', 'MANAGER', 'CASHIER', 'WAITER'],
        showInSidebar: true,
    },
    {
        label: 'My Orders (Tips)',
        path: '/dashboard/my-orders',
        icon: Receipt,
        allowedRoles: ['OWNER', 'MANAGER', 'CASHIER', 'WAITER'],
        showInSidebar: true,
    },
    {
        label: 'Order History',
        path: '/dashboard/history',
        icon: History,
        allowedRoles: ['OWNER', 'MANAGER', 'CASHIER'],
        showInSidebar: true,
    },
    {
        label: 'Menu Management',
        path: '/dashboard/menu',
        icon: UtensilsCrossed,
        allowedRoles: ['OWNER', 'MANAGER'],
        showInSidebar: true,
    },
    {
        label: 'Print Center (QR)',
        path: '/dashboard/qr',
        icon: QrCode,
        allowedRoles: ['OWNER', 'MANAGER'],
        showInSidebar: true,
    },
    {
        label: 'Staff Roster',
        path: '/dashboard/staff',
        icon: Users,
        allowedRoles: ['OWNER', 'MANAGER'], // Managers can see it to reset PINs
        showInSidebar: true,
    },
    {
        label: 'Venue Settings',
        path: '/dashboard/settings',
        icon: Settings,
        allowedRoles: ['OWNER'], // Strictly locked down to the principal
        showInSidebar: true,
    }
];