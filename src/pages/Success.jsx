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
  FileText,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';

// Components
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
        const interval = setInterval(fetchOrder, 5000);
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
            const doc = new jsPDF({ unit: 'mm', format: [80, 200] }); // Receipt format
            const leftMargin = 5;
            const rightMargin = 75;
            let currentY = 10;

            // Header
            doc.setFont("courier", "bold");
            doc.setFontSize(10);
            doc.text("SIDHU PUNJABI RESTAURANT", 40, currentY, { align: "center" });
            currentY += 5;
            doc.setFont("courier", "normal");
            doc.setFontSize(7);
            doc.text("------------------------------------------", 40, currentY, { align: "center" });
            currentY += 5;

            // Info
            doc.text(`Table: #${order.tables?.table_number || '??'}`, leftMargin, currentY);
            doc.text(`ID: ${order.id.slice(0, 8)}`, 45, currentY);
            currentY += 4;
            doc.text(`Date: ${new Date(order.created_at).toLocaleString()}`, leftMargin, currentY);
            currentY += 5;
            doc.text("------------------------------------------", 40, currentY, { align: "center" });
            currentY += 5;

            // Items
            doc.setFont("courier", "bold");
            doc.text("ITEM", leftMargin, currentY);
            doc.text("QTY", 45, currentY);
            doc.text("PRICE", rightMargin, currentY, { align: "right" });
            currentY += 4;
            doc.setFont("courier", "normal");

            order.order_items.forEach((item) => {
                const name = (item.menu_items?.name || 'Dish').slice(0, 20);
                doc.text(name, leftMargin, currentY);
                doc.text(item.quantity.toString(), 45, currentY);
                doc.text(`₹${(item.quantity * (item.menu_items?.price || 0)).toFixed(2)}`, rightMargin, currentY, { align: "right" });
                currentY += 4;
            });

            currentY += 2;
            doc.text("------------------------------------------", 40, currentY, { align: "center" });
            currentY += 5;

            // Totals
            const subtotal = order.subtotal || order.total_amount;
            doc.text("Subtotal:", 45, currentY, { align: "right" });
            doc.text(`₹${parseFloat(subtotal).toFixed(2)}`, rightMargin, currentY, { align: "right" });
            currentY += 4;

            if (order.discount_amount > 0) {
                doc.text("Discount:", 45, currentY, { align: "right" });
                doc.text(`-₹${parseFloat(order.discount_amount).toFixed(2)}`, rightMargin, currentY, { align: "right" });
                currentY += 4;
            }

            if (order.tax_amount > 0) {
                doc.text("GST:", 45, currentY, { align: "right" });
                doc.text(`₹${parseFloat(order.tax_amount).toFixed(2)}`, rightMargin, currentY, { align: "right" });
                currentY += 4;
            }

            doc.setFont("courier", "bold");
            doc.setFontSize(9);
            doc.text("TOTAL:", 45, currentY, { align: "right" });
            doc.text(`₹${parseFloat(order.total_amount).toFixed(2)}`, rightMargin, currentY, { align: "right" });
            currentY += 8;

            // Footer
            doc.setFont("courier", "italic");
            doc.setFontSize(7);
            doc.text("Thank you for visiting ❤️", 40, currentY, { align: "center" });
            currentY += 4;
            doc.text("Serving happiness on every plate", 40, currentY, { align: "center" });

            doc.save(`Sidhu_Punjabi_Bill_${order.id.slice(0, 8)}.pdf`);
            toast.success("Bill Downloaded Successfully!");
        } catch (err) {
            toast.error("Generation failed: " + err.message);
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
        <div className="min-h-screen bg-white flex items-center justify-center p-10 italic">
            <Clock className="w-8 h-8 text-[#E23744] animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-white font-inter pb-0 relative w-full overflow-x-hidden italic">
            
            <div className="bg-[#E23744] text-white pt-20 pb-48 px-6 flex flex-col items-center text-center relative overflow-hidden">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
                    <CheckCircle2 className="w-10 h-10 text-[#E23744]" />
                </motion.div>
                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic mb-4 leading-none">Signal <br/>Established</h1>
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest italic">STATION STATION ID #{orderId.slice(0, 8)}</p>
            </div>

            <main className="px-4 md:px-10 -mt-32 max-w-4xl mx-auto space-y-8 relative z-20 mb-20">
                
                {/* Multi-Purpose Broadcast Hub */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    
                    {/* Professional Digital Receipt Terminal */}
                    <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-3xl shadow-[#E23744]/10 border border-gray-100 flex flex-col gap-8">
                        <div className="flex flex-col items-center text-center space-y-4 border-b-2 border-dashed border-gray-100 pb-8">
                            <FileText className="w-10 h-10 text-gray-200" />
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-[#1C1C1C] tracking-tighter uppercase italic leading-none">Sidhu Punjabi</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">Established Restaurant Bill</p>
                            </div>
                        </div>

                        {/* Monospace Item Table */}
                        <div className="space-y-6">
                            <div className="flex justify-between text-[11px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-50 pb-2">
                                <span>Station Detail</span>
                                <span>Table #{order?.tables?.table_number || '??'}</span>
                            </div>

                            <div className="space-y-4">
                                {order?.order_items?.map((item) => (
                                    <div key={item.id} className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <p className="text-[13px] font-black text-[#1C1C1C] tracking-tighter uppercase italic leading-none">{item.menu_items?.name}</p>
                                            <p className="text-[10px] font-bold text-gray-400 italic">Qty: {item.quantity}</p>
                                        </div>
                                        <p className="text-[13px] font-black text-[#1C1C1C] italic">₹{(item.quantity * (item.menu_items?.price || 0)).toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t-2 border-dashed border-gray-100 pt-6 space-y-3">
                                <div className="flex justify-between text-[11px] font-bold text-gray-400 italic">
                                    <span>Subtotal Matrix</span>
                                    <span>₹{(parseFloat(order?.subtotal || order?.total_amount)).toFixed(2)}</span>
                                </div>
                                {order?.discount_amount > 0 && (
                                    <div className="flex justify-between text-[11px] font-bold text-emerald-500 italic">
                                        <span>Discount Signal</span>
                                        <span>-₹{parseFloat(order.discount_amount).toFixed(2)}</span>
                                    </div>
                                )}
                                {order?.tax_amount > 0 && (
                                    <div className="flex justify-between text-[11px] font-bold text-gray-400 italic">
                                        <span>GST Applied</span>
                                        <span>₹{parseFloat(order.tax_amount).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-2xl font-black text-[#1C1C1C] tracking-tighter pt-2 italic">
                                    <span>TOTAL BILL</span>
                                    <span className="text-[#E23744]">₹{parseFloat(order?.total_amount).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-2xl p-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Printer className="w-5 h-5 text-gray-400" />
                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest italic leading-none">Pay Method</p>
                            </div>
                            <p className="text-[14px] font-black text-[#1C1C1C] uppercase italic leading-none">{order?.payment_method || 'DIGITAL'}</p>
                        </div>
                    </div>

                    {/* Action & Communication Stack */}
                    <div className="space-y-6">
                        {/* WhatsApp Signal Activation */}
                        {whatsappUrl && (
                            <a 
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full h-24 bg-[#25D366] hover:bg-[#128C7E] text-white px-10 rounded-[2.5rem] font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-4 transition-all shadow-2xl shadow-[#25D366]/20 group active:scale-[0.98]"
                            >
                                <MessageSquare className="w-8 h-8 group-hover:scale-110 transition-transform" /> 
                                <span className="text-left leading-[1.1]">TRANSmit Order <br/><span className="text-[18px] tracking-normal">ON WHATSAPP</span></span>
                            </a>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button 
                                onClick={generateInvoice}
                                disabled={generating}
                                className="h-16 bg-white border-2 border-gray-100 hover:border-[#E23744]/20 hover:bg-[#E23744]/5 text-[#1C1C1C] rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all disabled:opacity-50 active:scale-95"
                            >
                                {generating ? <Clock className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />} 
                                {generating ? 'PROCESSING...' : 'DOWNLOAD BILL'}
                            </button>
                            <Link to={`/menu/${order?.tables?.table_number}`} className="h-16 bg-[#1C1C1C] hover:bg-[#E23744] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.98]">
                                <ShoppingBag className="w-5 h-5" /> RE-ENTER MENU <ChevronRight className="w-5 h-5" />
                            </Link>
                        </div>

                        {/* Experience Calibration */}
                        {!submitted ? (
                            <div className="bg-white rounded-[2.5rem] p-10 border-2 border-gray-50 space-y-8 text-center shadow-sm">
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-[#1C1C1C] tracking-tight uppercase italic leading-none">Experience Matrix</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">Calibrate our Kitchen</p>
                                </div>
                                <div className="flex gap-4 justify-center">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <button key={s} onClick={() => setRating(s)} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm ${rating >= s ? 'bg-[#E23744] text-white scale-110' : 'bg-gray-50 text-gray-200 hover:bg-gray-100'}`}>
                                            <Star className={`w-5 h-5 ${rating >= s ? 'fill-white' : ''}`} />
                                        </button>
                                    ))}
                                </div>
                                <button onClick={submitFeedback} className="w-full h-16 bg-[#1C1C1C] text-white rounded-2xl font-black text-[10px] uppercase tracking-wide hover:bg-[#E23744] transition-all shadow-lg active:scale-95">TRANSMIT RECEPTION SIGNAL</button>
                            </div>
                        ) : (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-emerald-500 rounded-[2.5rem] p-10 text-center text-white shadow-2xl">
                                <CheckCircle2 className="w-12 h-12 mx-auto mb-4" />
                                <h3 className="text-xl font-black uppercase tracking-tight mb-1 italic">Matrix Updated</h3>
                                <p className="text-[9px] font-bold uppercase tracking-widest opacity-80 italic">Data accurately cataloged by Chef.</p>
                            </motion.div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Success;
