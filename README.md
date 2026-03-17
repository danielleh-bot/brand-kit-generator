# Brand Kit Generator

A browser-based tool that automatically extracts brand design tokens (colors, typography, spacing, layout) from any publisher website and generates a native Taboola feed prototype styled with those tokens.

## Features

- **Web Crawler** — Fetches a publisher's homepage and extracts design tokens from CSS
- **Brand Kit JSON** — Generates a structured JSON file with color, font, layout, and brand signal tokens
- **Feed Prototype** — Renders a below-article Taboola feed styled with publisher brand tokens
- **Analysis Report** — Before vs. after comparison of manual config vs. automated brand kit

## Project Structure

```
├── index.html          Main application entry point
├── css/
│   └── styles.css      Application styles
├── js/
│   ├── utils.js        Color utilities and download helpers
│   ├── extractors.js   Token extraction functions (colors, fonts, layout, brand signals)
│   ├── crawl.js        CORS proxy fetching, crawl orchestration, results display
│   ├── brand-kit.js    JSON viewer, editor, and visual preview
│   ├── prototype.js    Feed prototype HTML generator
│   ├── analysis.js     Before vs. after analysis report generator
│   └── app.js          Application state and stepper navigation
├── package.json
└── .gitignore
```

## Usage

1. Open `index.html` in a browser (or run `npm start` to serve locally)
2. Enter a publisher URL and name
3. Click **Start Crawl** to extract brand tokens
4. Review the generated Brand Kit JSON
5. Preview the native feed prototype
6. Generate and download the analysis report

## Running Locally

```bash
npm start
```

This serves the project on a local HTTP server using `npx serve`.
