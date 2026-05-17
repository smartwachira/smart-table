import React, { useState, useEffect } from 'react';
import { 
    Users, Plus, KeyRound, Shield, Clock, RefreshCw, Lock, 
    MoreVertical, UserPlus, X, Loader2, Dices, Mail, Ban, 
    CheckCircle2, Trash2, Edit2, ShieldAlert, AlertTriangle, MonitorSmartphone
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ⚡ IMPORT THE NEW CUSTOM HOOKS AND TYPES
import { 
    useStaff, useSaveStaff, useToggleStaffStatus, useResetStaffPin, useDeleteStaff,
    StaffMember, StaffFormData 
} from '../../hooks/useStaffManagement';

interface ResetPinModalState {
    isOpen: boolean;
    staffId: string | null;
    name: string;
    pin: string;
}

export default function StaffManagement() {
    const { user } = useAuth();
    const venueId = user?.venueId;
    
    const currentUserRole = user?.role || 'STAFF';
    const currentUserId = user?.userId;

    // Modals & UI State
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
    const [resetPinModal, setResetPinModal] = useState<ResetPinModalState>({ isOpen: false, staffId: null, name: '', pin: '' });
    const [activeMenuData, setActiveMenuData] = useState<{ member: StaffMember, x: number, y: number } | null>(null);
    const [formData, setFormData] = useState<StaffFormData>({ username: '', role: 'WAITER', pin: '', email: '', password: '' });

    // ============================================================================
    // ⚡ TANSTACK QUERY: Abstracted Custom Hooks
    // ============================================================================
    const { data: staff = [], isLoading } = useStaff(venueId);
    
    const saveStaffMutation = useSaveStaff(venueId);
    const toggleStatusMutation = useToggleStaffStatus(venueId);
    const resetPinMutation = useResetStaffPin(venueId);
    const deleteStaffMutation = useDeleteStaff(venueId);

    // ============================================================================
    // UI HANDLERS
    // ============================================================================
    useEffect(() => {
        const handleGlobalClick = () => { if (activeMenuData) setActiveMenuData(null); };
        if (activeMenuData) { setTimeout(() => window.addEventListener('click', handleGlobalClick), 10); }
        return () => window.removeEventListener('click', handleGlobalClick);
    }, [activeMenuData]);

    const generateRandomPin = () => Math.floor(1000 + Math.random() * 9000).toString();

    const openModal = (staffMember: StaffMember | null = null) => {
        setActiveMenuData(null);
        if (staffMember) {
            setEditingStaff(staffMember);
            setFormData({ username: staffMember.username, role: staffMember.role, pin: '', email: staffMember.email || '', password: '' });
        } else {
            setEditingStaff(null);
            setFormData({ username: '', role: 'WAITER', pin: '', email: '', password: '' });
        }
        setIsModalOpen(true);
    };

    const handleMenuClick = (e: React.MouseEvent, member: StaffMember) => {
        e.stopPropagation(); 
        if (activeMenuData?.member.user_id === member.user_id) {
            setActiveMenuData(null);
            return;
        }
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        let x = rect.right - 224;
        if (x < 10) x = 10; 
        setActiveMenuData({ member, x, y: rect.bottom + 8 });
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'OWNER': return { icon: <ShieldAlert size={14} />, color: 'text-purple-700 bg-purple-100 border-purple-200' };
            case 'MANAGER': return { icon: <Shield size={14} />, color: 'text-indigo-700 bg-indigo-100 border-indigo-200' };
            case 'CASHIER': return { icon: <MonitorSmartphone size={14} />, color: 'text-teal-700 bg-teal-100 border-teal-200' };
            case 'KITCHEN_STAFF': return { icon: <Shield size={14} />, color: 'text-amber-700 bg-amber-100 border-amber-200' };
            default: return { icon: <Shield size={14} />, color: 'text-blue-700 bg-blue-100 border-blue-200' };
        }
    };

    const isManagerRole = ['MANAGER', 'OWNER'].includes(formData.role);
    const wasManagerRole = editingStaff ? ['MANAGER', 'OWNER'].includes(editingStaff.role): false;
    const showDashboardAuth = isManagerRole;
    const isDemoting = editingStaff ? (wasManagerRole && !isManagerRole) : false;
    const showPinAuth = (!editingStaff && !isManagerRole) || isDemoting;

    const renderActionMenu = () => {
        if (!activeMenuData) return null;
        const { member, x, y } = activeMenuData;
        const isSelf = currentUserId === member.user_id;
        const canModify = !isSelf && (member.role !== 'OWNER' || currentUserRole === 'OWNER');

        return (
            <div className="fixed inset-0 z-50 overflow-hidden" style={{ pointerEvents: 'none' }}>
                <div 
                    className="absolute bg-white rounded-2xl shadow-2xl border border-slate-200 w-56 flex flex-col p-1.5 animate-in fade-in zoom-in-95 duration-150"
                    style={{ top: Math.min(y, window.innerHeight - 250), left: x, pointerEvents: 'auto' }}
                    onClick={(e) => e.stopPropagation()} 
                >
                    {canModify ? (
                        <>
                            <button onClick={() => openModal(member)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-colors text-left font-bold">
                                <Edit2 size={16} className="shrink-0"/> Edit Details
                            </button>
                            
                            {!['OWNER', 'MANAGER'].includes(member.role) && (
                                <button onClick={() => {
                                    setActiveMenuData(null);
                                    setResetPinModal({ isOpen: true, staffId: member.user_id, name: member.username, pin: '' });
                                }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-colors text-left font-bold">
                                    <RefreshCw size={16} className="shrink-0"/> Reset PIN
                                </button>
                            )}

                            <div className="h-px bg-slate-100 my-1 mx-2"></div>
                            
                            <button 
                                onClick={() => {
                                    setActiveMenuData(null);
                                    toggleStatusMutation.mutate({ staffId: member.user_id, is_active: !member.is_active });
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-xl transition-colors text-left font-bold ${member.is_active ? 'text-amber-700 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'}`}
                            >
                                {member.is_active ? <><Ban size={16} className="shrink-0"/> Suspend</> : <><CheckCircle2 size={16} className="shrink-0"/> Restore</>} 
                            </button>

                            <button 
                                onClick={() => {
                                    if (window.confirm(`CRITICAL WARNING: Are you absolutely sure you want to permanently delete ${member.username}?`)) {
                                        setActiveMenuData(null);
                                        deleteStaffMutation.mutate(member.user_id);
                                    }
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left font-bold"
                            >
                                <Trash2 size={16} className="shrink-0"/> Delete
                            </button>
                        </>
                    ) : (
                        <div className="px-3 py-4 text-xs text-slate-400 text-center italic font-bold bg-slate-50 rounded-xl">
                            System Locked<br/>(Insufficient Permissions)
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 min-h-screen bg-slate-50 md:bg-transparent">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 shrink-0 relative z-20">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                        <Users className="text-indigo-500" /> Organization Roster
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mt-1">Manage hierarchy, floor access, and security.</p>
                </div>
                <button onClick={() => openModal()} className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-sm shadow-indigo-200 w-full sm:w-auto">
                    <Plus size={20} /> Provision User
                </button>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                    <Loader2 className="animate-spin mb-4" size={32} />
                    <p className="font-bold tracking-tight">Loading roster...</p>
                </div>
            ) : staff.length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4"><Users size={32} /></div>
                    <h3 className="text-xl font-black text-slate-800">No staff found</h3>
                    <p className="text-slate-500 font-medium mt-1">Click "Provision User" to build your team.</p>
                </div>
            ) : (
                <>
                    {/* MOBILE UI */}
                    <div className="md:hidden space-y-4 pb-28 relative z-10">
                        {staff.map((member) => {
                            const roleStyle = getRoleBadge(member.role);
                            const isSelf = currentUserId === member.user_id;

                            return (
                                <div key={member.user_id} className={`p-4 rounded-2xl transition-all duration-300 ${member.is_active ? 'bg-white border border-slate-200 shadow-sm' : 'bg-slate-100 border border-slate-300'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-12 w-12 rounded-full flex items-center justify-center font-black text-lg border shrink-0 ${member.is_active ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-200 text-slate-500 border-slate-300'}`}>
                                                {member.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className={`font-black text-lg leading-none mb-1 ${member.is_active ? 'text-slate-900' : 'text-slate-500'}`}>
                                                    {member.username} {isSelf && <span className="text-[10px] text-indigo-500 ml-1">(You)</span>}
                                                </h3>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${member.is_active ? roleStyle.color : 'text-slate-500 bg-slate-200 border-slate-300'}`}>
                                                    {roleStyle.icon} {member.role.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="relative shrink-0">
                                            <button onClick={(e) => handleMenuClick(e, member)} className="p-2 -mr-2 text-slate-400 hover:text-slate-900 bg-transparent hover:bg-slate-100 rounded-xl active:scale-95 transition-all">
                                                <MoreVertical size={20}/>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs font-bold pt-3 border-t border-slate-200/50">
                                        <span className={`flex items-center gap-1 px-2 py-1 rounded-md ${member.is_active ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-200'}`}>
                                            {member.is_active ? <CheckCircle2 size={14}/> : <Ban size={14}/>}
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

                    {/* DESKTOP UI */}
                    <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-slate-200 relative z-10">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider font-black">
                                    <th className="p-4 pl-6 rounded-tl-3xl">Personnel</th>
                                    <th className="p-4">Assigned Role</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Last Active</th>
                                    <th className="p-4 pr-6 text-right rounded-tr-3xl">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {staff.map((member) => {
                                    const roleStyle = getRoleBadge(member.role);
                                    const isSelf = currentUserId === member.user_id;

                                    return (
                                        <tr key={member.user_id} className={`transition-colors group ${!member.is_active ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                                            <td className="p-4 pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black border shrink-0 ${member.is_active ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-200 text-slate-400 border-slate-300'}`}>
                                                        {member.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <span className={`font-bold block leading-tight ${member.is_active ? 'text-slate-900' : 'text-slate-400'}`}>
                                                            {member.username} {isSelf && <span className="text-xs text-indigo-500 font-bold ml-1">(You)</span>}
                                                        </span>
                                                        {member.email && <span className='text-[10px] md:text-xs font-medium text-slate-400'>{member.email}</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] md:text-xs font-black uppercase tracking-wider border ${member.is_active ? roleStyle.color : 'text-slate-400 bg-slate-100 border-slate-200'}`}>
                                                    {roleStyle.icon} {member.role.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-wider border ${member.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-300'}`}>
                                                    {member.is_active ? <CheckCircle2 size={14}/> : <Ban size={14}/>}
                                                    {member.is_active ? 'Active' : 'Suspended'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                                    <Clock size={14} />
                                                    {member.last_login ? new Date(member.last_login).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                                                </div>
                                            </td>
                                            <td className="p-4 pr-6 text-right relative">
                                                <button onClick={(e) => handleMenuClick(e, member)} className={`p-2 hover:bg-slate-100 border rounded-xl transition-all focus:outline-none ${activeMenuData?.member.user_id === member.user_id ? 'border-slate-300 bg-slate-100 text-slate-900' : 'text-slate-400 border-transparent hover:border-slate-200'}`}>
                                                    <MoreVertical size={18}/>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {renderActionMenu()}

            {/* MAIN MODAL: Provision / Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]">
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
                            <form 
                                id="staff-form" 
                                onSubmit={(e) => { 
                                    e.preventDefault(); 
                                    saveStaffMutation.mutate({ data: formData, staffId: editingStaff?.user_id }, {
                                        onSuccess: () => setIsModalOpen(false)
                                    }); 
                                }} 
                                className="space-y-5"
                            >
                                
                                {isDemoting && (
                                    <div className="p-4 mb-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                                        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                                        <div className="text-sm text-amber-800">
                                            <p className="font-bold">Demotion Warning</p>
                                            <p className="mt-1 opacity-90">Saving this will permanently revoke this user's Dashboard access and replace their login with a Terminal PIN.</p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Operational Role</label>
                                    <select value={formData.role} onChange={(e)=> setFormData({...formData, role: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base md:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none">
                                        <option value="WAITER">Floor Waiter</option>
                                        <option value="CASHIER">Register Cashier</option>
                                        <option value="KITCHEN_STAFF">Kitchen KDS Operator</option>
                                        {['OWNER', 'MANAGER'].includes(currentUserRole) && <option value="MANAGER">General Manager</option>}
                                        {currentUserRole === 'OWNER' && <option value="OWNER">Co-Owner</option>}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Display Name / Username</label>
                                    <input type="text" required value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} placeholder="e.g. John Doe" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base md:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner" />
                                </div>

                                {showDashboardAuth && (
                                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">Email Address (Login ID)</label>
                                            <div className="relative">
                                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="manager@venue.com" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-base md:text-sm font-medium focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">
                                                Dashboard Password 
                                                {editingStaff && wasManagerRole && <span className="text-[10px] font-normal text-slate-400 ml-2">(Leave blank to keep current)</span>}
                                            </label>
                                            <div className="relative">
                                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input type="password" required={!editingStaff || wasManagerRole} minLength={6} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="••••••••" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-base md:text-sm font-medium focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {showPinAuth && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                                        <label className="text-sm font-bold text-slate-800 flex justify-between">
                                            <span>4-Digit Access PIN</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input type="text" required={!editingStaff || isDemoting} maxLength={4} pattern="\d{4}" value={formData.pin} onChange={(e) => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})} placeholder="••••" className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 tracking-widest font-mono text-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner" />
                                            </div>
                                            <button type="button" onClick={() => setFormData({...formData, pin: generateRandomPin()})} className="bg-indigo-100 text-indigo-700 px-4 rounded-xl border border-indigo-200 hover:bg-indigo-200 active:scale-95 transition-all shadow-sm" title="Auto-generate secure PIN"><Dices size={20} /></button>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>

                        <div className="p-4 md:p-6 border-t border-slate-100 bg-white flex gap-3 shrink-0 pb-safe">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3.5 text-sm md:text-base text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors">Cancel</button>
                            <button type="submit" form="staff-form" disabled={saveStaffMutation.isPending} className="flex-1 px-4 py-3.5 text-sm md:text-base bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200">
                                {saveStaffMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : (editingStaff ? 'Save Changes' : 'Provision User')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RESET PIN MODAL */}
            {resetPinModal.isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-0">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setResetPinModal({ isOpen: false, staffId: null, name: '', pin: '' })} />
                    <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col p-6">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-indigo-100/50"><RefreshCw size={32} /></div>
                            <h2 className="text-xl font-black text-slate-900">Reset Access PIN</h2>
                            <p className="text-sm font-medium text-slate-500 mt-1">Generate a new 4-digit terminal PIN for <span className="text-slate-800 font-bold">{resetPinModal.name}</span>.</p>
                        </div>

                        <form 
                            onSubmit={(e) => { 
                                e.preventDefault(); 
                                resetPinMutation.mutate({ staffId: resetPinModal.staffId!, pin: resetPinModal.pin, name: resetPinModal.name }, {
                                    onSuccess: () => setResetPinModal({ isOpen: false, staffId: null, name: '', pin: '' })
                                }); 
                            }} 
                            className="space-y-6"
                        >
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <KeyRound size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input type="text" required maxLength={4} pattern="\d{4}" value={resetPinModal.pin} onChange={(e) => setResetPinModal({...resetPinModal, pin: e.target.value.replace(/\D/g, '')})} placeholder="••••" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-4 tracking-widest font-mono text-2xl font-black text-slate-900 focus:ring-2 focus:ring-indigo-500/50 text-center shadow-inner" />
                                </div>
                                <button type="button" onClick={() => setResetPinModal({...resetPinModal, pin: generateRandomPin()})} className="bg-indigo-50 text-indigo-700 px-5 rounded-xl border border-indigo-100 hover:bg-indigo-100 active:scale-95 transition-all flex items-center justify-center"><Dices size={24} /></button>
                            </div>

                            <div className="flex gap-3">
                                <button type="button" onClick={() => setResetPinModal({ isOpen: false, staffId: null, name: '', pin: '' })} className="flex-1 py-3 text-slate-700 bg-slate-100 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                                <button type="submit" disabled={resetPinModal.pin.length !== 4 || resetPinMutation.isPending} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50">
                                    {resetPinMutation.isPending ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Reset PIN'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}