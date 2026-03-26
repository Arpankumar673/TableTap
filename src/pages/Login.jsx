import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { LogIn, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) navigate('/admin');
        }
        checkUser();
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            toast.error(error.message || "Invalid credentials!");
        } else {
            toast.success("Welcome Back, Admin!", { style: { borderRadius: '1.5rem', background: '#333', color: '#fff' } });
            navigate('/admin');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center p-6 font-inter italic">
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-md bg-white rounded-[3.5rem] p-10 md:p-14 shadow-2xl border border-gray-100 flex flex-col items-center relative overflow-hidden"
            >
                {/* Brand Identity */}
                <div className="mb-12 text-center relative z-10 w-full">
                    <div className="w-16 h-16 bg-[#E23744] rounded-[2rem] mx-auto flex items-center justify-center mb-8 shadow-2xl shadow-[#E23744]/20 rotate-3">
                        <ShieldCheck className="w-8 h-8 text-white -rotate-3" />
                    </div>
                    <h1 className="text-3xl font-black text-[#1C1C1C] tracking-tighter uppercase leading-none mb-3">Admin HQ</h1>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] italic mb-10">Sidhu Punjabi Restaurant</p>
                    <div className="h-0.5 w-12 bg-[#E23744]/20 mx-auto rounded-full" />
                </div>

                <form onSubmit={handleLogin} className="w-full space-y-5 relative z-10">
                    <div className="relative group">
                        <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4 group-focus-within:text-[#E23744] transition-colors" />
                        <input 
                            type="email" 
                            placeholder="Email Address"
                            className="w-full bg-white rounded-2xl py-5 pl-14 pr-8 text-sm font-bold border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E23744] focus:border-[#E23744] transition-all text-gray-900 placeholder-gray-400 italic"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="relative group">
                        <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4 group-focus-within:text-[#E23744] transition-colors" />
                        <input 
                            type="password" 
                            placeholder="Secret Token"
                            className="w-full bg-white rounded-2xl py-5 pl-14 pr-8 text-sm font-bold border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E23744] focus:border-[#E23744] transition-all text-gray-900 placeholder-gray-400 italic"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button 
                        disabled={loading}
                        className={`w-full h-16 bg-[#1C1C1C] hover:bg-[#E23744] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl shadow-black/10 flex items-center justify-center gap-4 active:scale-[0.98] transition-all relative overflow-hidden italic ${
                            loading ? 'opacity-80 cursor-not-allowed' : ''
                        }`}
                    >
                        {loading ? (
                             <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>ESTABLISH CONNECTION <ArrowRight className="w-4 h-4" /></>
                        )}
                    </button>
                </form>

                <p className="mt-12 text-center text-[9px] font-black text-gray-300 uppercase tracking-widest italic opacity-60">Verified Credentials Required | Sidney, PA Branch</p>
                
                {/* Background Decor System */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-rose-50 rounded-full blur-[80px] -z-10 -mr-24 -mt-24 opacity-50" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-50 rounded-full blur-[80px] -z-10 -ml-24 -mb-24 opacity-50" />
            </motion.div>
        </div>
    );
};

export default Login;
