// Real-world airport statistics and airline hub information

// Annual passenger data (in millions, 2023 estimates)
export const PASSENGER_DATA = {
  'ATL': { annual: 93.7, daily: 256700, peak: 'Jul-Aug', mainAirlines: ['DL'] },
  'ORD': { annual: 73.9, daily: 202500, peak: 'Jun-Aug', mainAirlines: ['UA', 'AA'] },
  'LAX': { annual: 75.0, daily: 205500, peak: 'Jul-Aug', mainAirlines: ['AA', 'DL', 'UA'] },
  'DFW': { annual: 73.4, daily: 201100, peak: 'Jun-Aug', mainAirlines: ['AA'] },
  'DEN': { annual: 69.3, daily: 189900, peak: 'Jun-Aug', mainAirlines: ['UA', 'F9'] },
  'JFK': { annual: 55.2, daily: 151200, peak: 'Jul-Aug', mainAirlines: ['B6', 'DL', 'AA'] },
  'SFO': { annual: 51.1, daily: 140000, peak: 'Jun-Aug', mainAirlines: ['UA'] },
  'LAS': { annual: 57.6, daily: 157800, peak: 'Mar-Apr', mainAirlines: ['WN', 'F9', 'NK'] },
  'SEA': { annual: 51.8, daily: 141900, peak: 'Jul-Aug', mainAirlines: ['AS'] },
  'CLT': { annual: 50.2, daily: 137500, peak: 'Jun-Aug', mainAirlines: ['AA'] },
  'MCO': { annual: 50.6, daily: 138600, peak: 'Dec-Jan', mainAirlines: ['WN', 'B6'] },
  'MIA': { annual: 44.3, daily: 121400, peak: 'Jan-Mar', mainAirlines: ['AA'] },
  'PHX': { annual: 44.8, daily: 122700, peak: 'Mar-Apr', mainAirlines: ['WN', 'AA'] },
  'IAH': { annual: 44.1, daily: 120800, peak: 'Jun-Aug', mainAirlines: ['UA'] },
  'BOS': { annual: 38.9, daily: 106600, peak: 'Jul-Aug', mainAirlines: ['B6', 'DL'] },
  'MSP': { annual: 35.4, daily: 97000, peak: 'Jun-Aug', mainAirlines: ['DL', 'SY'] },
  'DTW': { annual: 34.2, daily: 93700, peak: 'Jun-Aug', mainAirlines: ['DL'] },
  'FLL': { annual: 32.5, daily: 89000, peak: 'Jan-Mar', mainAirlines: ['B6', 'NK'] },
  'SLC': { annual: 26.8, daily: 73400, peak: 'Jun-Aug', mainAirlines: ['DL'] },
  'EWR': { annual: 43.4, daily: 118900, peak: 'Jul-Aug', mainAirlines: ['UA'] },
  'PHL': { annual: 28.1, daily: 77000, peak: 'Jul-Aug', mainAirlines: ['AA'] },
  'LGA': { annual: 29.5, daily: 80800, peak: 'Jul-Aug', mainAirlines: ['AA', 'DL'] },
  'BWI': { annual: 24.2, daily: 66300, peak: 'Jun-Aug', mainAirlines: ['WN'] },
  'DCA': { annual: 23.5, daily: 64400, peak: 'Apr-May', mainAirlines: ['AA', 'DL'] },
  'IAD': { annual: 23.8, daily: 65200, peak: 'Jun-Aug', mainAirlines: ['UA'] },
  'SAN': { annual: 24.2, daily: 66300, peak: 'Jul-Aug', mainAirlines: ['WN'] },
  'TPA': { annual: 21.7, daily: 59500, peak: 'Jan-Mar' },
  'DAL': { annual: 16.2, daily: 44400, peak: 'Jun-Aug', mainAirlines: ['WN'] },
  'PDX': { annual: 19.0, daily: 52100, peak: 'Jul-Aug', mainAirlines: ['AS'] },
  'STL': { annual: 15.8, daily: 43300, peak: 'Jun-Aug' },
  'HNL': { annual: 17.8, daily: 48800, peak: 'Jul-Aug' },
  'MDW': { annual: 13.5, daily: 37000, peak: 'Jun-Aug', mainAirlines: ['WN'] },
  'BNA': { annual: 17.6, daily: 48200, peak: 'Jun-Aug' },
  'AUS': { annual: 17.7, daily: 48500, peak: 'Mar-Apr' },
  'MCI': { annual: 11.6, daily: 31800, peak: 'Jun-Aug' },
  'MSY': { annual: 13.1, daily: 35900, peak: 'Feb-Mar' },
  'RDU': { annual: 14.3, daily: 39200, peak: 'Jun-Aug' },
  'SJC': { annual: 13.4, daily: 36700, peak: 'Jul-Aug' },
  'SAT': { annual: 10.4, daily: 28500, peak: 'Jun-Aug' },
  'SMF': { annual: 11.3, daily: 31000, peak: 'Jul-Aug' },
  'RSW': { annual: 10.3, daily: 28200, peak: 'Jan-Mar' },
  'PIT': { annual: 9.4, daily: 25800, peak: 'Jun-Aug' },
  'CVG': { annual: 9.2, daily: 25200, peak: 'Jun-Aug', mainAirlines: ['DL'] },
  'IND': { annual: 9.4, daily: 25800, peak: 'Jun-Aug' },
  'CMH': { annual: 8.2, daily: 22500, peak: 'Jun-Aug' },
  'OAK': { annual: 11.2, daily: 30700, peak: 'Jul-Aug' },
  'SJU': { annual: 9.1, daily: 24900, peak: 'Dec-Mar', mainAirlines: ['B6'] },
  'CLE': { annual: 9.0, daily: 24700, peak: 'Jun-Aug' },
  'MKE': { annual: 7.0, daily: 19200, peak: 'Jun-Aug' },
  'SNA': { annual: 10.7, daily: 29300, peak: 'Jul-Aug' },
  'BDL': { annual: 6.6, daily: 18100, peak: 'Jul-Aug' },
  'PBI': { annual: 6.8, daily: 18600, peak: 'Jan-Mar' },
  'BUF': { annual: 5.5, daily: 15100, peak: 'Jul-Aug' },
  'JAX': { annual: 6.7, daily: 18400, peak: 'Jun-Aug' },
  'ONT': { annual: 5.9, daily: 16200, peak: 'Jul-Aug' },
  'BUR': { annual: 5.9, daily: 16200, peak: 'Jul-Aug' },
  'RNO': { annual: 4.0, daily: 11000, peak: 'Jul-Aug' },
  'ANC': { annual: 5.4, daily: 14800, peak: 'Jun-Aug', mainAirlines: ['AS'] },
  'BOI': { annual: 4.0, daily: 11000, peak: 'Jun-Aug' },
  'TUS': { annual: 4.0, daily: 11000, peak: 'Jan-Mar' },
  'ABQ': { annual: 5.5, daily: 15100, peak: 'Jun-Aug' },
  'OMA': { annual: 4.6, daily: 12600, peak: 'Jun-Aug' },
  'ELP': { annual: 3.5, daily: 9600, peak: 'Jun-Aug' },
  'OKC': { annual: 4.1, daily: 11200, peak: 'Jun-Aug' },
  'TUL': { annual: 3.3, daily: 9000, peak: 'Jun-Aug' },
  'DSM': { annual: 2.8, daily: 7700, peak: 'Jun-Aug' },
  'LIT': { annual: 2.3, daily: 6300, peak: 'Jun-Aug' },
  'BHM': { annual: 3.1, daily: 8500, peak: 'Jun-Aug' },
  'GRR': { annual: 3.2, daily: 8800, peak: 'Jun-Aug' },
  'BTR': { annual: 1.1, daily: 3000, peak: 'Jun-Aug' },
  'SYR': { annual: 2.5, daily: 6800, peak: 'Jul-Aug' },
  'ROC': { annual: 2.6, daily: 7100, peak: 'Jul-Aug' },
  'ALB': { annual: 2.9, daily: 7900, peak: 'Jul-Aug' },
  'RIC': { annual: 3.9, daily: 10700, peak: 'Jun-Aug' },
  'GSP': { annual: 2.4, daily: 6600, peak: 'Jun-Aug' },
  'CHS': { annual: 4.5, daily: 12300, peak: 'Jun-Aug' },
  'GSO': { annual: 2.0, daily: 5500, peak: 'Jun-Aug' },
  'DAY': { annual: 1.8, daily: 4900, peak: 'Jun-Aug' },
  'CAK': { annual: 1.3, daily: 3600, peak: 'Jun-Aug' }
};

