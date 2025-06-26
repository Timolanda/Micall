export const CONTRACTS = {
  USDC: {
    1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum Mainnet
    137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // Polygon Mainnet
    // Add testnet addresses if needed
  }
} as const;

export const DONATION_CONFIG = {
  WALLET_ADDRESS: '0x8fD674B7fd63800292047de03D3fdDFBcCCBbc4c',
  MIN_DONATION: {
    ETH: 0.01,
    USDC: 10
  },
  GAS_LIMIT: {
    ETH: 21000,
    USDC: 65000
  }
} as const; 