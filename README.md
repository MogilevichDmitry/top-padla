# Padel Rating Bot 🎾

Telegram bot for tracking padel match results and calculating player ratings using Elo-based system.

## Features

- 📊 Automatic rating calculation based on match results
- 🏆 Standings with 6-month rolling window
- 👥 Player management (both Telegram users and offline players)
- 📝 Easy match result recording
- 🎯 Support for different match types (to 6 / to 4)

## Quick Start

### 1. Get Bot Token

1. Open Telegram and find [@BotFather](https://t.me/BotFather)
2. Send `/newbot` command
3. Follow instructions to create your bot
4. Copy the token you receive

### 2. Setup

```bash
# Create .env file from example
cp .env.example .env

# Edit .env and add your bot token
# BOT_TOKEN=your_actual_token_here

# Install dependencies
pip install -r requirements.txt
```

### 3. Run

```bash
python main.py
```

## Bot Commands

- `/start` - Register as a player
- `/help` - Show help message
- `/players` - List all players
- `/addplayer Name` - Add offline player
- `/result to6 @A @B vs @C @D 6-3 [YYYY-MM-DD]` - Record match result
- `/standings` - Show current ratings

## Match Recording Examples

```
/result to6 @alice @bob vs @charlie @dave 6-3
/result to4 @player1 @player2 vs @player3 @player4 4-2
/result to6 Alice Bob vs Charlie Dave 6-4 2024-10-10
```

## Rating System

- **Base Rating**: 1000
- **K-factor**: 24
- **Match Weight**:
  - To 6: 1.0
  - To 4: 0.7
- **Rolling Window**: 182 days (6 months)

## Data Storage

Match and player data is stored in `data.json` file (automatically created on first run).

## Tech Stack

- Python 3.14
- aiogram 3.6.0 (Telegram Bot API)
- orjson (fast JSON)
- uvloop (async performance)
