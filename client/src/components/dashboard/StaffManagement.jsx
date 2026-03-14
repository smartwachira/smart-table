import React, { useState, useEffect,useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
    Users, Plus, KeyRound, Shield, Clock,RefreshCw,Lock, 
    MoreVertical, UserPlus, X, Loader2, Dices,Mail,Ban
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { jwtDecode } from 'jwt-decode';

export default function StaffManagement() {
    const [staff, setStaff] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const token = localStorage.getItem('token');
    const {user} = useAuth();
    const config = {headers: {
        Authorization: `Bearer ${token}`},
        venueId: user.venueId
    }

    //Auth Context (Who is logged in right now?)
    const [currentUser, setCurrentUser] = useState(null);
    //Dropdown Action Menu
    const [activeDropdown, setActiveDropdown] = useState(null);
    const dropdownRef = useRef(null);
    
    // Form State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        role: 'WAITER',
        pin: '',
        email:'',
        password: ''
    });

    const fetchStaff = async () => {
        setIsLoading(true);
        try {
            // Assuming Axios interceptors attach the Bearer token
            const res = await axios.get('/api/auth/staff',config);
            setStaff(res.data);
        } catch (error) {
            toast.error('Failed to load staff roster');
            console.error('Failed to load staff roster:',error)
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch Staff on Mount
    useEffect(() => {
        //Decode token to know our own role and ID for safeguard
        const token  = localStorage.getItem('token');
        if (token) setCurrentUser(jwtDecode(token));

        fetchStaff();

        //Close dropdown if clicked outside
        const handleClickOutside = (event)=>{
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)){
                setActiveDropdown(null);
            }
        };
        document.addEventListener("mousedown",handleClickOutside);
        return () => document.removeEventListener('mousedown',handleClickOutside)
    },[]);

    const handleGeneratePin = () => {
        const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
        setFormData(prev => ({ ...prev, pin: randomPin }));
    };

    const handleCreateStaff = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.post('/api/auth/register/staff', formData,config);
            toast.success(`${formData.role.replace('_', ' ')} provisioned successfully.`);
            setIsModalOpen(false);
            setFormData({ username: '', role: 'WAITER', pin: '' });
            fetchStaff(); // Refresh the list
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to provision staff.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (staffId,newStatus) =>{
        try {
            
            const res = await axios.patch(`/api/auth/staff/${staffId}/status`,{is_active: newStatus},config);

            //Update the local state to reflect the change instantly
            setStaff(staff.map(member =>
                member.user_id === staffId ? {...member, is_active: newStatus} : member
            ));

            toast.success(res.data.message);
            setActiveDropdown(null);
        } catch (error){
            
            toast.error(error.response?.data?.message || 'Failed to change status.')
        }
    };

    const handleResetPin = (staffId) =>{
        setActiveDropdown(null);
        toast.info("PIN Reset feature coming soon.");
    };

    //Role styling helper
    const getRoleBadge = (role)=>{
        switch(role){
            case 'OWNER': return  { icon: <Shield size={16}/>, color: 'text-purple-700 bg-purple-100 border-purple-200'};
            case 'MANAGER': return {icon: <Shield size={16}/>, color: 'text-indigo-700 bg-indigo-100 border-indigo-200'};
            case 'KITCHEN_STAFF': return {icon: <Shield size={16}/>, color: 'text-amber-700 bg-amber-100 border-amber-200'};
            default: return {icon: <Shield size={16}/>, color: 'text-blue-700 bg-blue-100 border-blue-200'};
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Users className="text-indigo-500" />
                        Organization Roster
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Manage hierarchy, floor access, and security.</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-medium transition-all active:scale-95 shadow-sm shadow-indigo-200 w-full sm:w-auto justify-center"
                >
                    <Plus size={20} />
                    Provision User
                </button>
            </div>

            {/* Staff Data Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-sm text-slate-500 uppercase tracking-wider">
                                <th className="p-4 font-semibold">Personnel</th>
                                <th className="p-4 font-semibold">Assigned Role</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold">Last Active</th>
                                <th className="p-4 text-right font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-400">
                                        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                                        Loading roster...
                                    </td>
                                </tr>
                            ) : staff.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500">
                                        No staff provisioned yet. Click "Provision Staff" to begin.
                                    </td>
                                </tr>
                            ) : (
                                staff.map((member) => {
                                    const roleStyle = getRoleBadge(member.role);
                                    // Determine if the current logged-in user is allowed to modify this member
                                    const isSelf = currentUser?.userId === member.user_id;
                                    const isMasterOwner = member.role === 'OWNER';
                                    const canModify = !isSelf && !isMasterOwner && (currentUser?.role === 'OWNER' || member.role !== 'MANAGER');

                                    return (
                                        <tr key={member.user_id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-4">
                                                <div className="flex  items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold border border-slate-200">
                                                        {member.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-slate-900">{member.username}</span>
                                                        {member.email && <span className='text-xs text-slate-500'>{member.email}
                                                            </span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${roleStyle.color}`}>
                                                    {roleStyle.icon}
                                                    {member.role.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${member.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                                    {member.is_active ? 'Active' : 'Suspended'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                                    <Clock size={16} />
                                                    {member.last_login 
                                                        ? new Date(member.last_login).toLocaleDateString('en-US',{
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        }) 
                                                        : 'Never logged in'}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right relative">
                                                <button 
                                                    onClick={() => setActiveDropdown(activeDropdown === member.user_id ? null : member.user_id)}
                                                    className={"p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"}
                                                >
                                                    <MoreVertical size={20}/>
                                                </button>

                                                {/* Dropdown Menu */}
                                                {activeDropdown === member.user_id && (
                                                    <div ref={dropdownRef} className="absolute right-8 top-10 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                        <div className="p-1">
                                                            {!['OWNER','MANAGER'].includes(member.role) && (
                                                                <button onClick={()=>handleResetPin(member.user_id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors text-left">
                                                                    <RefreshCw size={16}/> Reset PIN
                                                                </button>
                                                            )}

                                                            {/* Only show suspend/restore if authorized */}
                                                            {canModify ? (
                                                                <button 
                                                                    onClick={()=>handleToggleStatus(member.user_id,!member.is_active)}
                                                                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left mt-1 ${member.is_active ? 'text-red-600 hover:bg-red-50':'text-emerald-600 hover:bg-emerald-50'
                                                                }`}
                                                                >
                                                                    {member.is_active ? <><Ban size={16} /> Suspend Access</> : <><CheckCircle2 size={16} /> Restore Access</>} 
                                                                </button>
                                                            ) : (
                                                                <div className="px-3 py-2 text-xs text-slate-400 text-center italic border-t border-slate-100 mt-1">
                                                                    System locked role
                                                                </div>

                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                        )
                                    })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Slide-out Panel / Modal for Provisioning */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    
                    <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                                <UserPlus className="text-indigo-500" size={24} />
                                Provision User
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateStaff} className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">Operational Role</label>
                                <select 
                                    value={formData.role} 
                                    onChange={(e)=> setFormData({...formData, role: e.target.value})} 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all apperance-none">
                                        <option value="" disabled>Select User</option>
                                        <option value="WAITER">Floor Waiter</option>
                                        <option value="KITCHEN_STAFF">Kitchen KDS Operator</option>
                                        {/* Only let Owners create Managers */}
                                        {currentUser?.role === 'OWNER' && <option value="MANAGER">General Manager</option>}
                                    </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">Display Name / Username</label>
                                <input 
                                    type="text" 
                                    required
                                    value={formData.username}
                                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                                    placeholder="e.g. John Doe"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                />
                            </div>

                            {/* CONDITIONAL RENDER:Manager fields vs Floor Staff fields */}
                            {formData.role === 'MANAGER' ? (
                                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">Email Address (Login ID)</label>
                                        <div className="relative">
                                            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="manager@venue.com" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-indigo-500/50 transition-all" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">Dashboard Password</label>
                                        <div className="relative">
                                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="password" required minLength="6" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="••••••••" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-indigo-500/50 transition-all" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2">
                                    <label className="text-sm font-medium text-slate-700 flex justify-between">
                                        <span>4-Digit Access PIN</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="text"  maxLength="4" pattern="\d{4}" value={formData.pin} onChange={(e) => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})} placeholder="••••" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 tracking-widest font-mono text-lg focus:ring-2 focus:ring-indigo-500/50 transition-all" />
                                        </div>
                                        <button type="button" onClick={handleGeneratePin} className="bg-indigo-50 text-indigo-700 px-4 rounded-xl border border-indigo-100 hover:bg-indigo-100 flex items-center gap-2 font-medium transition-colors" title="Auto-generate secure PIN">
                                            <Dices size={20} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Provide this PIN to the staff member for terminal access.</p>
                                </div>
                            )}
                                               

                            <div className="pt-4 mt-6 border-t border-slate-100 flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 text-slate-600 bg-white border border-slate-200 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={
                                        isSubmitting || 
                                        // If it's Floor Staff, enforce 4 digit PIN
                                        (formData.role !== 'MANAGER' && formData.pin.length !== 4) || 
                                        // If it's a Manager, enforce a 6 character password
                                        (formData.role === 'MANAGER' && formData.password.length < 6)
                                    }
                                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-indigo-200"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Save & Provision'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}