import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { 
  Settings, 
  Receipt, 
  Percent, 
  Save, 
  RefreshCcw,
  ShieldCheck,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  IndianRupee,
  Calculator
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

const AdminSettings = () => {
    const [billing, setBilling] = useState({ 
        gst_enabled: true, 
        gst_percentage: 5, 
        discount_enabled: false, 
        discount_percentage: 0 
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        const { data } = await supabase.from('settings').select('value').eq('key', 'billing').single();
        if (data?.value) setBilling(data.value);
        setLoading(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase
                .from('settings')
                .update({ value: billing, updated_at: new Date() })
                .eq('key', 'billing');
            
            if (error) throw error;
            toast.success("Billing settings updated!", { 
                style: { borderRadius: '1.5rem', background: '#333', color: '#fff' } 
            });
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50/20">
            <RefreshCcw className="w-10 h-10 text-[#E23744] animate-spin" />
        </div>
    );

    return (
        <div className="p-6 md:p-12 max-w-5xl mx-auto space-y-12 pb-20 italic font-inter">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-10 border-b border-gray-100 pb-12">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-[#1C1C1C] tracking-tighter uppercase italic">Billing HQ</h1>
                    <p className="text-gray-400 font-bold text-xs md:text-sm mt-5 uppercase tracking-widest flex items-center gap-3 italic bg-white px-5 py-2.5 border border-gray-100 w-fit rounded-2xl">
                        <Settings className="w-5 h-5 text-[#E23744]" /> Store-wide financial controls
                    </p>
                </div>
            </header>

            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* GST Settings Card */}
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-[3.5rem] p-10 shadow-sm border border-gray-100 flex flex-col gap-10 relative overflow-hidden"
                >
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center">
                                <Receipt className="w-6 h-6 text-[#E23744]" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-[#1C1C1C] tracking-tight uppercase italic">GST Settings</h3>
                                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest italic">Tax Calculation Module</p>
                            </div>
                        </div>
                        <button 
                            type="button"
                            onClick={() => setBilling({...billing, gst_enabled: !billing.gst_enabled})}
                            className={`w-14 h-8 rounded-full transition-all relative ${billing.gst_enabled ? 'bg-emerald-500' : 'bg-gray-200'}`}
                        >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${billing.gst_enabled ? 'right-1' : 'left-1'} shadow-md`} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic ml-4">Tax Percentage (%)</label>
                        <div className="relative group">
                            <Percent className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4 group-focus-within:text-[#E23744]" />
                            <input 
                                type="number" step="0.1" 
                                disabled={!billing.gst_enabled}
                                className="w-full h-20 bg-white px-14 rounded-3xl border border-gray-300 text-gray-900 font-black text-xl italic focus:ring-2 focus:ring-[#E23744] outline-none disabled:opacity-30 disabled:grayscale transition-all"
                                value={billing.gst_percentage}
                                onChange={(e) => setBilling({...billing, gst_percentage: parseFloat(e.target.value) || 0})}
                            />
                        </div>
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest italic text-center leading-none">Standard India Restaurant GST is 5%</p>
                    </div>
                </motion.div>

                {/* Discount Settings Card */}
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}
                    className="bg-white rounded-[3.5rem] p-10 shadow-sm border border-gray-100 flex flex-col gap-10 relative overflow-hidden"
                >
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center">
                                <Percent className="w-6 h-6 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-[#1C1C1C] tracking-tight uppercase italic">Store Discount</h3>
                                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest italic">Global Offers Module</p>
                            </div>
                        </div>
                        <button 
                            type="button"
                            onClick={() => setBilling({...billing, discount_enabled: !billing.discount_enabled})}
                            className={`w-14 h-8 rounded-full transition-all relative ${billing.discount_enabled ? 'bg-emerald-500' : 'bg-gray-200'}`}
                        >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${billing.discount_enabled ? 'right-1' : 'left-1'} shadow-md`} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic ml-4">Discount Rate (%)</label>
                        <div className="relative group">
                            <Percent className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4 group-focus-within:text-[#E23744]" />
                            <input 
                                type="number" step="0.1"
                                disabled={!billing.discount_enabled}
                                className="w-full h-20 bg-white px-14 rounded-3xl border border-gray-300 text-gray-900 font-black text-xl italic focus:ring-2 focus:ring-[#E23744] outline-none disabled:opacity-30 disabled:grayscale transition-all"
                                value={billing.discount_percentage}
                                onChange={(e) => setBilling({...billing, discount_percentage: parseFloat(e.target.value) || 0})}
                            />
                        </div>
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest italic text-center leading-none">Discount applied BEFORE Tax is calculated</p>
                    </div>
                </motion.div>

                {/* Confirm Action */}
                <div className="md:col-span-2 flex flex-col items-center gap-10 pt-10">
                    <button 
                        type="submit" disabled={saving}
                        className="w-full max-w-sm h-20 bg-[#1C1C1C] hover:bg-[#E23744] text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.4em] shadow-3xl active:scale-[0.98] transition-all flex items-center justify-center gap-4 italic"
                    >
                        {saving ? <RefreshCcw className="w-6 h-6 animate-spin" /> : <><Save className="w-6 h-6" /> SAVE GLOBAL SETTINGS</>}
                    </button>

                    <div className="flex items-center gap-6 opacity-40">
                        <div className="h-px w-12 bg-gray-200" />
                        <ShieldCheck className="w-5 h-5 text-gray-400" />
                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest italic tracking-[0.4em]">Authorized SIDHU HQ Signature</span>
                        <div className="h-px w-12 bg-gray-200" />
                    </div>
                </div>
            </form>
        </div>
    );
};

export default AdminSettings;
