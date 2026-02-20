# Phase 2 Implementation Plan: HubStream

Evolving the theoretical US Airport Network Visualization into **HubStream**, a real-world Delay Propagation Analysis tool.

## 1. Executive Summary & Goal
The objective of Phase 2 is to move away from theoretical network rendering and build a practical, operational insight tool. Rather than random or static data, the application will highlight **delay propagation across the U.S. network** over a 24-hour period. We will rebrand to **HubStream**, ingest live data via Supabase and Aviationstack, and visualize cascading delays using straight-node connections for maximal clarity.

## 2. Research Findings & Strategic Decisions
1. **API Selection**: **Aviationstack** will serve as the primary API because it provides clear pricing, commercial licensing, historical windows, and delay status data. (OpenSky will be optionally preserved for "deep dive" visual tracks but is not the primary database engine).
2. **Primary Use Case**: **Delay Propagation Analysis**. This maps cleanly to available data (actual vs expected gate timestamps) and directly extends our previous "hub vulnerability" modeling into real life.
3. **Map Rendering**: **Straight node connections**. Maintaining a straight-line topology communicates delay flow clearly without overwhelming the UI or API limits with heavy coordinate trails.
4. **Data Infrastructure**: **Supabase** will be used as a robust PostgreSQL backend for ingesting events via Edge Functions / `pg_cron`, maintaining an immutable event table, and broadcasting realtime UX updates.
5. **Rebranding**: The project will be renamed to **HubStream**.

---

## 3. Detailed Proposed Changes

### 3.1 Initialization and Rebranding
* **`package.json`**:
  * Change project name from `us-airport-network-viz` to `hubstream`.
  * Update descriptions and metadata.
* **`readme.md`**:
  * Complete rewrite to shift documentation from previous "Network Visualization" project to "HubStream: Delay Propagation Analyzer".
  * Update tech stack (add Supabase).
* **`index.html`**:
  * Update `<title>` to HubStream and add appropriate metadata.
* **Component Files in `src/components/`**:
  * Rename references from "US Airport Network Visualization" to "HubStream" across Sidebar, App title bars, InfoModals, etc.

### 3.2 Supabase Database & Edge Functions Layer
* **`supabase/schema.sql`** (New):
  * Draft Supabase schema containing:
    * `flight_events` (immutable records for flight state changes and delays).
    * Derived materialized views representing the *current* real-time delay state for the country.
    * Row Level Security (RLS) policies allowing public read of delay views.
* **`supabase/functions/ingest_aviationstack/index.ts`** (New):
  * Set up Deno Edge Function using `pg_cron` to ping Aviationstack every 5 or 10 minutes.
  * Parse delays and insert records into `flight_events`.

### 3.3 Frontend Map & Data Integration
* **`src/App.jsx`**:
  * Connect to Supabase using `@supabase/supabase-js`.
  * Listen for `Postgres Changes` to trigger real-time UI updates without browser polling.
* **`src/components/NetworkMap.jsx`**:
  * Refactor map edges to color-code connections based on live delay propagation thresholds instead of static network theory clusters.
  * Add optional deep dive overlay where clicking a hub reveals 1-3 live tracks (if using OpenSky supplementary).

---

## 4. Verification & Testing Plan
1. **Automated Tests**:
   - Write unit tests for the ingestion Deno Edge functions to ensure we safely handle rate limits and structural changes in the Aviationstack response.
   - Run `npm run build` to verify frontend still bundles correctly without errors after major refactoring.
2. **Manual Verification**:
   - Serve the app locally (`npm run dev`), click through the hubs, and manually verify the application state updates correctly when a mock "delay" row is added to the Supabase database.
   - Verify all HubStream branding reflects properly in both dark and light modes.
