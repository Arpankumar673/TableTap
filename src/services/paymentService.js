import { supabase } from './supabaseClient';

export const initializePayment = async ({ orderId, amount, tableNumber }) => {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. Create Order on Razorpay using Edge Function
      const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: { amount, receipt: `order_${orderId}` }
      });

      if (error) throw error;

      // 2. Configure Options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        name: "Sidhu Punjabi",
        description: `Order #${orderId.slice(0, 6)} - Table ${tableNumber}`,
        order_id: data.id,
        handler: async (response) => {
          // 3. Verify Payment Signature
          const { data: verification, error: vError } = await supabase.functions.invoke('verify-payment', {
            body: { 
                ...response, 
                order_id: orderId 
            }
          });

          if (vError || !verification.success) {
            reject({ success: false, message: "Payment verification failed" });
          } else {
            resolve({ success: true, paymentId: response.razorpay_payment_id });
          }
        },
        modal: {
            ondismiss: () => reject({ success: false, message: "Payment cancelled by user" })
        },
        prefill: { name: "Valued Customer" },
        theme: { color: "#F59E0B" }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Razorpay Handoff Failed:", err);
      reject(err);
    }
  });
};
