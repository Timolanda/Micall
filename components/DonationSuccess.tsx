import React from 'react';
import { CheckCircle } from 'lucide-react';
import { useRouter } from 'next/router';

interface DonationSuccessProps {
  amount: number;
  currency: string;
  transactionId: string;
}

export const DonationSuccess: React.FC<DonationSuccessProps> = ({
  amount,
  currency,
  transactionId
}) => {
  const router = useRouter();

  return (
    <div className="max-w-md mx-auto text-center py-12">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
      <h1 className="text-2xl font-bold mb-4">Thank You for Your Donation!</h1>
      <p className="text-gray-600 mb-6">
        Your donation of {amount} {currency} has been successfully processed.
      </p>
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-500">Transaction ID</p>
        <p className="font-mono text-sm">{transactionId}</p>
      </div>
      <div className="space-y-4">
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Return to Dashboard
        </button>
        <button
          onClick={() => router.push('/donate')}
          className="w-full py-2 px-4 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
        >
          Make Another Donation
        </button>
      </div>
    </div>
  );
}; 