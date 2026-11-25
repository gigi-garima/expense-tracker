# SpendWise — Expense Tracker & Personal Finance Dashboard

A clean, modern personal finance dashboard built for a second-year college Web Technology project using only **HTML5**, **CSS3**, **Vanilla JavaScript (ES6)**, and browser **`localStorage`**.

## Tech Stack
- **HTML5** (semantic markup and accessible ARIA labels)
- **CSS3** (custom properties, Flexbox, CSS Grid, responsive breakpoints)
- **Vanilla JavaScript (ES6)** (DOM manipulation, event delegation, `addEventListener`)
- **Browser `localStorage`** (planned for later phases)

## Current Status: Phase 1 (Frontend Foundation & Visual Design)
Phase 1 establishes the single-page layout, visual theme, sidebar navigation, current date display, notification area, and placeholder UI for all five sections:
1. **Dashboard** — KPI summary cards, budget progress bar, category & monthly chart previews, and recent transactions.
2. **Transactions** — Search/filter toolbar, Add Expense trigger, and responsive transaction table.
3. **Analytics** — Spending statistics cards, category doughnut chart preview, and monthly comparison bar chart preview.
4. **Budget** — Monthly budget input form, budget summary, progress bar, and threshold warning preview.
5. **Settings** — Appearance (theme control), CSV export button, and data management section.

> **Note:** All numerical values, charts, and table rows in Phase 1 are clearly labeled **Sample Data** / **Sample Preview**. Actual CRUD operations, calculations, and `localStorage` persistence will be added in upcoming phases.

## Project Structure
```text
spendWise/
├── assets/
│   └── logo.svg
├── css/
│   └── style.css
├── js/
│   └── script.js
├── .gitignore
├── index.html
└── README.md
```

## How to Run
Open `index.html` directly in any modern web browser, or serve the folder with a simple static server (such as VS Code Live Server).
