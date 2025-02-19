import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface IEmergency extends Document {
  user: Schema.Types.ObjectId | IUser;
  type: 'medical' | 'fire' | 'police' | 'other';
  status: 'active' | 'resolved' | 'cancelled';
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
    accuracy?: number;
  };
  description?: string;
  responders: Array<Schema.Types.ObjectId | IUser>;
  createdAt: Date;
  resolvedAt?: Date;
}

const EmergencySchema = new Schema<IEmergency>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['medical', 'fire', 'police', 'other'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'cancelled'],
    default: 'active'
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
    },
    accuracy: Number
  },
  description: String,
  responders: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  resolvedAt: Date
}, {
  timestamps: true
});

// Add compound indexes for common queries
EmergencySchema.index({ status: 1, createdAt: -1 });
EmergencySchema.index({ user: 1, status: 1 });
EmergencySchema.index({ location: '2dsphere' });

// Add partial index for active emergencies
EmergencySchema.index(
  { status: 1, location: 1 },
  { partialFilterExpression: { status: 'active' } }
);

// Add TTL index for resolved emergencies
EmergencySchema.index(
  { resolvedAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 days
);

export const Emergency = mongoose.model<IEmergency>('Emergency', EmergencySchema); 