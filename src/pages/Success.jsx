import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { 
  CheckCircle2, 
  Download, 
  ShoppingBag, 
  Star, 
  Clock, 
  ChevronRight,
  MessageSquare,
  FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import Footer from '../components/Footer';

const Success = () => {
    const { orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [recipient, setRecipient] = useState(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchOrder();
        fetchRecipient();
        const interval = setInterval(fetchOrder, 10000);
        return () => clearInterval(interval);
    }, [orderId]);

    const fetchOrder = async () => {
        const { data } = await supabase
            .from('orders')
            .select('*, tables(table_number), order_items(*, menu_items(name, price))')
            .eq('id', orderId)
            .single();
        
        if (data) setOrder(data);
        setLoading(false);
    };

    const fetchRecipient = async () => {
        const { data } = await supabase
            .from('sms_recipients')
            .select('phone_number')
            .eq('is_active', true)
            .limit(1)
            .single();
        
        if (data) setRecipient(data.phone_number);
    };

    const whatsappUrl = useMemo(() => {
        if (!order || !recipient) return null;
        const itemsList = order.order_items.map(i => `${i.menu_items?.name || 'Dish'} x${i.quantity}`).join('\n');
        const message = `New Order 🧾\nTable: ${order.tables?.table_number || '??'}\n\n${itemsList}\n\nTotal: ₹${order.total_amount}`;
        const cleanPhone = recipient.replace(/\D/g, '');
        const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
    }, [order, recipient]);

    const generateInvoice = () => {
        if (!order) return;
        setGenerating(true);
        try {
            const doc = new jsPDF({ unit: 'mm', format: [80, 180] });
            let y = 10;
            const left = 5;
            const right = 75;

            // Header Section
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text("SIDHU PUNJABI RESTAURANT", 40, y, { align: "center" });
            y += 6;
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.text("──────────────────────────────", 40, y, { align: "center" });
            y += 5;

            // Metadata Signal
            doc.setFontSize(7);
            doc.text(`TABLE #: ${order.tables?.table_number || '??'}`, left, y);
            doc.text(`ID: ${order.id.slice(0, 8).toUpperCase()}`, 45, y);
            y += 4;
            doc.text(`DATE: ${new Date(order.created_at).toLocaleString()}`, left, y);
            y += 5;
            doc.text("──────────────────────────────", 40, y, { align: "center" });
            y += 6;

            // High-Definition Table Headers
            doc.setFont("helvetica", "bold");
            doc.text("ITEM DESCRIPTION", left, y);
            doc.text("QTY", 45, y);
            doc.text("PRICE", right, y, { align: "right" });
            y += 4;
            doc.setFont("helvetica", "normal");

            // Item Loop with Accurate Formatting
            order.order_items.forEach((item) => {
                const name = (item.menu_items?.name || 'DISH').toUpperCase().slice(0, 22);
                const price = Number(item.quantity * (item.menu_items?.price || 0)).toFixed(2);
                
                doc.text(name, left, y);
                doc.text(item.quantity.toString(), 45, y);
                doc.text(price, right, y, { align: "right" });
                y += 4;
            });

            y += 2;
            doc.text("──────────────────────────────", 40, y, { align: "center" });
            y += 6;

            // Financial Summary Section
            doc.setFontSize(8);
            const subtotal = Number(order.subtotal || order.total_amount).toFixed(2);
            doc.text("SUBTOTAL:", 45, y, { align: "right" });
            doc.text(subtotal, right, y, { align: "right" });
            y += 4;

            if (order.discount_amount > 0) {
                doc.text("DISCOUNT:", 45, y, { align: "right" });
                doc.text(`-${Number(order.discount_amount).toFixed(2)}`, right, y, { align: "right" });
                y += 4;
            }

            if (order.tax_amount > 0) {
                doc.text("GST:", 45, y, { align: "right" });
                doc.text(Number(order.tax_amount).toFixed(2), right, y, { align: "right" });
                y += 4;
            }

            // High-Impact Final Result
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text("TOTAL BILL (RS):", 45, y, { align: "right" });
            doc.text(Number(order.total_amount).toFixed(2), right, y, { align: "right" });
            y += 12;

            // Established Footer
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.text("THANK YOU FOR VISITING SIDHU PUNJABI ❤️", 40, y, { align: "center" });
            y += 4;
            doc.text("Serving excellence on every plate.", 40, y, { align: "center" });

            // File Broadcast
            doc.save(`Sidhu_Punjabi_Bill_HQ_${order.id.slice(0, 8)}.pdf`);
            toast.success("Professional Bill Downloaded!", {
                style: { borderRadius: '1rem', background: '#1c1c1c', color: '#fff' }
            });
        } catch (err) {
            console.error(err);
            toast.error("Format Synchronization Fail.");
        } finally {
            setGenerating(false);
        }
    };

    const submitFeedback = async () => {
        if (rating === 0) return toast.error("Select rating!");
        const { error } = await supabase.from('feedback').insert({ order_id: orderId, rating, comment });
        if (!error) { setSubmitted(true); toast.success("Shared!"); }
    };

    if (loading) return (
        <div className="min-h-screen bg-white flex items-center justify-center italic">
            <Clock className="w-8 h-8 text-[#E23744] animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-white font-inter pb-20 relative w-full overflow-x-hidden italic">
            
            <div className="bg-[#E23744] text-white pt-20 pb-48 px-6 flex flex-col items-center text-center relative overflow-hidden">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
                    <CheckCircle2 className="w-10 h-10 text-[#E23744]" />
                </motion.div>
                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic mb-4 leading-none">Signal <br/>Established</h1>
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest italic">STATION STATION ID #{orderId.slice(0, 8)}</p>
            </div>

            <main className="px-4 md:px-10 -mt-32 max-w-4xl mx-auto space-y-8 relative z-20">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    
                    {/* UI Receipt Matrix */}
                    <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-3xl shadow-[#E23744]/10 border border-gray-100 flex flex-col gap-8">
                        <div className="flex flex-col items-center text-center space-y-4 border-b-2 border-dashed border-gray-100 pb-8">
                            <FileText className="w-10 h-10 text-gray-200" />
                            <h3 className="text-2xl font-black text-[#1C1C1C] tracking-tighter uppercase italic leading-none">Sidhu Punjabi</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between text-[11px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-50 pb-2">
                                <span>Station Table</span>
                                <span>#{order?.tables?.table_number || '??'}</span>
                            </div>

                            <div className="space-y-4">
                                {order?.order_items?.map((item) => (
                                    <div key={item.id} className="flex justify-between items-start">
                                        <p className="text-[13px] font-black text-[#1C1C1C] uppercase italic">{item.menu_items?.name} × {item.quantity}</p>
                                        <p className="text-[13px] font-black text-[#1C1C1C] italic">₹{Number(item.quantity * (item.menu_items?.price || 0)).toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t-2 border-dashed border-gray-100 pt-6 space-y-3">
                                <div className="flex justify-between text-[11px] font-bold text-gray-400 italic">
                                    <span>SUBTOTAL Matrix</span>
                                    <span>₹{Number(order?.subtotal || order?.total_amount).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-2xl font-black text-[#1C1C1C] tracking-tighter pt-2 italic">
                                    <span>TOTAL BILL</span>
                                    <span className="text-[#E23744]">₹{Number(order?.total_amount).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {whatsappUrl && (
                            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-full h-24 bg-[#25D366] hover:bg-[#128C7E] text-white px-10 rounded-[2.5rem] font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-4 transition-all shadow-2xl shadow-[#25D366]/20 active:scale-[0.98]">
                                <MessageSquare className="w-8 h-8" /> SEND ON WHATSAPP
                            </a>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button onClick={generateInvoice} className="h-16 bg-white border-2 border-gray-100 hover:border-[#E23744] text-[#1C1C1C] rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm">
                                <Download className="w-5 h-5" /> DOWNLOAD BILL
                            </button>
                            <Link to={`/menu/${order?.tables?.table_number}`} className="h-16 bg-[#1C1C1C] hover:bg-[#E23744] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.98]">
                                SEE MENU <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Success;
