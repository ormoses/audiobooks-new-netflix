# Audiobook Catalog

A Netflix-style personal audiobook library manager built with Next.js. Browse, organize, rate, and track your audiobook collection with a dark-themed, mobile-friendly interface.

## Features

- **Library browsing** — Grid view of all audiobooks with cover art, search, filtering, and sorting
- **Status tracking** — Mark books as Not Started, In Progress, or Finished
- **Ratings** — 1–5 star ratings for books and individual narrators
- **Series management** — Group books by series with completion stats, batch-apply ratings/status
- **Needs Rating view** — Quickly find unrated books in your library
- **CSV import/export** — Bulk import from a CSV audiobook index, export your full library
- **Local file scanning** — Scan folders for audio files (.mp3, .m4a, .m4b, .flac, .opus, .ogg, .aac), auto-extract metadata from tags and folder names
- **Cover management** — Extract embedded cover art from audio files, upload to cloud storage
- **Simple authentication** — Password-based login with signed tokens
- **Dual deployment** — Run locally with SQLite or deploy to Vercel with Turso cloud database

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS (Netflix-inspired dark theme) |
| Database | SQLite via `@libsql/client` (local) / Turso (cloud) |
| Cloud Storage | Vercel Blob (cover images) |
| Audio Metadata | `music-metadata`, `sharp` |
| CSV Parsing | PapaParse |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/ormoses/audiobooks-new-netflix.git
cd audiobooks-new-netflix
npm install
```

### Configuration

Create a `.env.local` file in the project root:

```env
# Database — local SQLite path (used in development)
DATABASE_PATH=./data/app.db

# Authentication
APP_PASSWORD=your-login-password
AUTH_SECRET=a-random-32-character-secret-key

# (Optional) Turso cloud database — required for Vercel deployment
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-turso-token

# (Optional) Vercel Blob — for cloud cover image storage
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app uses a local SQLite database stored at `./data/app.db`.

### Production Build

```bash
npm run build
npm start
```

## Usage

### Adding Books

There are two ways to add audiobooks:

1. **CSV Import** (Settings page) — Upload a CSV file with columns for path, title, author, narrator, duration, series info, etc.
2. **Add from Files** (Settings page, local mode only) — Point the app at a folder on your filesystem. It scans for audio files, extracts metadata from tags and folder structure, and lets you review/edit before committing.

### Browsing & Filtering

The Library page supports:
- **Search** across title, author, narrator, and tags
- **Filter** by status (not started / in progress / finished) and rating state
- **Sort** by title, author, narrator, rating, date added, series, or status
- **View toggle** between individual books and series groupings

### Rating Books

- Click a book card to open its detail page
- Set a 1–5 star book rating
- Rate each narrator individually
- Use the "Needs Rating" page to find unrated books
- Batch-apply ratings to an entire series from the series detail page

### Exporting Data

Export your full library (including ratings, status, notes) as a CSV from the Settings page.

## Deploying to Vercel

1. Push to GitHub
2. Import the repo in Vercel
3. Set environment variables: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `APP_PASSWORD`, `AUTH_SECRET`, and optionally `BLOB_READ_WRITE_TOKEN`
4. Deploy

In cloud mode, some local-only features (file scanning, cover extraction, CSV import via UI) are disabled. Use the CLI import script instead:

```bash
npm run import:cloud -- --csv "path/to/your-audiobooks.csv"
```

## Project Structure

```
src/
├── app/                  # Next.js pages and API routes
│   ├── api/              # REST API (auth, books, covers, csv, files, series, etc.)
│   ├── book/[id]/        # Book detail page
│   ├── library/          # Main library page
│   ├── series/[key]/     # Series detail page
│   ├── needs-rating/     # Unrated books page
│   ├── settings/         # Import/export/cover management
│   └── login/            # Login page
├── components/           # React components (BookCard, FilterPanel, StarRating, etc.)
└── lib/                  # Shared utilities
    ├── db.ts             # Database operations
    ├── schema.ts         # Schema definitions and migrations
    ├── types.ts          # TypeScript types
    ├── auth.ts           # Authentication logic
    ├── file-scanner.ts   # Audio file detection and metadata extraction
    └── csv-parser.ts     # CSV parsing
scripts/
└── import-to-turso.ts    # CLI tool for cloud database import
data/
└── app.db                # Local SQLite database (gitignored)
```

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Authenticate |
| GET | `/api/books` | List books (with search, filter, sort params) |
| GET | `/api/books/[id]` | Book detail with narrator ratings |
| PUT | `/api/books/[id]` | Update book (rating, status, notes, etc.) |
| DELETE | `/api/books/[id]` | Delete a book |
| POST | `/api/books/[id]/narrator-ratings` | Update narrator ratings |
| GET | `/api/series` | List all series with stats |
| POST | `/api/series/[key]/batch-apply` | Batch update series books |
| POST | `/api/csv/validate` | Validate a CSV file |
| POST | `/api/csv/import` | Import CSV data |
| GET | `/api/export` | Export library as CSV |
| POST | `/api/files/scan` | Scan folder for audio files |
| POST | `/api/files/commit` | Commit scanned books to database |
| POST | `/api/covers/extract` | Extract covers from audio files |
| POST | `/api/covers/upload` | Upload covers to Vercel Blob |
| GET | `/api/needs-rating` | Get books missing ratings |
| GET | `/api/health` | Health check |

## License

This project is for personal use.
