// Generate realistic synthetic US airport network data

const US_BOUNDS = {
  minLat: 25.0,
  maxLat: 49.0,
  minLon: -125.0,
  maxLon: -66.0
};

const MAJOR_AIRLINES = [
  { id: 'AA', name: 'American Airlines', color: '#0078D2', hubs: ['DFW', 'CLT', 'MIA', 'PHX'] },
  { id: 'DL', name: 'Delta Air Lines', color: '#C8102E', hubs: ['ATL', 'DTW', 'MSP', 'SLC'] },
  { id: 'UA', name: 'United Airlines', color: '#0A3055', hubs: ['ORD', 'DEN', 'IAH', 'SFO', 'EWR'] },
  { id: 'WN', name: 'Southwest Airlines', color: '#FFB612', hubs: ['DAL', 'LAS', 'PHX', 'BWI'] },
  { id: 'AS', name: 'Alaska Airlines', color: '#01426A', hubs: ['SEA', 'PDX'] },
  { id: 'B6', name: 'JetBlue Airways', color: '#0A3055', hubs: ['JFK', 'BOS', 'FLL'] },
  { id: 'NK', name: 'Spirit Airlines', color: '#FFE900', hubs: ['FLL', 'LAS', 'ORD'] },
  { id: 'F9', name: 'Frontier Airlines', color: '#00A651', hubs: ['DEN', 'LAS'] },
  { id: 'G4', name: 'Allegiant Air', color: '#0B2D6D', hubs: ['LAS', 'SFB'] },
  { id: 'SY', name: 'Sun Country Airlines', color: '#FFD100', hubs: ['MSP'] }
];

