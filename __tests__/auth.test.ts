import request from 'supertest';
import { app } from '../server';
import { User } from '../models/User';
import { AuthService } from '../services/AuthService';

describe('Auth Endpoints', () => {
  const mockWalletAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
  const mockSignature = '0x...'; // Valid signature for testing

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /auth/wallet-login', () => {
    it('should authenticate user with valid wallet signature', async () => {
      const response = await request(app)
        .post('/auth/wallet-login')
        .send({
          walletAddress: mockWalletAddress,
          signature: mockSignature
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user.walletAddress', mockWalletAddress);
    });

    it('should return 401 for invalid signature', async () => {
      const response = await request(app)
        .post('/auth/wallet-login')
        .send({
          walletAddress: mockWalletAddress,
          signature: 'invalid-signature'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
}); 