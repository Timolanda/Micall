import React, { memo } from 'react';
import { LocationData } from '../types';

interface Props {
  location: LocationData;
}

const LocationDisplay = memo(({ location }: Props) => {
  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <p className="text-sm text-gray-600">
        Latitude: {location.latitude.toFixed(6)}
        <br />
        Longitude: {location.longitude.toFixed(6)}
      </p>
      {/* Additional location info */}
    </div>
  );
});

LocationDisplay.displayName = 'LocationDisplay';

export default LocationDisplay; 