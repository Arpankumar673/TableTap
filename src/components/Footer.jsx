import React from 'react';
import { Heart, Utensils } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-[#1C1C1C] text-white py-12 px-6 mt-10 font-inter italic border-t border-white/5 relative z-10 w-full flex flex-col items-center text-center">
            
            <div className="space-y-4 max-w-sm">
                {/* Brand Identity */}
                <h2 className="text-xl md:text-2xl font-black tracking-tighter uppercase italic leading-none">
                    SIDHU <span className="text-[#E23744]">PUNJABI</span> RESTAURANT
                </h2>
                <p className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed opacity-60">
                    Delicious food, just a tap away
                </p>

                {/* Friendly Greeting Highlight */}
                <div className="pt-6 flex flex-col items-center gap-3">
                    <div className="w-10 h-[2px] bg-[#E23744] rounded-full opacity-30" />
                    <p className="text-sm md:text-base font-black text-white tracking-tight uppercase italic leading-none">
                        Serving happiness <br className="sm:hidden" /> on every plate <span className="text-[#E23744]">🍽️</span>
                    </p>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.4em] italic mt-2">
                        Thank you for visiting us <span className="text-[#E23744]">❤️</span>
                    </p>
                </div>
            </div>

            {/* Micro Copyright */}
            <div className="pt-12 mt-12 border-t border-white/5 w-full max-w-xs flex justify-center">
                <p className="text-[8px] font-bold text-gray-700 uppercase tracking-[0.4em] italic">
                    © 2026 SIDHU PUNJABI • DIGITAL POS
                </p>
            </div>
        </footer>
    );
};

export default Footer;
