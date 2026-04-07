import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
    Users, Plus, KeyRound, Shield, Clock, RefreshCw, Lock, 
    MoreVertical, UserPlus, X, Loader2, Dices, Mail, Ban, 
    CheckCircle2, Trash2, Edit2, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { jwtDecode } from 'jwt-decode';

export default function StaffManagement() {
    const [staff, setStaff] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null); // Determines if we are Creating or Editing

    const token = localStorage.getItem('token');
    const { user } = useAuth();
    const config = {
        headers: { Authorization: `Bearer ${token}` },
        venueId: user.venueId
    };

    const [currentUser, setCurrentUser] = useState(null);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const dropdownRef = useRef(null);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        role: 'WAITER',
        pin: '',
        email: '',
        password: ''
    });

    const fetchStaff = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('/api/auth/staff', config);
            setStaff(res.data);
        } catch (error) {
            toast.error('Failed to load staff roster');
            console.error('Failed to load staff:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) setCurrentUser(jwtDecode(token));

        fetchStaff();

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleGeneratePin = () => {
        const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
        setFormData(prev => ({ ...prev, pin: randomPin }));
    };

    const openModal = (staffMember = null) => {
        setActiveDropdown(null);
        if (staffMember) {
            // EDIT MODE
            setEditingStaff(staffMember);
            setFormData({
                username: staffMember.username,
                role: staffMember.role,
                pin: '', // Hidden in edit mode
                email: staffMember.email || '',
                password: '' // Hidden in edit mode
            });
        } else {
            // CREATE MODE
            setEditingStaff(null);
            setFormData({ username: '', role: 'WAITER', pin: '', email: '', password: '' });
        }
        setIsModalOpen(true);
    };

    // ⚡ COMBINED CREATE & UPDATE HANDLER
    const handleSaveStaff = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingStaff) {
                // Update Existing
                await axios.patch(`/api/auth/staff/${editingStaff.user_id}`, {
                    username: formData.username,
                    role: formData.role
                }, config);
                toast.success('Staff member updated successfully.');
            } else {
                // Create New
                await axios.post('/api/auth/register/staff', formData, config);
                toast.success(`${formData.role.replace('_', ' ')} provisioned successfully.`);
            }
            setIsModalOpen(false);
            fetchStaff(); 
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save staff member.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ⚡ DELETE HANDLER
    const handleDeleteStaff = async (staffId, name) => {
        setActiveDropdown(null);
        if (!window.confirm(`CRITICAL WARNING: Are you absolutely sure you want to permanently delete ${name}? This action cannot be undone.`)) return;

        try {
            await axios.delete(`/api/auth/staff/${staffId}`, config);
            setStaff(staff.filter(s => s.user_id !== staffId));
            toast.success('Staff member deleted permanently.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete staff member.');
        }
    };

    const handleToggleStatus = async (staffId, newStatus) => {
        try {
            const res = await axios.patch(`/api/auth/staff/${staffId}/status`, { is_active: newStatus }, config);
            setStaff(staff.map(member =>
                member.user_id === staffId ? { ...member, is_active: newStatus } : member
            ));
            toast.success(res.data.message);
            setActiveDropdown(null);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to change status.');
        }
    };

    const handleResetPin = (staffId) => {
        setActiveDropdown(null);
        toast.info("PIN Reset feature coming soon.");
    };

    const getRoleBadge = (role) => {
        switch (role) {
            case 'OWNER': return { icon: <ShieldAlert size={14} />, color: 'text-purple-700 bg-purple-100 border-purple-200' };
            case 'MANAGER': return { icon: <Shield size={14} />, color: 'text-indigo-700 bg-indigo-100 border-indigo-200' };
            case 'KITCHEN_STAFF': return { icon: <Shield size={14} />, color: 'text-amber-700 bg-amber-100 border-amber-200' };
            default: return { icon: <Shield size={14} />, color: 'text-blue-700 bg-blue-100 border-blue-200' };
        }
    };

    // Sub-component for the Action Dropdown
    const ActionMenu = ({ member, canModify }) => (
        <div ref={dropdownRef} className="absolute right-0 md:right-8 top-10 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="p-1">
                {canModify ? (
                    <>
                        <button onClick={() => openModal(member)} className="w-full flex items-center gap-2 px-3 py-2.5 md:py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors text-left">
                            <Edit2 size={16} /> Edit Details & Role
                        </button>
                        
                        {!['OWNER', 'MANAGER'].includes(member.role) && (
                            <button onClick={() => handleResetPin(member.user_id)} className="w-full flex items-center gap-2 px-3 py-2.5 md:py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors text-left">
                                <RefreshCw size={16} /> Reset Access PIN
                            </button>
                        )}

                        <div className="h-px bg-slate-100 my-1 mx-2"></div>
                        
                        <button 
                            onClick={() => handleToggleStatus(member.user_id, !member.is_active)}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 md:py-2 text-sm rounded-lg transition-colors text-left ${member.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                        >
                            {member.is_active ? <><Ban size={16} /> Suspend Access</> : <><CheckCircle2 size={16} /> Restore Access</>} 
                        </button>

                        <button 
                            onClick={() => handleDeleteStaff(member.user_id, member.username)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 md:py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left mt-1"
                        >
                            <Trash2 size={16} /> Delete Permanently
                        </button>
                    </>
                ) : (
                    <div className="px-3 py-3 md:py-2 text-xs text-slate-400 text-center italic">
                        System Locked<br/>(Insufficient Permissions)
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 min-h-screen bg-slate-50 md:bg-transparent">
            
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 shrink-0">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                        <Users className="text-indigo-500" />
                        Organization Roster
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mt-1">Manage hierarchy, floor access, and security.</p>
                </div>
                <button 
                    onClick={() => openModal()}
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-sm shadow-indigo-200 w-full sm:w-auto"
                >
                    <Plus size={20} />
                    Provision User
                </button>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                    <Loader2 className="animate-spin mb-4" size={32} />
                    <p className="font-bold tracking-tight">Loading roster...</p>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && staff.length === 0 && (
                <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                        <Users size={32} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800">No staff found</h3>
                    <p className="text-slate-500 font-medium mt-1">Click "Provision User" to build your team.</p>
                </div>
            )}

            {/* ⚡ MOBILE UI: Card Grid Layout (Hidden on Desktop) */}
            <div className="md:hidden space-y-4 pb-20">
                {!isLoading && staff.map((member) => {
                    const roleStyle = getRoleBadge(member.role);
                    const isSelf = currentUser?.userId === member.user_id;
                    const isMasterOwner = member.role === 'OWNER';
                    const canModify = !isSelf && (!isMasterOwner || currentUser?.role === 'OWNER');

                    return (
                        <div key={member.user_id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative">
                            
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-black text-lg border border-slate-200 shrink-0">
                                        {member.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 text-lg leading-none mb-1">{member.username}</h3>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${roleStyle.color}`}>
                                            {roleStyle.icon} {member.role.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                                <div className="relative">
                                    <button 
                                        onClick={() => setActiveDropdown(activeDropdown === member.user_id ? null : member.user_id)}
                                        className="p-2 -mr-2 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-lg"
                                    >
                                        <MoreVertical size={20}/>
                                    </button>
                                    {activeDropdown === member.user_id && <ActionMenu member={member} canModify={canModify} />}
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs font-bold pt-3 border-t border-slate-100">
                                <span className={`flex items-center gap-1 ${member.is_active ? 'text-emerald-600' : 'text-red-600'}`}>
                                    <div className={`w-2 h-2 rounded-full ${member.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                    {member.is_active ? 'Active' : 'Suspended'}
                                </span>
                                <span className="text-slate-400 flex items-center gap-1">
                                    <Clock size={12} />
                                    {member.last_login ? new Date(member.last_login).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ⚡ DESKTOP UI: Data Table Layout (Hidden on Mobile) */}
            <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                {!isLoading && staff.length > 0 && (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider font-black">
                                <th className="p-4 pl-6">Personnel</th>
                                <th className="p-4">Assigned Role</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Last Active</th>
                                <th className="p-4 pr-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {staff.map((member) => {
                                const roleStyle = getRoleBadge(member.role);
                                const isSelf = currentUser?.userId === member.user_id;
                                const isMasterOwner = member.role === 'OWNER';
                                const canModify = !isSelf && (!isMasterOwner || currentUser?.role === 'OWNER');

                                return (
                                    <tr key={member.user_id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-black border border-slate-200 shrink-0">
                                                    {member.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-slate-900 block leading-tight">{member.username}</span>
                                                    {member.email && <span className='text-[10px] md:text-xs font-medium text-slate-500'>{member.email}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] md:text-xs font-black uppercase tracking-wider border ${roleStyle.color}`}>
                                                {roleStyle.icon}
                                                {member.role.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-wider border ${member.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                {member.is_active ? 'Active' : 'Suspended'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                                <Clock size={14} />
                                                {member.last_login ? new Date(member.last_login).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never logged in'}
                                            </div>
                                        </td>
                                        <td className="p-4 pr-6 text-right relative">
                                            <button 
                                                onClick={() => setActiveDropdown(activeDropdown === member.user_id ? null : member.user_id)}
                                                className="p-2 text-slate-400 hover:text-slate-900 bg-white hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-xl transition-all focus:outline-none"
                                            >
                                                <MoreVertical size={18}/>
                                            </button>
                                            {activeDropdown === member.user_id && <ActionMenu member={member} canModify={canModify} />}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Slide-out Panel / Modal for Provisioning & Editing */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />
                    
                    <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-5 md:p-6 border-b border-slate-100 bg-slate-50 shrink-0">
                            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                                {editingStaff ? <Edit2 className="text-indigo-500" size={24} /> : <UserPlus className="text-indigo-500" size={24} />}
                                {editingStaff ? 'Edit Staff Details' : 'Provision User'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-100 transition-colors shadow-sm">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar p-5 md:p-6">
                            <form id="staff-form" onSubmit={handleSaveStaff} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Operational Role</label>
                                    <select 
                                        value={formData.role} 
                                        onChange={(e)=> setFormData({...formData, role: e.target.value})} 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base md:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none"
                                    >
                                        <option value="" disabled>Select Role</option>
                                        <option value="WAITER">Floor Waiter</option>
                                        <option value="KITCHEN_STAFF">Kitchen KDS Operator</option>
                                        {/* Owners can assign Managers or other Owners */}
                                        {currentUser?.role === 'OWNER' && <option value="MANAGER">General Manager</option>}
                                        {currentUser?.role === 'OWNER' && <option value="OWNER">Co-Owner</option>}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Display Name / Username</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={formData.username}
                                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                                        placeholder="e.g. John Doe"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base md:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner"
                                    />
                                </div>

                                {/* ONLY SHOW AUTH FIELDS IF CREATING NEW USER */}
                                {!editingStaff && (
                                    <>
                                        {['MANAGER', 'OWNER'].includes(formData.role) ? (
                                            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-slate-700">Email Address (Login ID)</label>
                                                    <div className="relative">
                                                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="manager@venue.com" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-base md:text-sm font-medium focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold text-slate-700">Dashboard Password</label>
                                                    <div className="relative">
                                                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input type="password" required minLength="6" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="••••••••" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-base md:text-sm font-medium focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner" />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                                                <label className="text-sm font-bold text-slate-800 flex justify-between">
                                                    <span>4-Digit Access PIN</span>
                                                </label>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input type="text" maxLength="4" pattern="\d{4}" value={formData.pin} onChange={(e) => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})} placeholder="••••" className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 tracking-widest font-mono text-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner" />
                                                    </div>
                                                    <button type="button" onClick={handleGeneratePin} className="bg-indigo-100 text-indigo-700 px-4 rounded-xl border border-indigo-200 hover:bg-indigo-200 hover:border-indigo-300 flex items-center gap-2 font-bold transition-colors active:scale-95 shadow-sm" title="Auto-generate secure PIN">
                                                        <Dices size={20} />
                                                    </button>
                                                </div>
                                                <p className="text-[10px] md:text-xs font-medium text-indigo-600/80 mt-1">Provide this secure PIN to the staff member for POS/KDS terminal access.</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </form>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 md:p-6 border-t border-slate-100 bg-white flex gap-3 shrink-0 pb-safe">
                            <button 
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 px-4 py-3.5 text-sm md:text-base text-slate-700 bg-slate-100 border border-transparent rounded-xl font-bold hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                form="staff-form"
                                disabled={
                                    isSubmitting || 
                                    (!editingStaff && formData.role !== 'MANAGER' && formData.role !== 'OWNER' && formData.pin.length !== 4) || 
                                    (!editingStaff && ['MANAGER','OWNER'].includes(formData.role) && formData.password.length < 6)
                                }
                                className="flex-1 px-4 py-3.5 text-sm md:text-base bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (editingStaff ? 'Save Changes' : 'Provision User')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}