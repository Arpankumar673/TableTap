import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { 
  CheckCircle2, 
  Clock, 
  Printer, 
  Search,
  Timer,
  ChefHat,
  UtensilsCrossed,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [activeFilter, setActiveFilter] = useState('New');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [statusUpdating, setStatusUpdating] = useState(null);

    const fetchOrders = useCallback(async () => {
        const { data, error } = await supabase
            .from('orders')
            .select('*, tables(table_number), order_items(*, menu_items(name), variant_id(name))')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error("Signal Retrieval Error:", error);
        } else if (data) {
            setOrders(data);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchOrders();

        const channel = supabase
            .channel('admin_orders_channel')
            .on(
                'postgres_changes', 
                { event: '*', table: 'orders', schema: 'public' }, 
                (payload) => {
                    console.log('📡 Realtime Order Signal Received:', payload);
                    fetchOrders();
                    if (payload.eventType === 'INSERT') {
                        toast.success("New Order Incoming! 🔔");
                    }
                }
            )
            .subscribe((status) => {
                console.log('🛰️ Dashboard Realtime Status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchOrders]);

    const updateStatus = async (orderId, status) => {
        setStatusUpdating(orderId);
        const { error } = await supabase
            .from('orders')
            .update({ payment_status: status })
            .eq('id', orderId);

        if (!error) {
            toast.success(`Station Updated: ${status}`, {
                icon: <CheckCircle2 className="text-emerald-500" />,
                style: { borderRadius: '1rem', background: '#1c1c1c', color: '#fff' }
            });
            fetchOrders();
        }
        setStatusUpdating(null);
    };

    const filteredOrders = orders.filter(o => {
        if (activeFilter === 'New') return o.payment_status === 'pending';
        if (activeFilter === 'Done') return o.payment_status === 'paid';
        return true;
    }).filter(o => {
        const tableNum = o.tables?.table_number?.toString() || "";
        return tableNum.includes(searchTerm);
    });

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 italic font-inter min-h-screen pb-40">
            {/* Header / Filter Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4">
                    <h1 className="text-4xl md:text-6xl font-black text-[#1C1C1C] tracking-tighter uppercase italic leading-[0.85]">Live <br/><span className="text-[#E23744]">Order Matrix</span></h1>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest italic">Signal Broadcaster Online</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 rounded-[2rem] p-2 flex gap-1 shadow-inner">
                    {['New', 'Done', 'All'].map(f => (
                        <button 
                            key={f} 
                            onClick={() => setActiveFilter(f)}
                            className={`px-8 h-12 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === f ? 'bg-[#1C1C1C] text-white shadow-xl shadow-[#E23744]/20' : 'text-gray-400 hover:text-gray-900'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Matrix Tool Search */}
            <div className="relative group max-w-sm">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 transition-colors group-focus-within:text-[#E23744]" />
                <input 
                    type="text" 
                    placeholder="Search Table Stations..."
                    className="w-full h-16 bg-gray-50 rounded-[2rem] pl-16 pr-8 text-sm font-bold border-2 border-transparent focus:bg-white focus:border-[#E23744] transition-all italic text-gray-900"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Order Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-200">
                        <RefreshCw className="w-10 h-10 animate-spin mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest italic">Synchronizing Signals...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="col-span-full py-24 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                        <UtensilsCrossed className="w-12 h-12 text-gray-200 mb-4" />
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest italic">Matrix is Dead Still</p>
                        <p className="text-[10px] font-bold text-gray-300 uppercase italic">No active order signals detected.</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {filteredOrders.map(order => (
                            <motion.div 
                                key={order.id} layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white rounded-[3rem] p-8 md:p-10 border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col h-full group"
                            >
                                <div className="flex justify-between items-start mb-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-[#1C1C1C] text-[#E23744] rounded-[1.5rem] flex items-center justify-center text-2xl font-black italic shadow-lg group-hover:bg-[#E23744] group-hover:text-white transition-all leading-none">
                                            {order.tables?.table_number}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic leading-none mb-1">Station Table</p>
                                            <p className="text-sm font-black text-[#1C1C1C] uppercase leading-none italic">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>
                                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${order.payment_status === 'pending' ? 'bg-[#E23744]/10 text-[#E23744] animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
                                        {order.payment_status === 'pending' ? 'Reception' : 'Complete'}
                                    </div>
                                </div>

                                <div className="space-y-6 flex-grow border-l-4 border-gray-50 pl-8 ml-8">
                                    {order.order_items?.map((item, idx) => (
                                        <div key={idx} className="space-y-1">
                                            <p className="font-black text-[#1C1C1C] text-sm uppercase leading-tight italic">
                                                {item.menu_items?.name} <span className="text-[#E23744] ml-1">×{item.quantity}</span>
                                            </p>
                                            {item.variant_id && (
                                                <p className="text-[10px] font-bold text-gray-400 uppercase italic">Variant: {item.variant_id.name}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-12 pt-8 border-t border-gray-50 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic leading-none">Signal Total</p>
                                        <p className="text-3xl font-black text-[#1C1C1C] tracking-tighter italic leading-none">₹{order.total_amount}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => window.print()} className="w-14 h-14 bg-gray-50 hover:bg-[#1C1C1C] hover:text-white rounded-2xl flex items-center justify-center transition-all text-gray-400 active:scale-90 border border-transparent">
                                            <Printer className="w-5 h-5" />
                                        </button>
                                        {order.payment_status === 'pending' && (
                                            <button 
                                                disabled={statusUpdating === order.id}
                                                onClick={() => updateStatus(order.id, 'paid')}
                                                className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 italic"
                                            >
                                                {statusUpdating === order.id ? <Clock className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                                COMPLETE
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

export default AdminOrders;
