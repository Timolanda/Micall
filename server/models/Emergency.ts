import mongoose, { Document, Schema } from 'mongoose';

export interface IEmergency extends Document {
  user: Schema.Types.ObjectId;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: number;
  };
  type: string;
  status: 'active' | 'resolved' | 'cancelled';
  responders?: Schema.Types.ObjectId[];
  createdAt: Date;
  resolvedAt?: Date;
}

const EmergencySchema = new Schema<IEmergency>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: Number,
    timestamp: { type: Number, required: true }
  },
  type: {
    type: String,
    required: true,
    enum: ['medical', 'security', 'fire', 'other']
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'resolved', 'cancelled'],
    default: 'active'
  },
  responders: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: Date
}, {
  timestamps: true
});

// Index for geospatial queries
EmergencySchema.index({ 'location': '2dsphere' });

// Index for active emergencies
EmergencySchema.index({ status: 1, createdAt: -1 });

export const Emergency = mongoose.model<IEmergency>('Emergency', EmergencySchema); 