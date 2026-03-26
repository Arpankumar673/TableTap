import React from 'react';
import { Link } from 'react-router-dom';
import { 
  UtensilsCrossed, 
  Phone, 
  MapPin, 
  ShoppingBag, 
  LayoutDashboard,
  Heart
} from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-[#1C1C1C] text-white py-12 px-6 mt-20 font-inter italic border-t border-white/5 relative z-10 w-full">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
                
                {/* Brand Section */}
                <div className="flex flex-col items-center md:items-start space-y-4">
                    <h2 className="text-2xl font-black tracking-tighter uppercase italic leading-none">
                        SIDHU <span className="text-[#E23744]">PUNJABI</span>
                    </h2>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest max-w-xs leading-relaxed">
                        Delicious food, just a tap away. Experience the authentic Punjabi taste with our quick-order terminal.
                    </p>
                    <div className="flex gap-4 pt-4">
                       <a href="tel:+911234567890" className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-[#E23744] transition-all"><Phone className="w-4 h-4" /></a>
                       <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-[#E23744] transition-all"><MapPin className="w-4 h-4" /></div>
                    </div>
                </div>

                {/* Quick Navigation */}
                <div className="space-y-6">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#E23744]">Navigation</h3>
                    <nav className="flex flex-col space-y-3">
                        <Link to="/menu/table-4" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors flex items-center justify-center md:justify-start gap-2">
                             <UtensilsCrossed className="w-3 h-3" /> Menu
                        </Link>
                        <Link to="/admin/orders" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors flex items-center justify-center md:justify-start gap-2">
                             <ShoppingBag className="w-3 h-3" /> Store Orders
                        </Link>
                        <Link to="/admin" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors flex items-center justify-center md:justify-start gap-2">
                             <LayoutDashboard className="w-3 h-3" /> Admin Dashboard
                        </Link>
                    </nav>
                </div>

                {/* Logistics */}
                <div className="space-y-6">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#E23744]">Establishment</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1 shadow-sm px-2 py-1 rounded bg-white/5 w-fit mx-auto md:mx-0">LIVE TERMINAL</p>
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-gray-500 italic">Sidhu Punjabi Restaurant</p>
                        <p className="text-[10px] font-black uppercase text-gray-500 italic">NH-1, Ludhiana, Punjab</p>
                    </div>
                </div>

            </div>

            {/* Bottom Bar */}
            <div className="max-w-7xl mx-auto pt-12 mt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.3em] italic">© 2026 Sidhu Punjabi. Synchronized by Tabletap.</p>
                <div className="flex items-center gap-2 text-[9px] font-bold text-gray-600 uppercase tracking-[0.3em] italic">
                    Built with <Heart className="w-3 h-3 text-[#E23744] fill-[#E23744]" /> for food lovers
                </div>
            </div>
        </footer>
    );
};

export default Footer;
