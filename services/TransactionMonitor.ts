import { ethers } from 'ethers';
import { env } from '../config/environment';
import { donationService } from './DonationService';
import logger from '../utils/logger';

export class TransactionMonitor {
  private providers: Record<number, ethers.Provider>;

  constructor() {
    this.providers = env.SUPPORTED_CHAINS.reduce((acc, chainId) => ({
      ...acc,
      [chainId]: new ethers.JsonRpcProvider(
        chainId === 1 
          ? `https://mainnet.infura.io/v3/${env.INFURA_ID}`
          : `https://polygon-mainnet.infura.io/v3/${env.INFURA_ID}`
      )
    }), {});
  }

  async monitorTransaction(txHash: string, chainId: number) {
    const provider = this.providers[chainId];
    if (!provider) {
      throw new Error('Unsupported chain');
    }

    try {
      const tx = await provider.getTransaction(txHash);
      const receipt = await tx?.wait();

      if (receipt?.status === 1) {
        await donationService.handlePaymentSuccess(txHash);
        logger.info(`Transaction ${txHash} confirmed`);
      } else {
        await donationService.handlePaymentFailure(txHash, 'Transaction failed');
        logger.error(`Transaction ${txHash} failed`);
      }
    } catch (error) {
      logger.error('Transaction monitoring failed:', error);
      throw error;
    }
  }
}

export const transactionMonitor = new TransactionMonitor(); 