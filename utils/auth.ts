import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { redis } from './cache';

export async function verifyTokenWithRotation(token: string): Promise<any> {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    
    // Check if token has been revoked
    const isRevoked = await redis.get(`revoked:${token}`);
    if (isRevoked) {
      throw new Error('Token has been revoked');
    }

    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
} 