import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { 
  CheckCircle2, 
  Clock, 
  Printer, 
  Search,
  Timer,
  ChefHat,
  UtensilsCrossed
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [activeFilter, setActiveFilter] = useState('New');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
        const channel = supabase
            .channel('orders_realtime')
            .on('postgres_changes', { event: '*', table: 'orders' }, fetchOrders)
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, []);

    const fetchOrders = async () => {
        const { data } = await supabase
            .from('orders')
            .select('*, tables(table_number), order_items(*, menu_items(name), variant_id(name))')
            .order('created_at', { ascending: false });
        if (data) setOrders(data);
        setLoading(false);
    };

    const updateStatus = async (orderId, status) => {
        const { error } = await supabase.from('orders').update({ payment_status: status }).eq('id', orderId);
        if (!error) {
            toast.success(`Success! Status changed to ${status}`, { style: { borderRadius: '1.5rem', background: '#333', color: '#fff' } });
            fetchOrders();
        }
    };

    const filteredOrders = orders.filter(o => {
        if (activeFilter === 'New') return o.payment_status === 'pending';
        if (activeFilter === 'Done') return o.payment_status === 'paid';
        return true;
    }).filter(o => o.tables?.table_number?.toString().includes(searchTerm));

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-12 pb-20 italic font-inter">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-10">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-[#1C1C1C] tracking-tighter uppercase italic">Current Orders</h1>
                    <p className="text-gray-400 font-bold text-xs md:text-sm mt-4 flex items-center gap-2 italic uppercase tracking-widest leading-none underline underline-offset-[12px] decoration-[#E23744]/20">
                        <ChefHat className="w-4 h-4 text-[#E23744]" /> Managing Kitchen Flow
                    </p>
                </div>
                
                <div className="flex bg-gray-100 rounded-[2rem] p-1.5 overflow-x-auto no-scrollbar">
                    {['New', 'Done', 'All'].map(f => (
                        <button 
                            key={f}
                            onClick={() => setActiveFilter(f)}
                            className={`px-8 h-12 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                activeFilter === f ? 'bg-[#1C1C1C] text-white shadow-xl shadow-[#E23744]/20' : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </header>

            <div className="relative group max-w-sm">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-[#E23744]" />
                <input 
                    type="text" 
                    placeholder="Search by Table Number..."
                    className="w-full h-16 bg-white pl-14 pr-8 rounded-3xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#E23744] transition-all text-gray-900 font-bold italic"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                <AnimatePresence>
                    {filteredOrders.map((order) => (
                        <motion.div 
                            layout initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            key={order.id}
                            className={`bg-white rounded-[3rem] p-8 md:p-10 border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 relative flex flex-col h-full ${
                                order.payment_status === 'pending' ? 'ring-2 ring-emerald-500/10' : ''
                            }`}
                        >
                            <div className="flex justify-between items-start mb-10">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 bg-[#E23744] rounded-2xl flex items-center justify-center font-black text-white text-2xl shadow-xl shadow-[#E23744]/20 transition-transform leading-none italic">
                                        {order.tables?.table_number}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic mb-1">Table Number</p>
                                        <h3 className="font-black text-[#1C1C1C] uppercase tracking-tighter text-sm italic">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h3>
                                    </div>
                                </div>
                                <div className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${
                                    order.payment_status === 'paid' ? 'bg-gray-100 text-gray-400' : 'bg-emerald-50 text-emerald-600 animate-pulse'
                                }`}>
                                    {order.payment_status === 'paid' ? 'Completed' : 'New Order'}
                                </div>
                            </div>

                            <div className="space-y-6 mb-12 flex-grow px-2 italic overflow-hidden border-l-4 border-rose-50 ml-8 pl-8">
                                {order.order_items?.map((item, idx) => (
                                    <div key={idx} className="group/item">
                                        <p className="font-black text-[#1C1C1C] text-sm md:text-base leading-none uppercase italic">
                                            {item.menu_items?.name} <span className="text-[#E23744] font-black ml-2">×{item.quantity}</span>
                                        </p>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter italic mt-1.5 flex items-center gap-2">
                                            <UtensilsCrossed className="w-3 h-3" /> {item.variant_id?.name || 'Standard'}
                                        </p>
                                        {item.instructions && (
                                            <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                                <p className="text-[9px] font-black text-amber-600 uppercase flex items-center gap-2 italic">
                                                    <Timer className="w-3 h-3 shrink-0" /> Note: {item.instructions}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-auto border-t border-gray-50 pt-10 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-none italic">Order Total</p>
                                    <p className="text-3xl font-black text-[#1C1C1C] tracking-tighter leading-none italic">₹{order.total_amount}</p>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => window.print()} className="w-14 h-14 bg-gray-50 hover:bg-[#1C1C1C] hover:text-white text-gray-400 rounded-2xl transition-all border border-transparent flex items-center justify-center shrink-0 active:scale-90 shadow-sm"><Printer className="w-5 h-5" /></button>
                                    {order.payment_status === 'pending' && (
                                        <button onClick={() => updateStatus(order.id, 'paid')} className="bg-emerald-500 hover:bg-emerald-600 text-white h-14 px-10 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-3 whitespace-nowrap italic">
                                            <CheckCircle2 className="w-4 h-4" /> COMPLETED
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AdminOrders;
