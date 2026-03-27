import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { 
  Bell, 
  Plus, 
  Trash2, 
  UserPlus, 
  PhoneCall, 
  ShieldCheck, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

const AdminSMS = () => {
    const [recipients, setRecipients] = useState([]);
    const [newNumber, setNewNumber] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchRecipients();
    }, []);

    const fetchRecipients = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('sms_recipients')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (data) setRecipients(data);
        setLoading(false);
    };

    const addRecipient = async (e) => {
        e.preventDefault();
        
        // Validation: +91XXXXXXXXXX format
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (!phoneRegex.test(newNumber)) {
            return toast.error("Use international format: +919999999999", {
                icon: <AlertCircle className="text-red-500" />,
                style: { borderRadius: '1rem', background: '#1C1C1C', color: '#fff' }
            });
        }

        setSaving(true);
        const { error } = await supabase
            .from('sms_recipients')
            .insert([{ phone_number: newNumber, is_active: true }]);

        if (error) {
            toast.error(error.code === '23505' ? "Number already exists!" : error.message);
        } else {
            toast.success("Recipient added!", { icon: <CheckCircle2 className="text-emerald-500" /> });
            setNewNumber('');
            fetchRecipients();
        }
        setSaving(false);
    };

    const toggleStatus = async (id, currentStatus) => {
        const { error } = await supabase
            .from('sms_recipients')
            .update({ is_active: !currentStatus })
            .eq('id', id);
        
        if (!error) fetchRecipients();
    };

    const removeRecipient = async (id) => {
        if (!window.confirm("Remove this number?")) return;
        const { error } = await supabase
            .from('sms_recipients')
            .delete()
            .eq('id', id);
        
        if (!error) {
            toast.success("Recipient removed");
            fetchRecipients();
        }
    };

    return (
        <div className="p-6 md:p-10 space-y-10 font-inter italic max-w-4xl mx-auto">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                   <h1 className="text-4xl md:text-5xl font-black text-[#1C1C1C] tracking-tighter uppercase italic leading-[0.85]">Notification <br/><span className="text-[#E23744]">Broadcasting</span></h1>
                   <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest italic leading-none">Established SMS Recipient Hub</p>
                </div>
                <div className="bg-emerald-50 px-4 py-2 rounded-xl flex items-center gap-3 border border-emerald-100 hidden sm:flex">
                     <ShieldCheck className="w-4 h-4 text-emerald-500" />
                     <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none">Encrypted Connection</p>
                </div>
            </div>

            {/* Add New Number Form */}
            <form onSubmit={addRecipient} className="bg-white rounded-[2rem] p-8 md:p-10 shadow-2xl border-2 border-gray-50 flex flex-col md:flex-row gap-6 items-center">
                <div className="w-full space-y-2">
                    <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic ml-4">Establish New Contact</label>
                    <div className="relative group">
                        <PhoneCall className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 transition-colors group-focus-within:text-[#E23744]" />
                        <input 
                            type="text" 
                            placeholder="+919998887776"
                            className="w-full h-16 bg-gray-50/50 rounded-2xl pl-16 pr-8 text-sm font-bold border-2 border-transparent focus:bg-white focus:border-[#E23744] transition-all text-gray-900 placeholder-gray-400 italic"
                            value={newNumber}
                            onChange={(e) => setNewNumber(e.target.value)}
                            required
                        />
                    </div>
                </div>
                <button 
                    disabled={saving}
                    className="w-full md:w-auto h-16 px-10 bg-[#E23744] hover:bg-[#1C1C1C] text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-[#E23744]/20 disabled:opacity-50 mt-6 md:mt-6 shrink-0"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> BROADCAST NUMBER</>}
                </button>
            </form>

            {/* List Section */}
            <div className="space-y-4">
                <h3 className="text-[11px] font-black text-gray-300 uppercase tracking-widest italic ml-4">Authorized Station Matrix</h3>
                
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-200">
                        <Loader2 className="w-10 h-10 animate-spin mb-4" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">Synchronizing Hub...</p>
                    </div>
                ) : recipients.length === 0 ? (
                    <div className="py-20 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                        <Bell className="w-12 h-12 text-gray-200 mb-4" />
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 italic">Zero Recipients Detected</p>
                        <p className="text-[10px] font-bold text-gray-300 uppercase italic">Add a number to establish the SMS channel.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
                        <AnimatePresence>
                            {recipients.map((rec) => (
                                <motion.div 
                                    key={rec.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-white rounded-3xl p-6 border-2 border-gray-50 shadow-sm flex items-center justify-between group hover:border-[#E23744]/20 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${rec.is_active ? 'bg-emerald-50 text-emerald-500 shadow-emerald-100' : 'bg-gray-50 text-gray-300'}`}>
                                            <PhoneCall className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-black text-[#1C1C1C] tracking-tighter italic">{rec.phone_number}</p>
                                            <p className={`text-[9px] font-bold uppercase tracking-widest italic ${rec.is_active ? 'text-emerald-500' : 'text-gray-300'}`}>
                                                {rec.is_active ? 'Station Online' : 'Station Static'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => toggleStatus(rec.id, rec.is_active)}
                                            className="w-10 h-10 rounded-xl hover:bg-gray-50 flex items-center justify-center transition-all group"
                                        >
                                            {rec.is_active ? <ToggleRight className="w-6 h-6 text-[#E23744]" /> : <ToggleLeft className="w-6 h-6 text-gray-300" />}
                                        </button>
                                        <button 
                                            onClick={() => removeRecipient(rec.id)}
                                            className="w-10 h-10 rounded-xl hover:bg-red-50 text-gray-200 hover:text-red-500 flex items-center justify-center transition-all"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminSMS;
