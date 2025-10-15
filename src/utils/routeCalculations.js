// Calculate distance between two coordinates using Haversine formula
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance);
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

function toDeg(radians) {
  return radians * (180 / Math.PI);
}

// Get curved path coordinates for a route following Earth's curvature (Great Circle)
// This creates the realistic arc you see on flight tracking sites like Flightradar24
export function getCurvedPath(lat1, lon1, lat2, lon2) {
  const points = [];
  const numPoints = 100; // More points for smoother curve

  // Convert to radians
  const lat1Rad = toRad(lat1);
  const lon1Rad = toRad(lon1);
  const lat2Rad = toRad(lat2);
  const lon2Rad = toRad(lon2);

  // Calculate angular distance
  const dLon = lon2Rad - lon1Rad;

  // Calculate great circle distance using Haversine
  const a = Math.sin((lat2Rad - lat1Rad) / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2;
  const d = 2 * Math.asin(Math.sqrt(a));

  // Handle edge case where points are very close or identical
  if (d < 0.0001) {
    return [[lat1, lon1], [lat2, lon2]];
  }

  // Generate points along the great circle using SLERP (Spherical Linear Interpolation)
  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;

    // Spherical interpolation
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);

    // Convert to Cartesian coordinates
    const x = A * Math.cos(lat1Rad) * Math.cos(lon1Rad) + B * Math.cos(lat2Rad) * Math.cos(lon2Rad);
    const y = A * Math.cos(lat1Rad) * Math.sin(lon1Rad) + B * Math.cos(lat2Rad) * Math.sin(lon2Rad);
    const z = A * Math.sin(lat1Rad) + B * Math.sin(lat2Rad);

    // Convert back to lat/lon
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);

    points.push([toDeg(lat), toDeg(lon)]);
  }

  return points;
}
