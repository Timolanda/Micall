import React, { useState } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { toast } from 'sonner';

interface MiCallAuthProps {
  onAuthSuccess?: (address: string) => void;
}

const MiCallAuth: React.FC<MiCallAuthProps> = ({ onAuthSuccess }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        toast.error("MetaMask is not installed. Please install MetaMask.");
        return;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();

      const message = "Login to MiCall Emergency Response Platform";
      const signature = await signer.signMessage(message);

      const response = await axios.post('/api/wallet-login', {
        walletAddress: address,
        signature
      });

      if (response.data.message === "Login successful") {
        setWalletAddress(address);
        onAuthSuccess?.(address);
        toast.success("Successfully connected wallet");
      }
    } catch (error) {
      toast.error("Failed to connect wallet");
      console.error("Wallet connection error:", error);
    }
  };

  return (
    <div className="space-y-4">
      {walletAddress ? (
        <div className="p-4 bg-white rounded-lg shadow">
          <p className="text-sm text-gray-600">Connected: {walletAddress}</p>
        </div>
      ) : (
        <button
          onClick={connectWallet}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
};

export default MiCallAuth; 