export interface Environment {
  API_URL: string;
  WALLET_CONNECT_PROJECT_ID: string;
  MAPBOX_TOKEN?: string;
  NODE_ENV: 'development' | 'production' | 'test';
  VAPID_PUBLIC_KEY: string;
  JWT_SECRET: string;
  FRONTEND_URL: string;
  ADMIN_EMAIL: string;
  MONGODB_URI: string;
  REDIS_HOST: string;
  REDIS_PORT: string;
  REDIS_PASSWORD?: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  AWS_BACKUP_BUCKET: string;
  STRIPE_SECRET_KEY: string;
  ETH_RPC_URL: string;
  ETH_NETWORK: string;
  DONATION_WALLET_KEY: string;
  DONATION_WALLET_ADDRESS: string;
  SUPPORTED_CHAINS: number[];
  INFURA_ID: string;
}

export const env: Environment = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  WALLET_CONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
  MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  NODE_ENV: (process.env.NODE_ENV as Environment['NODE_ENV']) || 'development',
  VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret-key',
  FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@micall.com',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/micall',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT || '6379',
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_BACKUP_BUCKET: process.env.AWS_BACKUP_BUCKET || 'micall-backups',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  ETH_RPC_URL: process.env.ETH_RPC_URL || 'https://mainnet.infura.io/v3/your-project-id',
  ETH_NETWORK: process.env.ETH_NETWORK || 'mainnet',
  DONATION_WALLET_KEY: process.env.DONATION_WALLET_KEY || '',
  DONATION_WALLET_ADDRESS: process.env.DONATION_WALLET_ADDRESS || '',
  SUPPORTED_CHAINS: (process.env.SUPPORTED_CHAINS || '1,137').split(',').map(Number),
  INFURA_ID: process.env.INFURA_ID || ''
}; 