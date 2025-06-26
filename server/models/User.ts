import mongoose, { Document, Schema } from 'mongoose';

interface IUser extends Document {
  walletAddress: string;
  emergencyContacts: string[];
  currentLocation?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  };
  activeEmergency?: Schema.Types.ObjectId;
}

const UserSchema = new Schema<IUser>({
  walletAddress: { 
    type: String, 
    required: true, 
    unique: true 
  },
  emergencyContacts: [{ 
    type: String 
  }],
  currentLocation: {
    latitude: Number,
    longitude: Number,
    timestamp: Date
  },
  activeEmergency: { 
    type: Schema.Types.ObjectId, 
    ref: 'Emergency' 
  }
});

export default mongoose.model<IUser>('User', UserSchema); 