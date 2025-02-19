import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { env } from '../config/environment';

export class AuthService {
  private generateToken(user: IUser): string {
    return jwt.sign(
      { 
        id: user._id,
        walletAddress: user.walletAddress 
      },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  async verifyWalletSignature(walletAddress: string, signature: string): Promise<boolean> {
    try {
      const message = "Login to MiCall Emergency Response Platform";
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  async authenticateWallet(walletAddress: string, signature: string) {
    const isValidSignature = await this.verifyWalletSignature(walletAddress, signature);
    if (!isValidSignature) {
      throw new Error('Invalid signature');
    }

    let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      user = await User.create({
        walletAddress: walletAddress.toLowerCase(),
        emergencyContacts: [],
        createdAt: new Date()
      });
    }

    const token = this.generateToken(user);
    return { user, token };
  }
} 