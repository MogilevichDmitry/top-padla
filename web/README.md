# Top Padla - Web Version

A modern web application for tracking padla (table tennis) ratings using a modified Elo rating system.

## Features

- 🏆 **Real-time Rankings** - Live player standings with detailed statistics
- 📊 **Advanced Rating System** - Modified Elo with match type weighting
- 🎾 **Match Types** - Support for to6, to4, and to3 games
- 📈 **Player Statistics** - Comprehensive stats for each player
- 🌐 **RESTful API** - Full API for integration

## Tech Stack

- **Frontend**: Next.js 15 + React + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Vercel Postgres
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- A Vercel account
- Git

### Setup

1. **Clone the repository**
```bash
git clone git@github.com:MogilevichDmitry/top-padla.git
cd top-padla/web
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Vercel Postgres**

- Go to [Vercel Dashboard](https://vercel.com/dashboard)
- Create a new project or select existing one
- Go to Storage → Create Database → Postgres
- Copy the `.env.local` variables provided

4. **Configure environment variables**

Create `.env.local` file:
```env
POSTGRES_URL="..."
POSTGRES_PRISMA_URL="..."
POSTGRES_URL_NO_SSL="..."
POSTGRES_URL_NON_POOLING="..."
POSTGRES_USER="..."
POSTGRES_HOST="..."
POSTGRES_PASSWORD="..."
POSTGRES_DATABASE="..."
```

5. **Run migration** (if you have existing data.json)
```bash
npm install -g tsx
tsx scripts/migrate.ts
```

6. **Run development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints

### GET /api/players
Returns all players.

### GET /api/matches
Returns all matches (sorted by date, newest first).

### POST /api/matches
Create a new match.

**Body:**
```json
{
  "date": "2025-11-15T10:00:00Z",
  "type": "to3",
  "team_a": [1, 2],
  "team_b": [3, 4],
  "score_a": 3,
  "score_b": 1,
  "created_by": 12345
}
```

### GET /api/ratings
Returns player standings with ratings and statistics.

## Rating System

The rating system uses a modified Elo formula:

- **Base K-factor**: 28
- **Match type multipliers**:
  - to6: 1.0 (full effect)
  - to4: 0.8 (80% effect)
  - to3: 0.7 (70% effect)
- **Score influence**: Reduced by 40% (margin factor = 0.3)
- **Time window**: 182 days (6 months)

## Deployment

### Deploy to Vercel

1. **Push to GitHub**
```bash
git add .
git commit -m "Initial commit"
git push
```

2. **Import to Vercel**
- Go to [Vercel Dashboard](https://vercel.com/new)
- Import your GitHub repository
- Vercel will auto-detect Next.js
- Add your Postgres database
- Deploy!

Your app will be live at `https://your-project.vercel.app`

## Project Structure

```
web/
├── app/
│   ├── api/           # API routes
│   │   ├── players/
│   │   ├── matches/
│   │   └── ratings/
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Home page (standings)
├── lib/
│   ├── db.ts          # Database functions
│   └── rating.ts      # Rating calculation logic
├── scripts/
│   └── migrate.ts     # Data migration script
└── schema.sql         # Database schema
```

## License

MIT