const MAJOR_CITIES = [
  // Top 20 Busiest US Airports
  { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International', city: 'Atlanta', state: 'GA', lat: 33.6407, lon: -84.4277 },
  { code: 'ORD', name: "O'Hare International", city: 'Chicago', state: 'IL', lat: 41.9742, lon: -87.9073 },
  { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', state: 'CA', lat: 33.9416, lon: -118.4085 },
  { code: 'DFW', name: 'Dallas/Fort Worth International', city: 'Dallas', state: 'TX', lat: 32.8998, lon: -97.0403 },
  { code: 'DEN', name: 'Denver International', city: 'Denver', state: 'CO', lat: 39.8561, lon: -104.6737 },
  { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', state: 'NY', lat: 40.6413, lon: -73.7781 },
  { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', state: 'CA', lat: 37.6213, lon: -122.3790 },
  { code: 'LAS', name: 'Harry Reid International', city: 'Las Vegas', state: 'NV', lat: 36.0840, lon: -115.1537 },
  { code: 'SEA', name: 'Seattle-Tacoma International', city: 'Seattle', state: 'WA', lat: 47.4502, lon: -122.3088 },
  { code: 'CLT', name: 'Charlotte Douglas International', city: 'Charlotte', state: 'NC', lat: 35.2144, lon: -80.9473 },
  { code: 'MCO', name: 'Orlando International', city: 'Orlando', state: 'FL', lat: 28.4312, lon: -81.3081 },
  { code: 'MIA', name: 'Miami International', city: 'Miami', state: 'FL', lat: 25.7959, lon: -80.2870 },
  { code: 'PHX', name: 'Phoenix Sky Harbor International', city: 'Phoenix', state: 'AZ', lat: 33.4346, lon: -112.0082 },
  { code: 'IAH', name: 'George Bush Intercontinental', city: 'Houston', state: 'TX', lat: 29.9902, lon: -95.3368 },
  { code: 'BOS', name: 'Logan International', city: 'Boston', state: 'MA', lat: 42.3656, lon: -71.0096 },
  { code: 'MSP', name: 'Minneapolis-St. Paul International', city: 'Minneapolis', state: 'MN', lat: 44.8820, lon: -93.2218 },
  { code: 'DTW', name: 'Detroit Metropolitan Wayne County', city: 'Detroit', state: 'MI', lat: 42.2162, lon: -83.3554 },
  { code: 'FLL', name: 'Fort Lauderdale-Hollywood International', city: 'Fort Lauderdale', state: 'FL', lat: 26.0742, lon: -80.1506 },
  { code: 'SLC', name: 'Salt Lake City International', city: 'Salt Lake City', state: 'UT', lat: 40.7899, lon: -111.9791 },
  { code: 'EWR', name: 'Newark Liberty International', city: 'Newark', state: 'NJ', lat: 40.6895, lon: -74.1745 },

  // Additional Major Airports (20-50)
  { code: 'PHL', name: 'Philadelphia International', city: 'Philadelphia', state: 'PA', lat: 39.8729, lon: -75.2437 },
  { code: 'LGA', name: 'LaGuardia Airport', city: 'New York', state: 'NY', lat: 40.7769, lon: -73.8740 },
  { code: 'BWI', name: 'Baltimore/Washington International', city: 'Baltimore', state: 'MD', lat: 39.1774, lon: -76.6684 },
  { code: 'DCA', name: 'Ronald Reagan Washington National', city: 'Washington', state: 'DC', lat: 38.8521, lon: -77.0377 },
  { code: 'IAD', name: 'Washington Dulles International', city: 'Washington', state: 'DC', lat: 38.9531, lon: -77.4565 },
  { code: 'SAN', name: 'San Diego International', city: 'San Diego', state: 'CA', lat: 32.7336, lon: -117.1897 },
  { code: 'TPA', name: 'Tampa International', city: 'Tampa', state: 'FL', lat: 27.9755, lon: -82.5332 },
  { code: 'PDX', name: 'Portland International', city: 'Portland', state: 'OR', lat: 45.5898, lon: -122.5951 },
  { code: 'HNL', name: 'Daniel K. Inouye International', city: 'Honolulu', state: 'HI', lat: 21.3187, lon: -157.9225 },
  { code: 'BNA', name: 'Nashville International', city: 'Nashville', state: 'TN', lat: 36.1245, lon: -86.6782 },
  { code: 'AUS', name: 'Austin-Bergstrom International', city: 'Austin', state: 'TX', lat: 30.1945, lon: -97.6699 },
  { code: 'MDW', name: 'Chicago Midway International', city: 'Chicago', state: 'IL', lat: 41.7868, lon: -87.7522 },
  { code: 'RDU', name: 'Raleigh-Durham International', city: 'Raleigh', state: 'NC', lat: 35.8776, lon: -78.7875 },
  { code: 'DAL', name: 'Dallas Love Field', city: 'Dallas', state: 'TX', lat: 32.8470, lon: -96.8517 },
  { code: 'STL', name: 'St. Louis Lambert International', city: 'St. Louis', state: 'MO', lat: 38.7487, lon: -90.3700 },
  { code: 'SJC', name: 'Norman Y. Mineta San Jose International', city: 'San Jose', state: 'CA', lat: 37.3639, lon: -121.9289 },
  { code: 'MCI', name: 'Kansas City International', city: 'Kansas City', state: 'MO', lat: 39.2976, lon: -94.7139 },
  { code: 'OAK', name: 'Oakland International', city: 'Oakland', state: 'CA', lat: 37.7213, lon: -122.2208 },
  { code: 'SAT', name: 'San Antonio International', city: 'San Antonio', state: 'TX', lat: 29.5337, lon: -98.4698 },
  { code: 'SMF', name: 'Sacramento International', city: 'Sacramento', state: 'CA', lat: 38.6954, lon: -121.5908 }
];

// Additional real US regional airports with correct codes and locations
const REGIONAL_AIRPORTS = [
  { code: 'MKE', name: 'Milwaukee Mitchell International', city: 'Milwaukee', state: 'WI', lat: 42.9472, lon: -87.8966 },
  { code: 'IND', name: 'Indianapolis International', city: 'Indianapolis', state: 'IN', lat: 39.7173, lon: -86.2944 },
  { code: 'CLE', name: 'Cleveland Hopkins International', city: 'Cleveland', state: 'OH', lat: 41.4117, lon: -81.8498 },
  { code: 'CMH', name: 'John Glenn Columbus International', city: 'Columbus', state: 'OH', lat: 39.9980, lon: -82.8919 },
  { code: 'CVG', name: 'Cincinnati/Northern Kentucky International', city: 'Cincinnati', state: 'OH', lat: 39.0488, lon: -84.6678 },
  { code: 'PIT', name: 'Pittsburgh International', city: 'Pittsburgh', state: 'PA', lat: 40.4915, lon: -80.2329 },
  { code: 'MEM', name: 'Memphis International', city: 'Memphis', state: 'TN', lat: 35.0424, lon: -89.9767 },
  { code: 'JAX', name: 'Jacksonville International', city: 'Jacksonville', state: 'FL', lat: 30.4941, lon: -81.6879 },
  { code: 'RSW', name: 'Southwest Florida International', city: 'Fort Myers', state: 'FL', lat: 26.5362, lon: -81.7552 },
  { code: 'PBI', name: 'Palm Beach International', city: 'West Palm Beach', state: 'FL', lat: 26.6832, lon: -80.0956 },
  { code: 'BDL', name: 'Bradley International', city: 'Hartford', state: 'CT', lat: 41.9389, lon: -72.6832 },
  { code: 'PVD', name: 'T.F. Green International', city: 'Providence', state: 'RI', lat: 41.7240, lon: -71.4281 },
  { code: 'BUF', name: 'Buffalo Niagara International', city: 'Buffalo', state: 'NY', lat: 42.9405, lon: -78.7322 },
  { code: 'ROC', name: 'Greater Rochester International', city: 'Rochester', state: 'NY', lat: 43.1189, lon: -77.6724 },
  { code: 'SYR', name: 'Syracuse Hancock International', city: 'Syracuse', state: 'NY', lat: 43.1112, lon: -76.1063 },
  { code: 'ALB', name: 'Albany International', city: 'Albany', state: 'NY', lat: 42.7483, lon: -73.8017 },
  { code: 'MHT', name: 'Manchester-Boston Regional', city: 'Manchester', state: 'NH', lat: 42.9326, lon: -71.4357 },
  { code: 'BTV', name: 'Burlington International', city: 'Burlington', state: 'VT', lat: 44.4719, lon: -73.1533 },
  { code: 'PWM', name: 'Portland International Jetport', city: 'Portland', state: 'ME', lat: 43.6456, lon: -70.3093 },
  { code: 'ABQ', name: 'Albuquerque International Sunport', city: 'Albuquerque', state: 'NM', lat: 35.0402, lon: -106.6092 },
  { code: 'TUS', name: 'Tucson International', city: 'Tucson', state: 'AZ', lat: 32.1161, lon: -110.9410 },
  { code: 'ELP', name: 'El Paso International', city: 'El Paso', state: 'TX', lat: 31.8072, lon: -106.3778 },
  { code: 'OKC', name: 'Will Rogers World Airport', city: 'Oklahoma City', state: 'OK', lat: 35.3931, lon: -97.6007 },
  { code: 'TUL', name: 'Tulsa International', city: 'Tulsa', state: 'OK', lat: 36.1984, lon: -95.8881 },
  { code: 'OMA', name: 'Eppley Airfield', city: 'Omaha', state: 'NE', lat: 41.3032, lon: -95.8941 },
  { code: 'DSM', name: 'Des Moines International', city: 'Des Moines', state: 'IA', lat: 41.5340, lon: -93.6631 },
  { code: 'LIT', name: 'Bill and Hillary Clinton National', city: 'Little Rock', state: 'AR', lat: 34.7294, lon: -92.2243 },
  { code: 'SDF', name: 'Louisville Muhammad Ali International', city: 'Louisville', state: 'KY', lat: 38.1744, lon: -85.7364 },
  { code: 'BHM', name: 'Birmingham-Shuttlesworth International', city: 'Birmingham', state: 'AL', lat: 33.5629, lon: -86.7535 },
  { code: 'MOB', name: 'Mobile Regional Airport', city: 'Mobile', state: 'AL', lat: 30.6913, lon: -88.2428 },
  { code: 'MSY', name: 'Louis Armstrong New Orleans International', city: 'New Orleans', state: 'LA', lat: 29.9934, lon: -90.2580 },
  { code: 'BTR', name: 'Baton Rouge Metropolitan', city: 'Baton Rouge', state: 'LA', lat: 30.5332, lon: -91.1496 },
  { code: 'GSP', name: 'Greenville-Spartanburg International', city: 'Greenville', state: 'SC', lat: 34.8957, lon: -82.2189 },
  { code: 'CHS', name: 'Charleston International', city: 'Charleston', state: 'SC', lat: 32.8986, lon: -80.0405 },
  { code: 'SAV', name: 'Savannah/Hilton Head International', city: 'Savannah', state: 'GA', lat: 32.1276, lon: -81.2021 },
  { code: 'GRR', name: 'Gerald R. Ford International', city: 'Grand Rapids', state: 'MI', lat: 42.8808, lon: -85.5228 },
  { code: 'MBS', name: 'MBS International', city: 'Saginaw', state: 'MI', lat: 43.5329, lon: -84.0796 },
  { code: 'FNT', name: 'Bishop International', city: 'Flint', state: 'MI', lat: 42.9654, lon: -83.7436 },
  { code: 'BOI', name: 'Boise Airport', city: 'Boise', state: 'ID', lat: 43.5644, lon: -116.2228 },
  { code: 'GEG', name: 'Spokane International', city: 'Spokane', state: 'WA', lat: 47.6199, lon: -117.5339 },
  { code: 'ANC', name: 'Ted Stevens Anchorage International', city: 'Anchorage', state: 'AK', lat: 61.1744, lon: -149.9962 },
  { code: 'FAI', name: 'Fairbanks International', city: 'Fairbanks', state: 'AK', lat: 64.8151, lon: -147.8562 },
  { code: 'RNO', name: 'Reno-Tahoe International', city: 'Reno', state: 'NV', lat: 39.4991, lon: -119.7681 },
  { code: 'BUR', name: 'Hollywood Burbank Airport', city: 'Burbank', state: 'CA', lat: 34.2007, lon: -118.3585 },
  { code: 'ONT', name: 'Ontario International', city: 'Ontario', state: 'CA', lat: 34.0560, lon: -117.6012 },
  { code: 'SNA', name: 'John Wayne Airport', city: 'Santa Ana', state: 'CA', lat: 33.6757, lon: -117.8682 },
  { code: 'PSP', name: 'Palm Springs International', city: 'Palm Springs', state: 'CA', lat: 33.8297, lon: -116.5067 },
  { code: 'FAT', name: 'Fresno Yosemite International', city: 'Fresno', state: 'CA', lat: 36.7762, lon: -119.7181 },
  { code: 'OGG', name: 'Kahului Airport', city: 'Kahului', state: 'HI', lat: 20.8986, lon: -156.4305 },
  { code: 'LIH', name: 'Lihue Airport', city: 'Lihue', state: 'HI', lat: 21.9760, lon: -159.3389 }
];

// Generate additional regional airports
function generateRegionalAirports(count) {
  const airports = [...MAJOR_CITIES, ...REGIONAL_AIRPORTS];
  const usedCodes = new Set(airports.map(a => a.code));

  // Additional smaller airports to reach the target count
  const smallerCities = [
    { code: 'ICT', name: 'Wichita Dwight D. Eisenhower National', city: 'Wichita', state: 'KS', lat: 37.6499, lon: -97.4331 },
    { code: 'DAY', name: 'James M. Cox Dayton International', city: 'Dayton', state: 'OH', lat: 39.9024, lon: -84.2194 },
    { code: 'TYS', name: 'McGhee Tyson Airport', city: 'Knoxville', state: 'TN', lat: 35.8110, lon: -83.9940 },
    { code: 'LEX', name: 'Blue Grass Airport', city: 'Lexington', state: 'KY', lat: 38.0365, lon: -84.6059 },
    { code: 'COS', name: 'Colorado Springs Airport', city: 'Colorado Springs', state: 'CO', lat: 38.8058, lon: -104.7004 },
    { code: 'EUG', name: 'Eugene Airport', city: 'Eugene', state: 'OR', lat: 44.1246, lon: -123.2119 },
    { code: 'SBA', name: 'Santa Barbara Airport', city: 'Santa Barbara', state: 'CA', lat: 34.4262, lon: -119.8403 },
    { code: 'GJT', name: 'Grand Junction Regional', city: 'Grand Junction', state: 'CO', lat: 39.1223, lon: -108.5267 },
    { code: 'FCA', name: 'Glacier Park International', city: 'Kalispell', state: 'MT', lat: 48.3106, lon: -114.2559 },
    { code: 'BIL', name: 'Billings Logan International', city: 'Billings', state: 'MT', lat: 45.8077, lon: -108.5430 },
    { code: 'FSD', name: 'Sioux Falls Regional', city: 'Sioux Falls', state: 'SD', lat: 43.5820, lon: -96.7420 },
    { code: 'RAP', name: 'Rapid City Regional', city: 'Rapid City', state: 'SD', lat: 44.0453, lon: -103.0574 },
    { code: 'BZN', name: 'Bozeman Yellowstone International', city: 'Bozeman', state: 'MT', lat: 45.7775, lon: -111.1603 },
    { code: 'MSO', name: 'Missoula International', city: 'Missoula', state: 'MT', lat: 46.9163, lon: -114.0906 },
    { code: 'JAN', name: 'Jackson-Medgar Wiley Evers International', city: 'Jackson', state: 'MS', lat: 32.3112, lon: -90.0759 },
    { code: 'GPT', name: 'Gulfport-Biloxi International', city: 'Gulfport', state: 'MS', lat: 30.4073, lon: -89.0701 },
    { code: 'SHV', name: 'Shreveport Regional', city: 'Shreveport', state: 'LA', lat: 32.4466, lon: -93.8256 },
    { code: 'LFT', name: 'Lafayette Regional', city: 'Lafayette', state: 'LA', lat: 30.2053, lon: -91.9876 },
    { code: 'CAK', name: 'Akron-Canton Airport', city: 'Akron', state: 'OH', lat: 40.9161, lon: -81.4422 },
    { code: 'TOL', name: 'Toledo Express Airport', city: 'Toledo', state: 'OH', lat: 41.5868, lon: -83.8078 }
  ];

  airports.push(...smallerCities.filter(a => !usedCodes.has(a.code)));

  return airports.slice(0, count);
}

// Generate routes using preferential attachment (power-law distribution)
function generateRoutes(airports, targetRouteCount) {
  const routes = [];
  const airportConnections = new Map();

  airports.forEach(airport => {
    airportConnections.set(airport.code, 0);
  });

  // Identify hub airports
  const hubCodes = new Set(MAJOR_AIRLINES.flatMap(airline => airline.hubs));

  // Create hub-to-hub routes first (every hub connects to every other hub)
  const hubs = airports.filter(a => hubCodes.has(a.code));
  for (let i = 0; i < hubs.length; i++) {
    for (let j = i + 1; j < hubs.length; j++) {
      const airline = MAJOR_AIRLINES[Math.floor(Math.random() * MAJOR_AIRLINES.length)];
      routes.push({
        source: hubs[i].code,
        target: hubs[j].code,
        airline: airline.id,
        frequency: Math.floor(Math.random() * 20) + 10
      });
      airportConnections.set(hubs[i].code, airportConnections.get(hubs[i].code) + 1);
      airportConnections.set(hubs[j].code, airportConnections.get(hubs[j].code) + 1);
    }
  }

  // Generate remaining routes using preferential attachment
  const nonHubAirports = airports.filter(a => !hubCodes.has(a.code));

  // Create a Set for faster route existence checking
  const routeSet = new Set(routes.map(r => `${r.source}-${r.target}`));
  const maxAttempts = targetRouteCount * 3; // Prevent infinite loops
  let attempts = 0;

  while (routes.length < targetRouteCount && attempts < maxAttempts) {
    attempts++;

    // Pick a random non-hub airport as source
    const sourceAirport = nonHubAirports[Math.floor(Math.random() * nonHubAirports.length)];

    // Use preferential attachment: higher probability to connect to well-connected airports
    const totalConnections = Array.from(airportConnections.values()).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalConnections;
    let targetAirport = null;

    for (const [code, connections] of airportConnections.entries()) {
      random -= connections + 1; // +1 to give every airport a chance
      if (random <= 0) {
        targetAirport = airports.find(a => a.code === code);
        break;
      }
    }

    if (!targetAirport || sourceAirport.code === targetAirport.code) continue;

    // Check if route already exists (faster with Set)
    const routeKey1 = `${sourceAirport.code}-${targetAirport.code}`;
    const routeKey2 = `${targetAirport.code}-${sourceAirport.code}`;

    if (routeSet.has(routeKey1) || routeSet.has(routeKey2)) continue;

    // Assign airline (hubs prefer their home airline)
    let airline = MAJOR_AIRLINES[Math.floor(Math.random() * MAJOR_AIRLINES.length)];
    for (const a of MAJOR_AIRLINES) {
      if (a.hubs.includes(targetAirport.code)) {
        airline = a;
        break;
      }
    }

    const newRoute = {
      source: sourceAirport.code,
      target: targetAirport.code,
      airline: airline.id,
      frequency: Math.floor(Math.random() * 10) + 1
    };

    routes.push(newRoute);
    routeSet.add(routeKey1);

    airportConnections.set(sourceAirport.code, airportConnections.get(sourceAirport.code) + 1);
    airportConnections.set(targetAirport.code, airportConnections.get(targetAirport.code) + 1);
  }

  return routes;
}

export function generateNetworkData() {
  // Reduced to 120 airports and 1500 routes for much faster loading
  // Still maintains realistic network topology
  const airports = generateRegionalAirports(120);
  const routes = generateRoutes(airports, 1500);

  return {
    airports,
    routes,
    airlines: MAJOR_AIRLINES,
    country: 'USA',
    bounds: {
      minLat: 25.0,
      maxLat: 49.0,
      minLon: -125.0,
      maxLon: -66.0
    },
    center: [39.8283, -98.5795]
  };
}

export { MAJOR_AIRLINES };
