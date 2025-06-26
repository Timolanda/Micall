import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { donationService } from '../services/DonationService';

export const useDonation = () => {
  const { mutateAsync: createDonation, isLoading } = useMutation({
    mutationFn: donationService.createCardDonation,
    onSuccess: () => {
      toast.success('Thank you for your donation!');
    },
    onError: (error) => {
      toast.error('Failed to process donation');
      console.error('Donation error:', error);
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['donationStats'],
    queryFn: donationService.getDonationStats,
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  return {
    createDonation,
    isLoading,
    stats
  };
}; 