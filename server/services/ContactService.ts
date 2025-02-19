import { User, IUser } from '../models/User';
import { WebSocketService } from './websocket';

interface EmergencyContact {
  name: string;
  phone: string;
  email?: string;
  relationship: string;
  notificationPreference: 'sms' | 'email' | 'both';
}

export class ContactService {
  constructor(private wsService: WebSocketService) {}

  async addContact(userId: string, contactData: EmergencyContact) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Validate phone number format
      if (!this.isValidPhoneNumber(contactData.phone)) {
        throw new Error('Invalid phone number format');
      }

      // Validate email if provided
      if (contactData.email && !this.isValidEmail(contactData.email)) {
        throw new Error('Invalid email format');
      }

      const contact = {
        ...contactData,
        verified: false,
        verificationCode: this.generateVerificationCode(),
        createdAt: new Date()
      };

      user.emergencyContacts.push(contact);
      await user.save();

      // Send verification code to contact
      await this.sendVerificationCode(contact);

      return contact;
    } catch (error) {
      console.error('Add contact error:', error);
      throw error;
    }
  }

  async verifyContact(userId: string, contactId: string, code: string) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const contact = user.emergencyContacts.id(contactId);
    if (!contact) throw new Error('Contact not found');

    if (contact.verificationCode !== code) {
      throw new Error('Invalid verification code');
    }

    contact.verified = true;
    contact.verificationCode = undefined;
    await user.save();

    return contact;
  }

  async removeContact(userId: string, contactId: string) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.emergencyContacts = user.emergencyContacts.filter(
      contact => contact._id.toString() !== contactId
    );

    await user.save();
    return true;
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Basic phone validation - can be made more sophisticated
    return /^\+?[\d\s-]{10,}$/.test(phone);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private generateVerificationCode(): string {
    return Math.random().toString().slice(2, 8);
  }

  private async sendVerificationCode(contact: EmergencyContact & { verificationCode: string }) {
    // Implement SMS/email sending logic here
    // This is just a placeholder
    console.log(`Sending verification code ${contact.verificationCode} to ${contact.phone}`);
  }
} 