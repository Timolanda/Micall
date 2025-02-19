import express from 'express';
import { AuthController } from '../controllers/AuthController';
import { ContactController } from '../controllers/ContactController';
import { EmergencyController } from '../controllers/EmergencyController';
import {
  authenticateJWT,
  rateLimitConfig,
  validateRequest
} from '../middleware/security';
import {
  validateLogin,
  validateContact,
  validateEmergency
} from '../validators';

const router = express.Router();

// Auth routes
router.post(
  '/auth/wallet-login',
  rateLimitConfig.auth,
  validateRequest(validateLogin),
  AuthController.login
);

// Contact routes
router.use('/contacts', authenticateJWT);
router.get('/contacts', ContactController.listContacts);
router.post(
  '/contacts',
  validateRequest(validateContact),
  ContactController.addContact
);
router.post(
  '/contacts/verify',
  rateLimitConfig.standard,
  ContactController.verifyContact
);
router.delete('/contacts/:id', ContactController.removeContact);

// Emergency routes
router.use('/emergency', authenticateJWT);
router.post(
  '/emergency/start',
  rateLimitConfig.emergency,
  validateRequest(validateEmergency),
  EmergencyController.startEmergency
);
router.post('/emergency/:id/resolve', EmergencyController.resolveEmergency);
router.get('/emergency/history', EmergencyController.getHistory);

export default router; 