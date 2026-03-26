import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  UtensilsCrossed, 
  LogOut, 
  Bell, 
  Menu, 
  X,
  User,
  Table as TableIcon,
  Settings
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const [waiterCalls, setWaiterCalls] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchWaiterCalls();
    const channel = supabase
      .channel('admin_notifications')
      .on('postgres_changes', { event: 'INSERT', table: 'waiter_calls' }, (payload) => {
        handleNewCall(payload.new);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const fetchWaiterCalls = async () => {
    const { data } = await supabase.from('waiter_calls').select('*, tables(table_number)').eq('status', 'pending');
    if (data) setWaiterCalls(data);
  };

  const handleNewCall = (call) => {
    toast.success(`NEW REQUEST: Table #${call.table_id}`, {
      icon: <Bell className="text-[#E23744]" />,
      duration: 5000,
      style: { borderRadius: '1rem', background: '#fff', color: '#1C1C1C', fontWeight: 'bold' }
    });
    fetchWaiterCalls();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const NAV_ITEMS = [
    { label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" />, path: '/admin' },
    { label: 'Orders', icon: <ShoppingBag className="w-5 h-5" />, path: '/admin/orders' },
    { label: 'Food Menu', icon: <UtensilsCrossed className="w-5 h-5" />, path: '/admin/menu' },
    { label: 'Tables & QR', icon: <TableIcon className="w-5 h-5" />, path: '/admin/tables' },
    { label: 'Store Settings', icon: <Settings className="w-5 h-5" />, path: '/admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden italic transition-colors">
      
      {/* Mobile Header (Zomato-style Red) */}
      <div className="md:hidden bg-[#E23744] h-14 px-4 flex items-center justify-between z-50 shadow-md">
           <h2 className="text-base font-bold text-white tracking-tight uppercase italic leading-none">SIDHU <span className="opacity-60">HQ</span></h2>
           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-10 h-10 flex items-center justify-center text-white active:scale-90 transition-all">
                {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
           </button>
      </div>

      {/* Sidebar - Mobile Sliding / Desktop Persistent */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth > 768) && (
            <motion.aside 
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className={`fixed md:relative top-0 left-0 bottom-0 z-[60] w-[260px] bg-white border-r border-gray-100 flex flex-col h-screen md:h-auto shadow-2xl md:shadow-none p-6 ${isSidebarOpen ? 'flex' : 'hidden md:flex'}`}
            >
                <div className="mb-10">
                    <h2 className="text-2xl font-black text-[#1C1C1C] tracking-tighter uppercase italic leading-none">
                        SIDHU <br/><span className="text-[#E23744]">PUNJABI</span>
                    </h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 px-1">Control Terminal</p>
                </div>

                <nav className="space-y-2 flex-grow">
                    {NAV_ITEMS.map((item) => (
                        <NavLink 
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsSidebarOpen(false)}
                            className={({ isActive }) => `
                                flex items-center gap-4 p-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all group border-2 border-transparent
                                ${isActive ? 'bg-gray-50 text-[#E23744] border-[#E23744]/10 shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-[#1C1C1C]'}
                            `}
                        >
                            <span className="group-hover:translate-x-1 transition-transform">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="mt-auto pt-6 border-t border-gray-100">
                    <div className="flex items-center gap-3 mb-6 px-1">
                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300 shadow-sm"><User className="w-4 h-4" /></div>
                        <div>
                            <p className="text-[10px] font-bold text-[#1C1C1C] uppercase leading-none italic mb-1">TERMINAL-01</p>
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none">ACTIVE SESSION</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="w-full h-12 bg-white text-gray-400 border border-gray-100 rounded-xl flex items-center justify-center gap-3 text-[9px] font-bold uppercase tracking-widest hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all active:scale-95 shadow-sm active:shadow-none"
                    >
                        <LogOut className="w-4 h-4" /> EXIT HQ
                    </button>
                </div>
            </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Surface */}
      <main className="flex-grow h-screen overflow-y-auto bg-gray-50/50 scroll-smooth no-scrollbar relative p-0">
          {children}
          
          {/* Mobile Overlay */}
          {isSidebarOpen && (
              <div 
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-[#1C1C1C]/20 backdrop-blur-sm z-50 md:hidden"
              />
          )}

          {/* Waiter Calls Chip */}
          {waiterCalls.length > 0 && (
              <div className="fixed bottom-6 right-6 z-[70] animate-bounce">
                  <div className="w-14 h-14 bg-[#E23744] text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white">
                      <Bell className="w-6 h-6" />
                      <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-[#1C1C1C] text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center">{waiterCalls.length}</span>
                  </div>
              </div>
          )}
      </main>
    </div>
  );
};

export default AdminLayout;