// Airline information with logo URLs from Wikimedia Commons (free, reliable CDN)
export const AIRLINES = {
  'AA': {
    name: 'American Airlines',
    logoUrl: 'https://logos-world.net/wp-content/uploads/2020/03/American-Airlines-Logo.png',
    color: '#0078D2',
    fullName: 'American Airlines'
  },
  'DL': {
    name: 'Delta Air Lines',
    logoUrl: 'https://logos-world.net/wp-content/uploads/2020/03/Delta-Air-Lines-Logo.png',
    color: '#C8102E',
    fullName: 'Delta Air Lines'
  },
  'UA': {
    name: 'United Airlines',
    logoUrl: 'https://logos-world.net/wp-content/uploads/2020/03/United-Airlines-Logo.png',
    color: '#0A3055',
    fullName: 'United Airlines'
  },
  'WN': {
    name: 'Southwest Airlines',
    logoUrl: 'https://logos-world.net/wp-content/uploads/2023/01/Southwest-Airlines-Logo.png',
    color: '#FFB612',
    fullName: 'Southwest Airlines'
  },
  'AS': {
    name: 'Alaska Airlines',
    logoUrl: 'https://logos-world.net/wp-content/uploads/2023/01/Alaska-Airlines-Logo.png',
    color: '#01426A',
    fullName: 'Alaska Airlines'
  },
  'B6': {
    name: 'JetBlue Airways',
    logoUrl: 'https://logos-world.net/wp-content/uploads/2023/01/JetBlue-Logo.png',
    color: '#0A3055',
    fullName: 'JetBlue Airways'
  },
  'NK': {
    name: 'Spirit Airlines',
    logoUrl: 'https://logos-world.net/wp-content/uploads/2023/01/Spirit-Airlines-Logo.png',
    color: '#FFE900',
    fullName: 'Spirit Airlines'
  },
  'F9': {
    name: 'Frontier Airlines',
    logoUrl: 'https://logos-world.net/wp-content/uploads/2020/03/Frontier-Airlines-Logo.png',
    color: '#00A651',
    fullName: 'Frontier Airlines'
  },
  'G4': {
    name: 'Allegiant Air',
    logoUrl: 'https://logos-world.net/wp-content/uploads/2023/01/Allegiant-Air-Logo.png',
    color: '#0B2D6D',
    fullName: 'Allegiant Air'
  },
  'SY': {
    name: 'Sun Country',
    logoUrl: 'https://logos-world.net/wp-content/uploads/2023/01/Sun-Country-Airlines-Logo.png',
    color: '#FFD100',
    fullName: 'Sun Country Airlines'
  }
};

