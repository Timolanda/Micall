import request from 'supertest';
import { app } from '../server';
import { User } from '../models/User';
import { Emergency } from '../models/Emergency';
import { generateTestToken } from '../test/helpers';

describe('Emergency Endpoints', () => {
  let authToken: string;
  let testUser: any;

  beforeEach(async () => {
    testUser = await User.create({
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      emergencyContacts: []
    });
    authToken = generateTestToken(testUser);
  });

  describe('POST /emergency/start', () => {
    it('should create new emergency event', async () => {
      const response = await request(app)
        .post('/emergency/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          location: {
            latitude: 40.7128,
            longitude: -74.0060,
            accuracy: 10
          },
          type: 'medical'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('status', 'active');
      
      const emergency = await Emergency.findById(response.body.id);
      expect(emergency).toBeTruthy();
      expect(emergency?.user.toString()).toBe(testUser._id.toString());
    });
  });
}); 