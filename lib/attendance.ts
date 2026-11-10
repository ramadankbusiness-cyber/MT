export function haversineMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const startLatitude = radians(from.latitude);
  const endLatitude = radians(to.latitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isLate(checkedInAt: Date, startsAt: Date, lateAfterMinutes: number): boolean {
  return checkedInAt.getTime() > startsAt.getTime() + lateAfterMinutes * 60_000;
}

export function isInsideZone(distanceMeters: number, accuracyMeters: number, radiusMeters: number): boolean {
  return distanceMeters + accuracyMeters <= radiusMeters;
}
