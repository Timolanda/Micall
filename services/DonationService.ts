import { ethers } from 'ethers';
import Stripe from 'stripe';
import { Donation, IDonation } from '../models/Donation';
import { User } from '../models/User';
import logger from '../utils/logger';
import { env } from '../config/environment';
import { sendNotification } from '../utils/notification';

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

export class DonationService {
  async createCryptoDonation(data: {
    userId: string;
    amount: number;
    currency: string;
    message?: string;
    anonymous: boolean;
  }) {
    const donation = await Donation.create({
      donor: data.userId,
      amount: data.amount,
      currency: data.currency,
      paymentMethod: 'crypto',
      message: data.message,
      anonymous: data.anonymous
    });

    // Generate payment address or contract interaction details
    const paymentDetails = await this.generateCryptoPaymentDetails(donation);
    return { donation, paymentDetails };
  }

  async createCardDonation(data: {
    userId: string;
    amount: number;
    currency: string;
    paymentMethodId: string;
    message?: string;
    anonymous: boolean;
  }) {
    const user = await User.findById(data.userId);
    if (!user) {
      throw new Error('User not found');
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(data.amount * 100), // Convert to cents
        currency: data.currency.toLowerCase(),
        payment_method: data.paymentMethodId,
        confirmation_method: 'manual',
        confirm: true,
        metadata: {
          userId: data.userId,
          donationType: 'emergency-response'
        }
      });

      const donation = await Donation.create({
        donor: data.userId,
        amount: data.amount,
        currency: data.currency,
        paymentMethod: 'card',
        transactionId: paymentIntent.id,
        status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
        message: data.message,
        anonymous: data.anonymous
      });

      return { donation, paymentIntent };
    } catch (error) {
      logger.error('Card donation failed:', error);
      throw error;
    }
  }

  private async generateCryptoPaymentDetails(donation: IDonation) {
    // Implementation depends on the blockchain and wallet integration
    // This is a simplified example
    const provider = new ethers.JsonRpcProvider(env.ETH_RPC_URL);
    const wallet = new ethers.Wallet(env.DONATION_WALLET_KEY, provider);

    return {
      address: wallet.address,
      network: env.ETH_NETWORK,
      amount: donation.amount,
      currency: donation.currency
    };
  }

  async getDonationStats() {
    const [totalAmount, donorCount, recentDonations] = await Promise.all([
      Donation.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Donation.distinct('donor', { status: 'completed' }),
      Donation.find({ status: 'completed' })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('donor', 'name')
    ]);

    return {
      totalAmount: totalAmount[0]?.total || 0,
      donorCount: donorCount.length,
      recentDonations: recentDonations.map(d => ({
        amount: d.amount,
        currency: d.currency,
        donor: d.anonymous ? 'Anonymous' : d.donor.name,
        message: d.message
      }))
    };
  }

  async handlePaymentSuccess(paymentIntentId: string) {
    const donation = await Donation.findOne({ transactionId: paymentIntentId });
    if (!donation) {
      throw new Error('Donation not found');
    }

    donation.status = 'completed';
    await donation.save();

    // Send thank you email
    await this.sendThankYouEmail(donation);

    return donation;
  }

  async handlePaymentFailure(paymentIntentId: string, error: string) {
    const donation = await Donation.findOne({ transactionId: paymentIntentId });
    if (!donation) {
      throw new Error('Donation not found');
    }

    donation.status = 'failed';
    await donation.save();

    // Log the failure
    logger.error('Payment failed:', {
      donationId: donation._id,
      paymentIntentId,
      error
    });

    return donation;
  }

  private async sendThankYouEmail(donation: IDonation) {
    const user = await User.findById(donation.donor);
    if (!user?.email) return;

    await sendNotification({
      to: user.email,
      subject: 'Thank You for Your Donation',
      body: `
        Dear ${user.name || 'Supporter'},

        Thank you for your generous donation of ${donation.amount} ${donation.currency}.
        Your support helps us provide emergency response services to those in need.

        Transaction ID: ${donation.transactionId}

        Best regards,
        The MiCall Team
      `
    });
  }
}

export const donationService = new DonationService(); 