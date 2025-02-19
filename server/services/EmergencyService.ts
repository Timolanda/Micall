import { User, IUser } from '../models/User';
import { Emergency, IEmergency } from '../models/Emergency';
import { WebSocketService } from './websocket';
import { sendPushNotification } from '../utils/notifications';

interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  pushSubscription?: PushSubscription;
}

interface Responder {
  id: string;
  name: string;
  location: Location;
  pushSubscription?: PushSubscription;
}

export class EmergencyService {
  constructor(private wsService: WebSocketService) {}

  async startEmergency(userId: string, location: Location, type: string): Promise<IEmergency> {
    try {
      const user = await User.findById(userId).populate('emergencyContacts');
      if (!user) throw new Error('User not found');

      const emergency = await Emergency.create({
        user: userId,
        location,
        type,
        status: 'active'
      });

      await this.notifyContacts(user, emergency);
      await this.notifyResponders(emergency);

      return emergency;
    } catch (error) {
      console.error('Emergency start error:', error);
      throw error;
    }
  }

  private async notifyContacts(user: IUser, emergency: IEmergency): Promise<void> {
    const contacts = user.emergencyContacts as EmergencyContact[];
    await Promise.all(contacts.map(contact => 
      this.notifyContact(contact, user, emergency.location)
    ));
  }

  private async notifyContact(
    contact: EmergencyContact, 
    user: IUser, 
    location: Location
  ): Promise<void> {
    if (contact.pushSubscription) {
      await sendPushNotification(contact.pushSubscription, {
        title: 'Emergency Alert',
        body: `Emergency alert from ${user.name}`,
        data: { location }
      });
    }
    
    this.wsService.notifyEmergencyContacts(contact.id, 
      `Emergency alert from ${user.name}`
    );
  }

  private async findNearbyResponders(location: Location): Promise<Responder[]> {
    // Implementation to find responders based on location
    return [];
  }
} 