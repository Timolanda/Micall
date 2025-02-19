import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { validateWalletLogin } from '../validators/auth';

const authService = new AuthService();

export class AuthController {
  async walletLogin(req: Request, res: Response) {
    try {
      const { error } = validateWalletLogin(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const { walletAddress, signature } = req.body;
      const { user, token } = await authService.authenticateWallet(walletAddress, signature);

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          walletAddress: user.walletAddress
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({ error: 'Authentication failed' });
    }
  }
} 