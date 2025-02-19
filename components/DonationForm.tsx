import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CreditCard, Wallet } from 'lucide-react';
import { useDonation } from '../hooks/useDonation';

const donationSchema = z.object({
  amount: z.number().min(1, 'Minimum donation is 1'),
  currency: z.enum(['USD', 'ETH', 'USDC']),
  paymentMethod: z.enum(['crypto', 'card']),
  message: z.string().max(500).optional(),
  anonymous: z.boolean().default(false)
});

type DonationFormData = z.infer<typeof donationSchema>;

export const DonationForm: React.FC = () => {
  const { createDonation, isLoading } = useDonation();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<DonationFormData>({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      currency: 'USD',
      paymentMethod: 'card',
      anonymous: false
    }
  });

  const paymentMethod = watch('paymentMethod');

  const onSubmit = async (data: DonationFormData) => {
    try {
      await createDonation(data);
    } catch (error) {
      console.error('Donation failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium">Amount</label>
        <input
          type="number"
          step="0.01"
          {...register('amount', { valueAsNumber: true })}
          className="w-full px-3 py-2 border rounded-md"
        />
        {errors.amount && (
          <p className="text-sm text-red-500">{errors.amount.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Currency</label>
        <select
          {...register('currency')}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="USD">USD</option>
          <option value="ETH">ETH</option>
          <option value="USDC">USDC</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Payment Method</label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => {
              const event = { target: { value: 'card' } };
              register('paymentMethod').onChange(event);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md ${
              paymentMethod === 'card' ? 'bg-blue-100' : 'bg-gray-100'
            }`}
          >
            <CreditCard className="h-5 w-5" />
            Card
          </button>
          <button
            type="button"
            onClick={() => register('paymentMethod').onChange('crypto')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md ${
              paymentMethod === 'crypto' ? 'bg-blue-100' : 'bg-gray-100'
            }`}
          >
            <Wallet className="h-5 w-5" />
            Crypto
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Message (Optional)</label>
        <textarea
          {...register('message')}
          className="w-full px-3 py-2 border rounded-md"
          rows={3}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          {...register('anonymous')}
          className="rounded"
        />
        <label className="text-sm">Make donation anonymous</label>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
        ) : (
          'Donate'
        )}
      </button>
    </form>
  );
}; 