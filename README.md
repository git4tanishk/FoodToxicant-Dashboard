# Food Toxicants Research Dashboard

A fully client-side research literature dashboard for food toxicants, contaminants, and safety data.

## 📂 File Structure

```
dashboard/
├── index.html      — Main dashboard page
├── styles.css      — All styling (dark theme, DM Sans + Syne + JetBrains Mono)
├── app.js          — Dashboard logic, filtering, charts
├── data.js         — Compressed research records + metadata arrays
├── dataset.json    — First 500 records in readable JSON (preview)
└── README.md       — This file
```

## 🚀 How to Run

Just open `index.html` in any modern browser. No server, no install needed.

```
double-click index.html  →  works immediately
```

Or serve locally:
```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## 🆕 What's New (v2)

### Features Added
- **Select All / Toggle All** — Every filter section now has an "All" button to select or deselect all values at once. Works with search — only selects visible/filtered pills.
- **Sidebar Toggle** — Hamburger button in header collapses/expands the sidebar with a smooth animation. More screen space for results.
- **Keyboard Shortcuts** — `S` to toggle sidebar, `/` to focus search, `Esc` to close modal.
- **Per-page Selector** — Choose 20 / 30 / 50 / 100 rows per page from the results toolbar.
- **Clickable Year Column Header** — Click "Year" in table header to cycle sort: Newest → Oldest → Title A–Z.
- **Active Filter Count Badge** — Shows the total number of active filters in the sidebar header at a glance.
- **GitHub Button** — Links to https://github.com/git4tanishk in the header.
- **Toast Notifications** — Non-blocking feedback when you select all, clear filters, or export CSV.
- **Clear All button in active chips** — One-click clear all from the active filters bar.
- **Rounded bar chart bars** — Subtle border-radius on bar charts for a polished look.
- **Export filename includes count** — e.g. `food_toxicants_342_papers.csv`
- **Improved fonts** — Syne (headings), DM Sans (body), JetBrains Mono (numbers/badges/year).
- **Chart layout fix** — Removed hardcoded `.wide` nth-child overrides; cleaner 3-column grid.
- **Modal animation** — Smooth fade + slide-up when opening paper detail modal.

### Bugs Fixed
- **Null-safety on title/abstract** — `.toLowerCase()` on null strings no longer crashes the filter.
- **`btoa` encoding crash** — btoa now wraps with try/catch; special characters in titles no longer break row click.
- **escHtml in overview text** — Top toxicant/health effect strings are now properly escaped in the overview paragraph.
- **Sort icon sync on load** — Year column icon now stays in sync with the sort dropdown on first load.

## 🔍 Filter System

All filters work in **AND logic** — selecting multiple values narrows results.

| Filter | Controls |
|--------|----------|
| Category | Multi-select pills + **Select All** |
| Toxicant | Multi-select pills + search + **Select All** |
| Organ / System | Multi-select pills + **Select All** |
| Health Effect | Multi-select pills + **Select All** |
| Food Product | Multi-select pills + search + **Select All** |
| Ingredient / Matrix | Multi-select pills + **Select All** |
| Country | Multi-select pills + **Select All** |
| Publication Year | Dual range slider |
| Full-text search | Title + Abstract |

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `S` | Toggle sidebar |
| `/` | Focus search box |
| `Esc` | Close modal |

## ⬇️ Export

Click **Export CSV** to download filtered papers. Filename includes the count (e.g. `food_toxicants_342_papers.csv`).
