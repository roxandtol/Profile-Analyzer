# SDVX Volforce Planner & Profile Analyzer ⚡

A pair programming tool built on the [Kamaitachi API](https://github.com/zkldi/Tachi/tree/main/docs) to analyze your **SOUND VOLTEX (SDVX)** plays and generate an optimal, step-by-step roadmap to reach any target **VOLFORCE (VF)**.

---

## Key Features

1. **Exact Volforce Calculation Engine (VF6 & VF7)**:
   - **VF7 (SDVX Nabla / Konaste)**: Uses internal decimal `levelNum` (e.g. 18.2, 18.4, 18.7, 18.9) directly in the mathematical formula and incorporates the buffed Ultimate Chain multiplier (106).
   - **VF6 (SDVX6 Exceed Gear)**: Uses floored integer levels and standard multipliers.
   - Calculates Profile Volforce as the exact sum of your **top 50** plays.
   - Identifies the **#50 Cutoff Floor ($VF_{50}$)**: the minimum threshold that any new play or upscore must eclipse to yield a net increase in profile VF.

2. **Smart Upscore Opportunity Finder ("Low-Hanging Fruit")**:
   - **Near S (9.85m – 9.899m)**: Captures the huge $+3\%$ grade coefficient jump from AAA+ (102) to S (105).
   - **Near AAA+ (9.75m – 9.799m)**: Captures the grade jump from AAA (100) to AAA+ (102).
   - **Lamp Upgrades**: Identifies S-ranks with Normal Clear where an Excessive Clear (Hard Clear) gives an immediate $+2\%$ multiplier without needing a higher score.
   - **Rank 51–100 Queue Pushers**: Finds charts just outside your top 50 ready to displace low-value entries.

3. **Farmable Chart Recommendation Engine ("The Hit List")**:
   - Evaluates Kamaitachi's community tier ratings (`sTier` T7–T10, `clearTier`, and `!individualDifference`).
   - **In VF7 Mode**: Prioritizes **actual Net VF gain driven by decimal `levelNum`** first (since $levelNum$ directly multiplies into the formula), using community tiers secondarily as an accessibility/effort check (filtering out gimmick charts and prioritizing high-decimal charts with reasonable tiers).
   - **In VF6 Mode**: Prioritizes **community S-tier ease (T8–T10)** first (since all charts of the same level share identical floored VF yield).

4. **Interactive Roadmap & Sandbox**:
   - Sequenced step-by-step roadmap with running profile VF and progress bar.
   - Check off goals as you complete them in the arcade to see your live simulated VF advance.
   - Exclude charts you dislike or adjust target score simulations.

5. **Arcade Session Export**:
   - Export your action plan to a **Markdown checklist** or **mobile/Discord-friendly plain text** to take to the arcade.

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation
```bash
npm install
```

### Running the Web Dashboard
**On Windows**:
Simply double-click [`start_webserver.bat`](file:///c:/Users/rodri/cosos_github/Profile-Analyzer/start_webserver.bat) (or `start.bat`). It will verify Node.js, install dependencies if missing, launch Vite, and automatically open your default browser.

Or via terminal:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Running the CLI Tool
You can also run the planner directly in your terminal:
```bash
# Analyze user zkldi targeting 16.5 VF in VF7 mode
npm run cli -- --user zkldi --target 16.5 --version vf7

# Analyze in VF6 mode
npm run cli -- --user zkldi --target 16.5 --version vf6

# Specific levels (e.g. 17, 18)
npm run cli -- --user zkldi --target 17.0 --levels 17,18
```

### Running Unit Tests
```bash
npm test
```

---

## Technical Details

- **Framework**: React 18 + Vite + TypeScript + Tailwind CSS
- **Icons**: Lucide React
- **API**: Public Kamaitachi API (`https://kamai.tachi.ac/api/v1`) with full public CORS support and browser caching.
- **Rating Algorithms**: Tested against `rg-stats` and live Kamaitachi API score returns.