// Get busyness level based on annual passengers
export function getBusynessLevel(annualPassengers) {
  if (annualPassengers > 60) return { level: 'Very High', color: '#ff4444', intensity: 95 };
  if (annualPassengers > 40) return { level: 'High', color: '#ff8844', intensity: 75 };
  if (annualPassengers > 20) return { level: 'Moderate', color: '#ffb020', intensity: 55 };
  if (annualPassengers > 10) return { level: 'Medium', color: '#ffd54f', intensity: 40 };
  if (annualPassengers > 5) return { level: 'Low-Medium', color: '#81c784', intensity: 25 };
  return { level: 'Low', color: '#4caf50', intensity: 10 };
}

// Get time period description
export function getTimePeriodDescription(peak) {
  const periods = {
    'Jan-Mar': 'Winter/Spring (Jan-Mar) - Peak for warm destinations',
    'Feb-Mar': 'Late Winter (Feb-Mar) - Mardi Gras season peak',
    'Mar-Apr': 'Spring (Mar-Apr) - Spring break season',
    'Apr-May': 'Late Spring (Apr-May) - Business travel peak',
    'Jun-Aug': 'Summer (Jun-Aug) - Family vacation season',
    'Jul-Aug': 'Peak Summer (Jul-Aug) - Highest travel volume',
    'Dec-Jan': 'Winter Holidays (Dec-Jan) - Holiday travel peak'
  };
  return periods[peak] || peak;
}

// Calculate hourly traffic estimate
export function getHourlyStats(dailyPassengers) {
  return {
    averagePerHour: Math.round(dailyPassengers / 24),
    peakHourEstimate: Math.round(dailyPassengers / 24 * 1.5), // Peak hours are ~50% higher
    quietHourEstimate: Math.round(dailyPassengers / 24 * 0.4) // Off-peak is ~60% lower
  };
}
