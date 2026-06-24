# PitchIQ — Product Roadmap

## ✅ Phase 1 — Core Platform (Complete)
- FastAPI backend on port 8002, React/Vite frontend on port 5176
- Statcast data via pybaseball (pitch-level, Baseball Savant)
- 7-tab pitcher dashboard: Overview, Movement, VAA, Tunneling, Command, Breakout, Regression
- Player search with autocomplete + MLB headshot photos
- Sortable leaderboard (361 pitchers, 2020–2024) from MLB Stats API
- Hover tooltips on all key stats (23 stat definitions)

### Metrics computed today
| Metric | Source | Notes |
|---|---|---|
| VAA | Statcast `vz0/vx0/vy0` | Graded −3.5° = Elite at top of zone |
| Spin Efficiency | `release_spin_rate + spin_axis` | Active spin % |
| Tunneling | Statcast pitch positions | Inches at 23 ft, numpy broadcast |
| Command miss | Plate location → inferred target | Median per pitch type |
| Stuff+ | Z-scores vs pitch-type league avg | 100 = average |
| PLV | VAA + Stuff+ + whiff + usage | 0–10 scale |
| Breakout Score | ERA vs xERA/FIP gap + K%/BB% | 0–100 |
| ERA Prediction | Ridge regression from peripherals | With luck decomposition |
| FIP | Computed from MLB Stats API peripherals | (13·HR + 3·(BB+HBP) − 2·K) / IP + C |

---

## 🔜 Phase 2 — Richer Stats & Live Data

### 2a. Real-time / current-season data
- **Today's pitching lines** — call MLB Stats API `/api/v1/schedule?sportId=1&date=TODAY` to surface live game results and pull fresh Statcast within hours of game completion
- **Rolling 30-day splits** — Statcast already has dates; add a `/dashboard/{id}/rolling` endpoint that returns 7/14/30-day windows and render a sparkline trend per metric
- **Season-to-date vs career splits** — compare current season to career averages; highlight regression candidates

### 2b. Pitch Arsenal Depth
- **Release point consistency** — std deviation of `release_pos_x` and `release_pos_z` per pitch type; tighter = harder to read tunneling
- **Extension** — `release_extension` from Statcast; higher extension = shorter perceived distance, correlates with velocity perception
- **Pitch tempo** — time between pitches (Statcast `game_date + at_bat_number + pitch_number`); fast-working pitchers fatigue hitters
- **Plate discipline splits** — chase rate (O-Swing%), zone contact (Z-Contact%), swing% by zone quadrant
- **Horizontal break differential** — how much a fastball and changeup differ in HB; >6" = elite deception

### 2c. Platoon & Situational Splits
- **vs LHB / vs RHB** — VAA, whiff%, xBA, usage% split by batter hand
- **Count splits** — 0-0, ahead, behind, 2-strike whiff% breakdowns
- **RISP splits** — K%, BB%, xBA with runners in scoring position
- **Leverage index** — weight performance by game situation (high leverage vs garbage time)

### 2d. Advanced Predictive Models
- **xFIP** — normalize HR rate to league avg FB% (HR/FB ~10.5%); already have K, BB, IP from API
- **SIERA** — Skill-Interactive ERA; adds GB/FB splits to FIP; need ground ball data from Statcast `bb_type`
- **Pitch value (pv/100)** — run value per 100 pitches vs league average by pitch type; Baseball Savant provides `delta_run_exp` per pitch
- **Whiff curve** — model whiff% as a function of velocity × spin × VAA to predict future swing-and-miss without needing results
- **Injury risk flags** — velocity drop >1.5 mph vs prior 30 days, significant spin rate decline; surface warning on dashboard

### 2e. Comparative & Comps
- **Pitch type comps** — for each pitch, find the 5 most similar pitches in the league (same year) by velocity + movement + VAA using cosine similarity
- **Pitcher archetype clustering** — k-means on Stuff+ components + usage distribution → label archetypes (Power Starter, Crafty Lefty, Elite Closer, etc.)
- **Historical comparisons** — compare current Stuff+ profile to all seasons 2015–2024; surface the "most similar historical season"

---

## 🔜 Phase 3 — UX & Depth

### 3a. Dashboard Improvements
- **Pitch movement GIF** — animate pitch trajectory from release to plate using Statcast 3D coordinates (`x0, y0, z0, vx0, vy0, vz0, ax, ay, az`) using Three.js or Canvas
- **Zone heatmaps** — called strike probability, xBA, whiff% by plate zone; 5×5 grid overlaid on strike zone SVG
- **Season comparison overlay** — plot two seasons side-by-side on any metric; useful for breakout/regression analysis
- **Print/export** — PDF scouting report of the dashboard overview tab

### 3b. Leaderboard Expansions
- **Add K%, BB%, BABIP color coding** — green/red relative to league average (not just ERA)
- **Stuff+ leaderboard column** — compute Stuff+ from Statcast for top-100 pitchers and surface on leaderboard
- **Custom column builder** — let user pick which stats show on the leaderboard table
- **Leaderboard → dashboard** — clicking a row already navigates; ensure all leaderboard pitchers resolve correctly on the dashboard (may need to fetch Statcast ID from mlbam_id)

### 3c. Search & Discovery
- **"Find similar pitchers"** — from any dashboard, one click to show 5 most comps
- **Breakout watchlist** — leaderboard filter: Breakout Score > 70, ERA > FIP (ERA likely to drop), show as a "hot" badge
- **Team filter** — filter leaderboard by team
- **Position toggle** — SP only / RP only on leaderboard (already partially done; refine GS threshold)

---

## 🔜 Phase 4 — Data Infrastructure

### 4a. Persistent caching / DB
- Currently: `lru_cache` in memory (lost on restart) + pybaseball disk cache
- Add a **SQLite or PostgreSQL store** for Statcast season aggregates so first page load doesn't take 30 seconds
- Background task on startup: pre-warm top-50 pitchers (by IP) for current season

### 4b. Live Statcast ingestion
- Baseball Savant updates Statcast data same-day after games complete (~2–4 AM ET)
- Add a **nightly cron** (`/api/jobs/refresh`) to pull any game from the last 48 hours and upsert into the DB

### 4c. Authentication & Watchlists
- User accounts → save favorite pitchers, custom watchlists, breakout alerts
- Simple email/magic-link auth

---

## Data Sources Reference
| Source | Access method | What it provides |
|---|---|---|
| Baseball Savant | `pybaseball.statcast_pitcher()` | Pitch-level Statcast (VAA, spin, movement, location) |
| MLB Stats API | `requests` (free, no key) | Season totals: ERA, WHIP, K, BB, IP, HR, G, GS |
| Baseball Reference | `pybaseball.pitching_stats_bref()` | Traditional stats — currently broken in pybaseball |
| FanGraphs | `pybaseball.pitching_stats()` | **Blocked (403)** — need API key or alternative |
| MLB CDN | `img.mlbstatic.com` headshots | Player headshot photos by mlbam_id |
