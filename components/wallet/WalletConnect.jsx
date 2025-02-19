import React, { useState, useEffect } from 'react';
import { Wallet, ExternalLink, AlertCircle, Check, Loader2 } from 'lucide-react';

const WalletConnect = ({ onWalletConnect }) => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected, error
  const [error, setError] = useState('');
  const [network, setNetwork] = useState(null);

  useEffect(() => {
    checkWalletConnection();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          handleAccountsChanged(accounts);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  };

  const handleAccountsChanged = async (accounts) => {
    if (accounts.length === 0) {
      setConnectionStatus('disconnected');
      setWalletAddress(null);
    } else {
      setWalletAddress(accounts[0]);
      setConnectionStatus('connected');
      getNetwork();
      onWalletConnect?.(accounts[0]);
    }
  };

  const handleChainChanged = () => {
    window.location.reload();
  };

  const getNetwork = async () => {
    if (window.ethereum) {
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const networks = {
          '0x1': 'Ethereum Mainnet',
          '0x89': 'Polygon',
          '0x38': 'BSC',
          // Add more networks as needed
        };
        setNetwork(networks[chainId] || `Chain ID: ${chainId}`);
      } catch (error) {
        console.error('Error getting network:', error);
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install MetaMask and try again.');
      return;
    }

    setConnectionStatus('connecting');
    setError('');

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
    } catch (error) {
      setError(error.message);
      setConnectionStatus('error');
    }
  };

  const truncateAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="w-full max-w-sm p-4 rounded-lg border bg-card">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {connectionStatus === 'connected' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span className="font-medium">Connected</span>
            </div>
            <span className="text-sm text-muted-foreground">{network}</span>
          </div>
          
          <div className="p-3 rounded-lg bg-muted flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{truncateAddress(walletAddress)}</span>
            </div>
            <a
              href={`https://etherscan.io/address/${walletAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <button
            onClick={() => setConnectionStatus('disconnected')}
            className="w-full py-2 rounded-lg border hover:bg-muted transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={connectWallet}
          disabled={connectionStatus === 'connecting'}
          className="w-full bg-primary text-primary-foreground py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {connectionStatus === 'connecting' ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <Wallet className="h-5 w-5" />
              <span>Connect Wallet</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default WalletConnect; 