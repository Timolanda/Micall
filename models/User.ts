import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  walletAddress: string;
  name?: string;
  phone?: string;
  email?: string;
  emergencyContacts: Array<{
    _id: Schema.Types.ObjectId;
    name: string;
    phone: string;
    email?: string;
    relationship: string;
    verified: boolean;
  }>;
  activeEmergency?: Schema.Types.ObjectId;
  isResponder: boolean;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
}

const UserSchema = new Schema<IUser>({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  name: String,
  phone: String,
  email: String,
  emergencyContacts: [{
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    relationship: {
      type: String,
      enum: ['family', 'friend', 'colleague', 'other'],
      required: true
    },
    verified: {
      type: Boolean,
      default: false
    }
  }],
  activeEmergency: {
    type: Schema.Types.ObjectId,
    ref: 'Emergency'
  },
  isResponder: {
    type: Boolean,
    default: false
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  }
}, {
  timestamps: true
});

UserSchema.index({ location: '2dsphere' });

const User = mongoose.model<IUser>('User', UserSchema);

export { User };
export type { IUser }; 