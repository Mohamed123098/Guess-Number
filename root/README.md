# Digit Duel - Multiplayer Number Guessing Game

A Progressive Web App (PWA) number guessing game with real-time gameplay, AI opponents, and local multiplayer support.

## 🎮 Features

- **🤖 vs Computer**: Challenge AI with 3 difficulty levels (Easy, Medium, Hard)
- **👥 vs Friend**: Local multiplayer on the same device
- **📱 PWA**: Installable on mobile devices, works offline
- **🎨 Premium Design**: Dark theme with glassmorphism effects
- **🔊 Sound Effects**: Synthesized audio (no external files)
- **📊 Statistics**: Track wins, losses, and games played
- **⏱️ Timer**: Dynamic game time based on digit count

## 🕹️ How to Play

1. Each player picks a secret number (3-10 digits)
2. Players take turns guessing the opponent's secret
3. After each guess, you receive feedback:
   - **"X digits correct"** - X digits exist in the secret
   - **"All digits correct but wrong arrangement"** - Right digits, wrong order
   - **"No correct digits"** - None of your digits are in the secret
4. First to guess correctly wins! (Max 10 guesses each)

## 🚀 Deployment Options

### Option 1: GitHub Pages (Free)

1. Create a new GitHub repository
2. Push this code to the repository
3. Go to Settings → Pages
4. Set Source to "main" branch
5. Your game will be live at `https://yourusername.github.io/repository-name/`

### Option 2: Netlify (Free)

1. Go to [netlify.com](https://netlify.com)
2. Drag and drop this folder to deploy
3. Get your free URL instantly

### Option 3: Vercel (Free)

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in this directory
3. Follow the prompts for instant deployment

### Option 4: Cloudflare Pages (Free)

1. Push to GitHub
2. Connect repository on Cloudflare Pages
3. Deploy with default settings

## 📁 Project Structure

```
Guess Number/
├── index.html          # Main HTML with all screens
├── manifest.json       # PWA manifest for installability
├── sw.js              # Service Worker for offline support
├── css/
│   └── style.css      # Premium dark theme styles
├── js/
│   ├── app.js         # Main application & navigation
│   ├── game.js        # Core game logic & turn handling
│   ├── ai.js          # AI opponent (3 difficulty levels)
│   ├── storage.js     # LocalStorage for stats/settings
│   └── audio.js       # Web Audio API sound effects
└── icons/
    ├── icon.svg       # Scalable vector icon
    ├── icon-192.png   # PWA icon (192x192)
    └── icon-512.png   # PWA icon (512x512)
```

## 🔧 Local Development

Since this is a PWA with ES modules, you need a local server to avoid CORS issues:

### Windows (Easiest - No Installation Required)

Simply double-click `start-server.ps1` or run in PowerShell:

```powershell
.\start-server.ps1
```

The server will start automatically and open your browser to `http://localhost:8080`

### Alternative Methods

```bash
# Using Python
python -m http.server 8080

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8080
```

Then open `http://localhost:8080` in your browser.

## 📲 Installing as App

1. Open the game in Chrome/Edge/Safari
2. Click "Install" when prompted, or:
   - **Chrome**: Menu → "Install Digit Duel"
   - **Safari (iOS)**: Share → "Add to Home Screen"
   - **Edge**: Menu → "Apps" → "Install this site as an app"

## 🎯 Game Time Formula

```
Time (minutes) = Number of Digits × 2
```

Adjusted by difficulty:
- Easy: ×1.2 (more time)
- Medium: ×1.0 (normal)
- Hard: ×0.8 (less time)

## 📝 License

MIT License - Feel free to use and modify!
