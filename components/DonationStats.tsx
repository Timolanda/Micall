import React from 'react';
import { useDonation } from '../hooks/useDonation';
import { Heart, Users, TrendingUp } from 'lucide-react';

export const DonationStats: React.FC = () => {
  const { stats } = useDonation();

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <Heart className="h-8 w-8 text-red-500" />
          <div>
            <h3 className="text-lg font-medium">Total Donations</h3>
            <p className="text-2xl font-bold">
              ${stats.totalAmount.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <Users className="h-8 w-8 text-blue-500" />
          <div>
            <h3 className="text-lg font-medium">Total Donors</h3>
            <p className="text-2xl font-bold">{stats.donorCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <TrendingUp className="h-8 w-8 text-green-500" />
          <div>
            <h3 className="text-lg font-medium">Recent Activity</h3>
            <p className="text-sm text-gray-600">
              {stats.recentDonations.length} donations in the last hour
            </p>
          </div>
        </div>
      </div>

      <div className="col-span-1 md:col-span-3">
        <h3 className="text-lg font-medium mb-4">Recent Donations</h3>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y">
            {stats.recentDonations.map((donation, index) => (
              <div key={index} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{donation.donor}</p>
                    {donation.message && (
                      <p className="text-sm text-gray-600 mt-1">
                        "{donation.message}"
                      </p>
                    )}
                  </div>
                  <p className="font-medium">
                    {donation.amount} {donation.currency}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 