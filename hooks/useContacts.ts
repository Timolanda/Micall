import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import type { Contact } from '../types';

export function useContacts(userId: string | null) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        setContacts(data || []);
        setError(error ? error.message : null);
        setLoading(false);
      });
  }, [userId]);

  const addContact = async (contact: any) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contacts')
      .insert([contact]) as { data: Contact[] | null, error: any };
    setLoading(false);
    if (!error && Array.isArray(data) && data.length > 0) setContacts((prev) => [...prev, data[0]]);
    return { data, error };
  };

  const removeContact = async (contactId: string) => {
    setLoading(true);
    const { error } = await supabase.from('contacts').delete().eq('id', contactId);
    setLoading(false);
    if (!error) setContacts((prev) => prev.filter((c) => c.id !== contactId));
    return { error };
  };

  return { contacts, loading, error, addContact, removeContact };
} 