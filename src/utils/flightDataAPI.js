// Flight data API integration
// Uses AviationStack API for real flight time data

const API_KEY = 'YOUR_API_KEY_HERE'; // User should add their own key
const BASE_URL = 'http://api.aviationstack.com/v1';

// Cache for flight data to avoid repeated API calls
const flightDataCache = new Map();

/**
 * Fetch real flight data between two airports
 * @param {string} departureIATA - Departure airport code (e.g., 'LAX')
 * @param {string} arrivalIATA - Arrival airport code (e.g., 'JFK')
 * @returns {Promise<Object>} Flight data including duration
 */
export async function getFlightData(departureIATA, arrivalIATA) {
  const cacheKey = `${departureIATA}-${arrivalIATA}`;

  // Check cache first
  if (flightDataCache.has(cacheKey)) {
    return flightDataCache.get(cacheKey);
  }

  // Also check reverse route
  const reverseCacheKey = `${arrivalIATA}-${departureIATA}`;
  if (flightDataCache.has(reverseCacheKey)) {
    return flightDataCache.get(reverseCacheKey);
  }

  try {
    // Note: This is a placeholder for API integration
    // Users need to sign up at https://aviationstack.com/ for a free API key

    if (API_KEY === 'YOUR_API_KEY_HERE') {
      // Return mock data if no API key is configured
      return getMockFlightData(departureIATA, arrivalIATA);
    }

    const url = `${BASE_URL}/routes?dep_iata=${departureIATA}&arr_iata=${arrivalIATA}&access_key=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn('API request failed, using mock data');
      return getMockFlightData(departureIATA, arrivalIATA);
    }

    const data = await response.json();

    if (data.data && data.data.length > 0) {
      const route = data.data[0];

      const flightData = {
        departure: departureIATA,
        arrival: arrivalIATA,
        airlines: route.airline ? [route.airline.iata] : [],
        // API may not provide duration, calculate if needed
        duration: null,
        hasRealData: true
      };

      flightDataCache.set(cacheKey, flightData);
      return flightData;
    }

    // If no data found, return mock
    return getMockFlightData(departureIATA, arrivalIATA);

  } catch (error) {
    console.error('Error fetching flight data:', error);
    return getMockFlightData(departureIATA, arrivalIATA);
  }
}

/**
 * Get mock flight data based on distance
 * This provides realistic estimates when API is not available
 */
function getMockFlightData(departureIATA, arrivalIATA) {
  return {
    departure: departureIATA,
    arrival: arrivalIATA,
    airlines: [],
    duration: null, // Will be calculated based on distance
    hasRealData: false
  };
}

/**
 * Calculate flight duration from distance
 * Uses realistic average speeds for domestic flights
 */
export function calculateFlightDuration(distanceMiles) {
  // Flight time components
  const taxiTime = 15; // minutes (average taxi/takeoff/landing time)
  const climbDescendTime = 10; // minutes

  // Cruise speed varies by distance
  let cruiseSpeed;
  if (distanceMiles < 500) {
    cruiseSpeed = 450; // mph (shorter flights fly slower)
  } else if (distanceMiles < 1500) {
    cruiseSpeed = 500; // mph
  } else {
    cruiseSpeed = 550; // mph (longer flights at higher altitude)
  }

  // Calculate cruise time
  const cruiseTimeMinutes = (distanceMiles / cruiseSpeed) * 60;

  // Total flight time
  const totalMinutes = Math.round(taxiTime + climbDescendTime + cruiseTimeMinutes);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return { hours, minutes, totalMinutes };
}

/**
 * Format duration for display
 */
export function formatDuration(hours, minutes) {
  if (hours === 0) {
    return `${minutes}min`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}min`;
  }
}

/**
 * Clear the flight data cache
 */
export function clearFlightDataCache() {
  flightDataCache.clear();
}
