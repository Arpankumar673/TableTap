import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { callWaiter } from '../services/waiterService';
import { toast } from 'react-hot-toast';

const WaiterButton = ({ tableId }) => {
  const [loading, setLoading] = useState(false);

  const handleCall = async () => {
    setLoading(true);
    try {
      await callWaiter(tableId);
      toast.success("Waiter notified!", {
        style: { borderRadius: '1rem', background: '#1C1C1C', color: '#fff', fontSize: '13px' }
      });
    } catch (err) {
      toast.error("Retry signal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button 
      whileTap={{ scale: 0.9 }}
      onClick={handleCall}
      disabled={loading}
      className={`fixed bottom-24 right-4 z-[45] w-12 h-12 rounded-full flex items-center justify-center shadow-xl border-2 border-white transition-all duration-300 active:shadow-none ${
        loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#E23744] text-white shadow-[#E23744]/20'
      }`}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <Bell className="w-5 h-5" />
      )}
    </motion.button>
  );
};

export default WaiterButton;
