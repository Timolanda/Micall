import { Request, Response } from 'express';
import { ContactService } from '../services/ContactService';
import { WebSocketService } from '../services/websocket';
import { validateContact } from '../validators/contact';

const wsService = new WebSocketService(/* pass your HTTP server here */);
const contactService = new ContactService(wsService);

export class ContactController {
  async addContact(req: Request, res: Response) {
    try {
      const { error } = validateContact(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const contact = await contactService.addContact(req.user.id, req.body);
      res.status(201).json(contact);
    } catch (error) {
      console.error('Add contact error:', error);
      res.status(500).json({ error: 'Failed to add contact' });
    }
  }

  async verifyContact(req: Request, res: Response) {
    try {
      const { contactId, code } = req.body;
      const contact = await contactService.verifyContact(req.user.id, contactId, code);
      res.json(contact);
    } catch (error) {
      console.error('Verify contact error:', error);
      res.status(400).json({ error: 'Verification failed' });
    }
  }

  async removeContact(req: Request, res: Response) {
    try {
      const { contactId } = req.params;
      await contactService.removeContact(req.user.id, contactId);
      res.json({ message: 'Contact removed successfully' });
    } catch (error) {
      console.error('Remove contact error:', error);
      res.status(500).json({ error: 'Failed to remove contact' });
    }
  }

  async listContacts(req: Request, res: Response) {
    try {
      const user = await User.findById(req.user.id).select('emergencyContacts');
      if (!user) throw new Error('User not found');
      
      res.json(user.emergencyContacts);
    } catch (error) {
      console.error('List contacts error:', error);
      res.status(500).json({ error: 'Failed to list contacts' });
    }
  }
} 