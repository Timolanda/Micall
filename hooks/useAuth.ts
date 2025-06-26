import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { useQuery, useMutation } from '@tanstack/react-query';
import { env } from '../config/environment';

interface AuthState {
  isAuthenticated: boolean;
  walletAddress: string | null;
  token: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(() => ({
    isAuthenticated: !!localStorage.getItem('token'),
    walletAddress: localStorage.getItem('walletAddress'),
    token: localStorage.getItem('token')
  }));

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    
    const message = "Login to MiCall Emergency Response Platform";
    const signature = await signer.signMessage(message);

    return { address, signature };
  }, []);

  const loginMutation = useMutation({
    mutationFn: async ({ address, signature }: { address: string, signature: string }) => {
      const response = await axios.post(`${env.API_URL}/auth/wallet-login`, {
        walletAddress: address,
        signature
      });
      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      localStorage.setItem('walletAddress', data.user.walletAddress);
      setAuthState({
        isAuthenticated: true,
        walletAddress: data.user.walletAddress,
        token: data.token
      });
    }
  });

  const login = async () => {
    try {
      const { address, signature } = await connectWallet();
      await loginMutation.mutateAsync({ address, signature });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('walletAddress');
    setAuthState({
      isAuthenticated: false,
      walletAddress: null,
      token: null
    });
  }, []);

  return {
    ...authState,
    login,
    logout,
    isLoading: loginMutation.isPending
  };
} 