import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { 
  IndianRupee, 
  ShoppingBag, 
  Utensils, 
  Star, 
  TrendingUp, 
  Calendar,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Filter
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

const AdminDashboard = () => {
    const [stats, setStats] = useState({ sales: 0, orders: 0, avgRating: 4.9, trending: 'Dal Makhani' });
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        fetchDashboardData();
        const channel = supabase
            .channel('dashboard_updates')
            .on('postgres_changes', { event: '*', table: 'orders' }, fetchDashboardData)
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const { data: ordersData } = await supabase.from('orders').select('total_amount, created_at');
            const totalSales = ordersData?.reduce((acc, curr) => acc + Number(curr.total_amount), 0) || 0;
            const { data: recent } = await supabase.from('orders').select('*, tables(table_number)').order('created_at', { ascending: false }).limit(5);
            setStats({ sales: totalSales, orders: ordersData?.length || 0, avgRating: 4.9, trending: 'Paneer Tikka' });
            setRecentOrders(recent || []);
            setLoading(false);
        } catch (error) { console.error(error); }
    };

    const downloadReport = async () => {
        setExporting(true);
        try {
            const { data: orders, error } = await supabase
                .from('orders')
                .select('*, tables(table_number)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Generate CSV
            const headers = ['Order ID', 'Table', 'Date', 'Time', 'Subtotal', 'Discount', 'GST', 'Total', 'Payment Method', 'Status'];
            const rows = orders.map(o => [
                o.id,
                o.tables?.table_number || '??',
                new Date(o.created_at).toLocaleDateString(),
                new Date(o.created_at).toLocaleTimeString(),
                o.subtotal || 0,
                o.discount_amount || 0,
                o.tax_amount || 0,
                o.total_amount,
                o.payment_method,
                o.payment_status
            ]);

            const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `Sales_Report_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast.success("Sales report downloaded!");
        } catch (err) {
            toast.error("Export failed: " + err.message);
        } finally {
            setExporting(false);
        }
    };

    const KPI_CARDS = [
        { label: "Total Sales", value: `₹${stats.sales.toLocaleString()}`, icon: <IndianRupee className="text-white" />, color: "bg-[#E23744]" },
        { label: "Total Orders", value: stats.orders, icon: <ShoppingBag className="text-gray-600" />, color: "bg-gray-100" },
        { label: "Top Dish", value: stats.trending, icon: <Utensils className="text-gray-600" />, color: "bg-gray-100" },
        { label: "Rating", value: stats.avgRating, icon: <Star className="text-gray-600" />, color: "bg-gray-100" },
    ];

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 pb-20 font-inter italic">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 border-b border-gray-100 pb-10">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-[#1C1C1C] tracking-tighter uppercase italic leading-none">Store Overview</h1>
                    <p className="text-gray-400 font-bold text-xs md:text-sm mt-4 uppercase tracking-[0.2em] flex items-center gap-2 italic">
                        <Calendar className="w-4 h-4 text-[#E23744]" /> Restaurant Status: <span className="text-emerald-500">Live & Open</span>
                    </p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={downloadReport}
                        disabled={exporting}
                        className="h-14 px-8 bg-[#1C1C1C] hover:bg-[#E23744] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 shadow-2xl shadow-black/10 disabled:opacity-50"
                    >
                        {exporting ? <Clock className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
                        {exporting ? 'EXPORTING...' : 'EXPORT SALES CSV'}
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                {KPI_CARDS.map((card, idx) => (
                    <motion.div 
                        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: idx * 0.1 }}
                        key={idx} 
                        className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm transition-all hover:shadow-2xl relative overflow-hidden"
                    >
                        <div className={`w-12 h-12 ${card.color} rounded-2xl flex items-center justify-center mb-6 shadow-xl transition-transform`}>
                            {card.icon}
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 leading-none">{card.label}</p>
                        <h2 className="text-2xl md:text-3xl font-black text-[#1C1C1C] tracking-tighter leading-none italic">{card.value}</h2>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 bg-white rounded-[3rem] border border-gray-100 shadow-sm p-10">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-base font-black text-[#1C1C1C] tracking-tighter uppercase italic underline underline-offset-[12px] decoration-[#E23744]/20">Latest Sales</h3>
                        <button className="text-[#E23744] text-[10px] font-black uppercase tracking-widest hover:underline italic">See All Orders</button>
                    </div>
                    
                    <div className="space-y-4">
                        {recentOrders.map((order) => (
                            <div 
                                key={order.id} 
                                className="flex items-center justify-between p-6 bg-gray-50/50 hover:bg-white border-2 border-transparent hover:border-gray-50 rounded-3xl transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-gray-100 font-black text-[#1C1C1C] text-lg">
                                        {order.tables?.table_number || '??'}
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-[#E23744] uppercase tracking-widest mb-1 shadow-sm px-2 py-1 rounded bg-rose-50 w-fit">TABLE {order.tables?.table_number}</p>
                                        <h4 className="font-bold text-[#1C1C1C] tracking-tight leading-none uppercase italic text-sm">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h4>
                                    </div>
                                </div>
                                <h5 className="font-black text-[#1C1C1C] tracking-tighter text-xl leading-none italic">₹{order.total_amount}</h5>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-[#1C1C1C] rounded-[3rem] p-12 text-white shadow-3xl shadow-[#E23744]/10 flex flex-col relative overflow-hidden h-fit">
                    <div className="relative z-10">
                        <h3 className="text-xl font-black tracking-tight uppercase mb-2 italic">Top Sellers</h3>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-12 italic">Dishes everyone loves</p>
                        
                        <div className="space-y-10">
                            {[
                                { name: "Dal Makhani", sales: "84 orders", color: "bg-[#E23744]" },
                                { name: "Butter Naan", sales: "62 orders", color: "bg-gray-400" },
                                { name: "Paneer Tikka", sales: "45 orders", color: "bg-gray-600" }
                            ].map((dish, i) => (
                                <div key={i}>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[10px] font-black uppercase tracking-widest italic">{dish.name}</span>
                                        <span className="text-[10px] font-bold text-gray-500 italic">{dish.sales}</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
                                        <motion.div initial={{ width: 0 }} animate={{ width: i === 0 ? '90%' : i === 1 ? '70%' : '50%' }} className={`h-full ${dish.color}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <button onClick={downloadReport} className="mt-14 w-full h-16 bg-white/5 hover:bg-[#E23744] hover:text-white border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-4">
                        Download Report <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
