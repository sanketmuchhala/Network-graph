# US Airport Network Visualization

An interactive visualization of the **US domestic airport network** inspired by Veritasium's video on network theory and the small world problem. This application demonstrates key concepts like degrees of separation, clustering coefficients, preferential attachment, and network vulnerability through real US airport connections.

**Note**: This visualization uses real US airport codes, names, and accurate geographic coordinates for authenticity. All airports shown are located within the United States and its territories (including Alaska, Hawaii, Puerto Rico, Guam, etc.).

## Key Features

### Interactive Network Map
- **Real US airports with accurate coordinates** - Milwaukee is in Milwaukee, Indianapolis in Indianapolis!
- Interactive Leaflet map with zoom, pan, and satellite view
- **120+ real US airports** with verified IATA codes and locations
- **Dark mode map** - actual dark backgrounds for better nighttime viewing
- Click any airport to see all its connections in a beautiful sidebar

### Airport Click Interaction
- **Click any airport** to open a detailed sidebar panel
- View **connectivity score** based on direct connections
- See **complete list of connected airports** with airline information
- Routes highlight on map when airport is selected
- Smooth animations and modern design

### Shortest Path Finder
- **Moved to top** of sidebar for primary accessibility
- Find routes between any two US airports
- Autocomplete search with city names
- Visual path highlighting on the map

### Network Statistics
- **Average Degrees of Separation**: How many flights to reach any airport
- **Top 10 Major Hubs**: Ranked by connectivity
- Real-time graph algorithm calculations

### Airline Filtering
- Filter by 10 major US airlines (American, Delta, United, Southwest, etc.)
- Visualize airline-specific hub structures
- Color-coded routes by airline

### Hub Disruption Simulator
- Simulate major hub failures (weather, technical issues)
- See cascading effects on network connectivity
- Compare before/after metrics
- Demonstrates real network vulnerability

### Educational Content
- **Beautifully styled info modals** with hover effects
- Modern card-based design with smooth animations
- Explains network theory concepts:
  - Small world phenomenon
  - Preferential attachment (why hubs form)
  - Clustering coefficient interpretation
- Inspired by Veritasium's educational approach

## Design Philosophy

Clean, modern Apple-inspired design:
- **Dark & Light modes** with optimized color palettes
- Dark mode: Cyan nodes, orange highlights on dark charcoal backgrounds
- Light mode: Deep blue nodes, red highlights on light gray backgrounds
- Smooth transitions and micro-interactions
- Gradient backgrounds and subtle shadows
- Modern typography (-apple-system, SF Pro Display)
- Fully responsive layout

## Technology Stack

- **React 18** - Modern UI with hooks and state management
- **Leaflet** - Interactive maps with dark mode tiles
- **Custom Graph Algorithms**:
  - Breadth-First Search (BFS) for shortest paths
  - All-pairs shortest path calculation
  - Degree centrality computation
  - Clustering coefficient analysis
  - Network disruption simulation
- **CSS3** - Advanced animations and transitions

## Installation & Running

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The application will open at `http://localhost:5173` (Vite default)

## How to Use

1. **Explore the Network**: Pan and zoom the map to explore US airports
2. **Click an Airport**: See all its connections in the beautiful sidebar
3. **Find a Path**: Use the top panel to find routes between any two airports
4. **Filter by Airline**: Click airline buttons to see specific networks
5. **Simulate Disruption**: Select a hub and see what happens when it fails
6. **Learn More**: Click "What does this mean?" to understand the concepts

## Project Structure

```
/src
  /components
    NetworkMap.jsx       - Leaflet map with airport markers and routes
    NetworkCanvas.jsx    - Alternative canvas renderer
    StatsPanel.jsx       - Network statistics and metrics
    PathFinder.jsx       - Shortest path search interface
    ControlPanel.jsx     - Airline filters
    HubDisruptor.jsx     - Hub simulation tool
    InfoModal.jsx        - Educational modals
  /utils
    dataGenerator.js     - US airport data with real coordinates
    graphAlgorithms.js   - BFS, centrality, clustering algorithms
  App.jsx               - Main application with sidebar logic
  App.css               - All styling with dark/light themes
```

## Network Generation

The application uses **real US airport data**:
- 120+ airports with actual IATA codes (ATL, ORD, LAX, etc.)
- Accurate latitude/longitude coordinates
- Real city and state names
- Routes generated using preferential attachment algorithm
- 10 major US airlines with realistic hub structures

**Key Real Airports Included**:
- ATL (Atlanta), ORD (Chicago), LAX (Los Angeles)
- DFW (Dallas), DEN (Denver), JFK (New York)
- MKE (Milwaukee), IND (Indianapolis), CLE (Cleveland)
- ANC (Anchorage), HNL (Honolulu), and many more!

## Key Insights Demonstrated

This visualization shows:
- **Small World Networks**: The entire US is connected in ~2-3 flights on average
- **Preferential Attachment**: Major hubs emerged because new routes connect to already well-connected airports
- **Network Vulnerability**: Removing a single hub (like ATL or ORD) significantly increases path lengths
- **Hub-and-Spoke Efficiency**: Airlines use hubs to maximize connectivity with fewer routes
- **Geographic Clustering**: Regional networks form around major metro areas

## Educational Value

Perfect for teaching:
- Graph theory and network science
- Small world phenomenon (Kevin Bacon game, six degrees of separation)
- Preferential attachment and power-law distributions
- Network vulnerability and resilience
- Real-world applications of algorithms

## Future Enhancements

Potential additions:
- Real airport data (DONE!)
- Airport click interaction with sidebar (DONE!)
- Dark mode map backgrounds (DONE!)
- Enhanced modal styling (DONE!)
- Real flight frequency data
- Historical route evolution
- International connections (to Canada, Mexico)
- 3D globe view

## Credits

- Inspired by [Veritasium's video on Network Theory](https://www.youtube.com/watch?v=CYlon2tvywA)
- Airport data verified against real IATA codes and coordinates
- Built with React, Leaflet, and modern web technologies
- Design inspired by Apple's minimalist aesthetic

## License

MIT License - Feel free to use this for educational purposes!

---

**Note**: All airport locations are now accurate! Milwaukee International Airport (MKE) is in Milwaukee, WI and Indianapolis International Airport (IND) is in Indianapolis, IN. No more geographic errors!
