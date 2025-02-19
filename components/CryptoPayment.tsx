import React, { useState, useEffect } from 'react';
import { useAccount, useConnect, useNetwork, useBalance, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { parseEther, parseUnits, formatUnits } from 'viem';
import { Loader2, Wallet, AlertTriangle } from 'lucide-react';
import { env } from '../config/environment';
import { CONTRACTS, DONATION_CONFIG } from '../config/contracts';
import { toast } from 'sonner';

// USDC ABI for transfer function
const USDC_ABI = [
  {
    constant: false,
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function'
  }
] as const;

interface CryptoPaymentProps {
  amount: number;
  currency: 'ETH' | 'USDC';
  onSuccess: (txHash: string) => void;
  onError: (error: Error) => void;
}

export const CryptoPayment: React.FC<CryptoPaymentProps> = ({
  amount,
  currency,
  onSuccess,
  onError
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { connect } = useConnect({
    connector: new InjectedConnector()
  });

  // Check if current network is supported
  const isNetworkSupported = chain && env.SUPPORTED_CHAINS.includes(chain.id);

  // Get balance for selected currency
  const { data: balance } = useBalance({
    address,
    token: currency === 'USDC' ? CONTRACTS.USDC[chain?.id as keyof typeof CONTRACTS.USDC] : undefined
  });

  // Prepare USDC transfer
  const { config: usdcConfig } = usePrepareContractWrite({
    address: CONTRACTS.USDC[chain?.id as keyof typeof CONTRACTS.USDC],
    abi: USDC_ABI,
    functionName: 'transfer',
    args: [DONATION_CONFIG.WALLET_ADDRESS, parseUnits(amount.toString(), 6)],
    enabled: currency === 'USDC' && isConnected && isNetworkSupported
  });

  const { writeAsync: transferUsdc } = useContractWrite(usdcConfig);

  const handleDonation = async () => {
    if (!address || !isConnected) {
      connect();
      return;
    }

    if (!isNetworkSupported) {
      toast.error(`Please switch to a supported network`);
      return;
    }

    setIsProcessing(true);
    try {
      let txHash;
      if (currency === 'USDC') {
        const tx = await transferUsdc?.();
        txHash = tx?.hash;
      } else {
        const tx = await sendTransaction({
          to: DONATION_CONFIG.WALLET_ADDRESS,
          value: parseEther(amount.toString()),
          gas: DONATION_CONFIG.GAS_LIMIT.ETH
        });
        txHash = tx.hash;
      }

      if (txHash) {
        onSuccess(txHash);
        toast.success('Thank you for your donation!');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Transaction failed');
      onError(error);
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const insufficientBalance = balance && 
    parseFloat(formatUnits(balance.value, currency === 'USDC' ? 6 : 18)) < amount;

  const belowMinimum = amount < DONATION_CONFIG.MIN_DONATION[currency];

  return (
    <div className="space-y-4">
      {!isNetworkSupported && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-800">Unsupported Network</h4>
            <p className="text-sm text-yellow-700">
              Please switch to a supported network (Ethereum or Polygon)
            </p>
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600">Connected Wallet</p>
        <p className="font-mono text-sm">{address || 'Not connected'}</p>
        <p className="text-sm text-gray-600 mt-2">Balance</p>
        <p className="font-medium">
          {balance ? formatUnits(balance.value, currency === 'USDC' ? 6 : 18) : '0'} {currency}
        </p>
      </div>

      <button
        onClick={handleDonation}
        disabled={isProcessing || insufficientBalance || belowMinimum || !isNetworkSupported}
        className="w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
        ) : insufficientBalance ? (
          'Insufficient Balance'
        ) : belowMinimum ? (
          `Minimum donation is ${DONATION_CONFIG.MIN_DONATION[currency]} ${currency}`
        ) : (
          `Donate ${amount} ${currency}`
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Network: {chain?.name || 'Not connected'}
      </p>
    </div>
  );
}; 