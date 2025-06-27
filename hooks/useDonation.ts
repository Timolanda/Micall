// The donationService backend is removed. Commenting out the hook implementation.

/*
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

type CardDonationInput = {
  userId: string;
  amount: number;
  currency: string;
  paymentMethodId: string;
  message?: string;
  anonymous: boolean;
};

type CardDonationResult = {
  donation: any;
  paymentIntent: any;
};

export const useDonation = () => {
  const { mutate, isPending, data, error, reset } = useMutation<CardDonationResult, Error, CardDonationInput>({
    mutationFn: donationService.createCardDonation,
    onSuccess: () => {
      toast.success('Donation successful!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Donation failed');
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['donationStats'],
    queryFn: donationService.getDonationStats,
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  return {
    donate: mutate,
    isPending,
    data,
    error,
    reset,
    stats
  };
};
*/ 