import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { env } from '../config/environment';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship: string;
  notificationPreference: 'sms' | 'email' | 'both';
  verified: boolean;
}

export function useContacts() {
  const queryClient = useQueryClient();
  const token = localStorage.getItem('token');

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ['contacts'],
    queryFn: async () => {
      const response = await axios.get(`${env.API_URL}/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    enabled: !!token
  });

  const addContactMutation = useMutation({
    mutationFn: async (contact: Omit<Contact, 'id' | 'verified'>) => {
      const response = await axios.post(
        `${env.API_URL}/contacts`,
        contact,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add contact: ${error.message}`);
    }
  });

  const verifyContactMutation = useMutation({
    mutationFn: async ({ contactId, code }: { contactId: string; code: string }) => {
      const response = await axios.post(
        `${env.API_URL}/contacts/verify`,
        { contactId, code },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact verified successfully');
    }
  });

  const removeContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      await axios.delete(
        `${env.API_URL}/contacts/${contactId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact removed successfully');
    }
  });

  return {
    contacts,
    isLoading,
    addContact: addContactMutation.mutate,
    verifyContact: verifyContactMutation.mutate,
    removeContact: removeContactMutation.mutate,
    isAdding: addContactMutation.isPending,
    isVerifying: verifyContactMutation.isPending,
    isRemoving: removeContactMutation.isPending
  };
} 