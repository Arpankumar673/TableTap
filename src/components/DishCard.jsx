import React from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';

const DishCard = ({ item, onClick }) => {
  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(item)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col h-full active:shadow-md transition-all cursor-pointer"
    >
      <div className="aspect-[4/3] relative overflow-hidden">
        <img 
          src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'} 
          alt={item.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2">
            <div className="bg-white/95 px-2 py-1 rounded-lg shadow-sm border border-gray-50">
                <p className="text-xs font-bold text-[#E23744] leading-none">
                    ₹{item.price || item.menu_item_variants?.[0]?.price || '0'}
                </p>
            </div>
        </div>
      </div>

      <div className="p-3 flex flex-col flex-grow justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-bold text-gray-900 leading-tight line-clamp-1 mb-0.5">
            {item.name}
          </h3>
          <p className="text-[11px] text-gray-500 line-clamp-2 leading-snug h-[30px]">
            {item.description}
          </p>
        </div>

        <button className="w-full h-10 bg-white text-[#E23744] border border-[#E23744] hover:bg-[#E23744] hover:text-white rounded-xl flex items-center justify-center gap-1.5 transition-all duration-200 font-bold text-xs">
           <Plus className="w-4 h-4" />
           ADD
        </button>
      </div>
    </motion.div>
  );
};

export default DishCard;
