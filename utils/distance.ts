export function getDistanceKm(
  origin: [number, number],
  destination: [number, number]
): number {
  const [lat1, lon1] = origin;
  const [lat2, lon2] = destination;

  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function isWithinRadiusKm(
  origin: [number, number],
  destination: [number, number],
  radiusKm: number
): boolean {
  return getDistanceKm(origin, destination) <= radiusKm;
}

