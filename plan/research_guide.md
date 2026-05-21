# Phase 2: Real-World Flight Data Research Guide

To evolve this project from a theoretical network visualization into a meaningful flight data application that "helps for real", we need to make some key architectural and product decisions. 

Please perform deep research on the following areas. Once you have the answers, provide them to me and we will write the formal Phase 2 plan.

## 1. Flight Data API Selection
We need a reliable source for real-world flight data. Please research and select the best API for our needs. Consider pricing (free tiers), rate limits, and data quality.
* **Aviationstack**: Good REST API for scheduled flights, real-time status, and historical data.
* **OpenSky Network**: Excellent for live ADS-B data (live plane tracking) and is free for community/educational use.
* **FlightAware / Flightradar24**: Industry standards, but check their developer pricing.
* **Cirium / Amadeus**: Very comprehensive, often used for commercial routing and delays.

**Your Task:** Which API should we use for Phase 2 based on your research?

## 2. Defining the Core "Real-World" Use Case
How will this app help people or businesses? Choose a primary use case to focus on:
* **Passenger Route Recovery:** When a major hub (e.g., ORD or ATL) goes down due to weather, find the most efficient alternative multi-leg routes for stranded passengers.
* **Delay Propagation Analysis:** Visualizing how a delay in one part of the country cascades through the network over the next 24 hours.
* **Environmental Impact / Carbon Routing:** Calculating and optimizing the carbon footprint of different network routes.
* **Live Fleet Tracking:** For aviation enthusiasts to track specific aircraft types or airline fleets in real-time.

**Your Task:** What is our primary use case?

## 3. Flight Path vs. Node Connection Data
Currently, we draw straight lines between airports. 
* Do we want to keep drawing straight lines (node-to-node topology)?
* OR do we want to plot actual flight paths (using waypoints and ADS-B coordinate trails)? 
*(Note: plotting actual flight paths is more visually impressive but requires significantly more data and rendering power).*

**Your Task:** Should we use straight lines or real coordinate paths?

---

# Project Name Suggestions

To reflect the transition from a "Network-graph" visualization to a real-world tool, here are some name suggestions:

1. **AeroGraph Analytics** (Maintains the graph theory roots)
2. **SkyRoute Intelligence** (Focuses on paths and routing)
3. **PulseAero** (Suggests live, real-time tracking)
4. **HubStream** (Focuses on the flow through major hubs)
5. **AviatorInsights** (Professional, analytics-focused name)
6. **FlightNode** (Technical, developer-focused)
7. **FlighTopology** (A play on topology/networks and flights)

---
**Next Step:** Complete this research, let me know your choices, and pick a new name. Then we will write the detailed Phase 2 implementation plan together!
