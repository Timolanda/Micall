import express from 'express';
import { AuthController } from '../controllers/AuthController';
import { limiter } from '../middleware/security';

const router = express.Router();
const authController = new AuthController();

router.post('/wallet-login', 
  limiter,
  authController.walletLogin.bind(authController)
);

export default router; 