# Optimization Plan

## Current Issues

- All calculations are done on-the-fly on every request
- No caching - every page load triggers full recalculation
- Loading state on every page navigation
- Heavy computations (ratings, stats, streaks) repeated for each request

## Proposed Optimizations

### 1. ✅ React Query (TanStack Query) - COMPLETED

**Status**: ✅ Fully implemented

**What was done**:

- ✅ Installed and configured QueryProvider
- ✅ Created custom hooks for all API endpoints:
  - `usePlayers()` - list of players
  - `usePlayerStats()` - player statistics
  - `usePlayerDetails(slug)` - detailed player info
  - `useRatings()` - ratings/standings
  - `useMatches()` / `useInfiniteMatches()` - match history
  - `usePairs()` - pair statistics
  - `useRecords()` - league records
- ✅ Migrated all pages to use React Query hooks
- ✅ Created unified Loading component
- ✅ Configured caching: 5 min staleTime, 10 min gcTime

**Benefits achieved**:

- ✅ Client-side caching (5-10 min cache)
- ✅ Automatic request deduplication
- ✅ Better loading/error states
- ✅ Faster page navigation (data from cache)

### 2. Next.js API Route Caching

**Status**: Not started

**Implementation**:

```typescript
export const revalidate = 60; // Revalidate every 60 seconds
export const dynamic = "force-static"; // Or 'force-dynamic'
```

**Benefits**:

- Server-side caching
- Reduced database queries
- Faster response times

**Files to update**:

- `/api/ratings/route.ts`
- `/api/players/stats/route.ts`
- `/api/records/route.ts`
- `/api/pairs/route.ts`

### 3. Pre-computed Statistics in Database

**Status**: Not started

**New Tables**:

```sql
CREATE TABLE player_stats_cache (
  player_id INTEGER PRIMARY KEY,
  rating DECIMAL,
  matches INTEGER,
  wins INTEGER,
  losses INTEGER,
  win_rate DECIMAL,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pair_stats_cache (
  pair_id INTEGER PRIMARY KEY,
  rating DECIMAL,
  matches INTEGER,
  wins INTEGER,
  losses INTEGER,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE league_records_cache (
  id SERIAL PRIMARY KEY,
  record_type VARCHAR(50),
  player_id INTEGER,
  value DECIMAL,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Benefits**:

- Instant data retrieval
- No on-the-fly calculations
- Can be updated incrementally

**Update Strategy**:

- Trigger recalculation when new match is added
- Background job to refresh cache periodically

### 4. Database Indexes

**Status**: Not started

**Indexes to add**:

```sql
CREATE INDEX idx_matches_date ON matches(date DESC);
CREATE INDEX idx_matches_team_a ON matches USING GIN(team_a);
CREATE INDEX idx_matches_team_b ON matches USING GIN(team_b);
CREATE INDEX idx_players_name ON players(name);
```

**Benefits**:

- Faster queries
- Better performance on large datasets

### 5. Incremental Updates

**Status**: Not started

**Strategy**:

- When new match is added, only recalculate affected:
  - Player ratings (only players in the match)
  - Pair ratings (only affected pairs)
  - Player stats (only affected players)
  - Records (only if new record is set)

**Benefits**:

- Much faster match addition
- Real-time updates possible

### 6. ISR (Incremental Static Regeneration)

**Status**: Not started

**Implementation**:

- Use `generateStaticParams` for player profiles
- Revalidate every 60 seconds
- Pre-render most common pages

**Benefits**:

- Instant page loads
- Reduced server load
- Better SEO

## Implementation Status

### ✅ Completed

1. **React Query (TanStack Query)**
   - Full migration to React Query hooks
   - Unified loading states
   - Client-side caching configured

### 🔄 Next Steps (When ready)

1. **High Priority** (Quick wins):

   - API route caching with `revalidate`
   - Database indexes for faster queries

2. **Medium Priority** (Significant impact):

   - Pre-computed statistics tables
   - Incremental updates on match creation

3. **Low Priority** (Nice to have):
   - ISR for static pages
   - Background jobs for cache refresh

## Estimated Impact

- **Current**: ~500-1000ms per page load
- **After React Query**: ~100-200ms (cached)
- **After pre-computed stats**: ~50-100ms
- **After all optimizations**: ~20-50ms
