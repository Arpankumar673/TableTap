import { supabase } from './supabaseClient';

export const callWaiter = async (tableId) => {
  const { data, error } = await supabase
    .from('waiter_calls')
    .insert({ table_id: tableId, status: 'pending' })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const resolveWaiterCall = async (callId) => {
  const { error } = await supabase
    .from('waiter_calls')
    .update({ status: 'resolved' })
    .eq('id', callId);
    
  if (error) throw error;
};

export const getActiveWaiterCalls = async () => {
    const { data } = await supabase
        .from('waiter_calls')
        .select('*, tables(table_number)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
    return data || [];
};
