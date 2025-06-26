import mongoose, { Document, Schema } from 'mongoose';

export interface IDonation extends Document {
  donor: Schema.Types.ObjectId;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  paymentMethod: 'crypto' | 'card' | 'bank';
  transactionId?: string;
  message?: string;
  anonymous: boolean;
  createdAt: Date;
}

const DonationSchema = new Schema<IDonation>({
  donor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  currency: {
    type: String,
    required: true,
    enum: ['USD', 'ETH', 'USDC']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['crypto', 'card', 'bank'],
    required: true
  },
  transactionId: String,
  message: {
    type: String,
    maxlength: 500
  },
  anonymous: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export const Donation = mongoose.model<IDonation>('Donation', DonationSchema); 