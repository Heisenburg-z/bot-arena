# bot-arena
backend for code arena site
# CodeArena Backend

RESTful API backend for the CodeArena bot competition platform built with Node.js, Express, MongoDB, and OAuth authentication.

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- Google OAuth App (for Google login)
- GitHub OAuth App (for GitHub login)

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Setup environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your actual values:
- MongoDB connection string
- JWT secret (generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")`)
- OAuth credentials from Google and GitHub

3. **Setup OAuth Applications:**

**Google OAuth:**
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project or use existing
- Enable Google+ API
- Create OAuth 2.0 credentials
- Add authorized redirect URI: `http://localhost:5000/api/auth/google/callback`

**GitHub OAuth:**
- Go to GitHub Settings > Developer settings > OAuth Apps
- Create new OAuth App
- Authorization callback URL: `http://localhost:5000/api/auth/github/callback`

4. **Initialize database:**
```bash
node setup.js
```

5. **Start development server:**
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## 📁 Project Structure

```
├── server.js              # Main server file
├── setup.js               # Database initialization
├── models/                # Mongoose models
│   ├── User.js            # User schema with OAuth support
│   ├── Game.js            # Game/competition schema
│   ├── Bot.js             # Bot submission schema
│   └── Match.js           # Match results schema
├── routes/                # API route handlers
│   ├── auth.js            # Authentication endpoints
│   ├── users.js           # User management
│   ├── games.js           # Game endpoints
│   ├── bots.js            # Bot submission/management
│   ├── matches.js         # Match history/results
│   └── leaderboard.js     # Rankings and stats
├── middleware/            # Custom middleware
│   └── auth.js            # JWT & role-based auth
├── config/                # Configuration files
│   └── passport.js        # OAuth strategies
└── uploads/               # Bot file uploads (created automatically)
```

## 🔐 Authentication

### OAuth Providers
- **Google OAuth 2.0** - Sign in with Google account
- **GitHub OAuth** - Sign in with GitHub account
- **Local Auth** - Email/password registration and login

### JWT Tokens
- 7-day expiration
- Include user ID and username
- Required for protected routes

### User Roles
- **user** - Default role, can submit bots and participate
- **moderator** - Can moderate content and users
- **admin** - Full system access

## 🎮 Core Models

### User Model
- OAuth integration (Google, GitHub, local)
- Gaming statistics (wins, losses, ELO score)
- Profile customization
- Role-based permissions

### Game Model
- Game configuration and rules
- Difficulty levels and player limits
- Performance statistics
- Active bot tracking

### Bot Model
- Code file management
- Performance metrics
- Validation system
- User association

### Match Model
- Complete game logs
- Performance analytics
- Result tracking
- Replay capabilities

## 🛠 API Endpoints

### Authentication
```
POST /api/auth/register       # Local registration
POST /api/auth/login          # Local login
GET  /api/auth/google         # Google OAuth
GET  /api/auth/github         # GitHub OAuth
POST /api/auth/logout         # Logout
GET  /api/auth/me            # Get current user
```

### Users
```
GET    /api/users            # Get all users (paginated)
GET    /api/users/:id        # Get user profile
PUT    /api/users/:id        # Update user profile
DELETE /api/users/:id        # Delete user (admin only)
```

### Games
```
GET    /api/games            # List all games
POST   /api/games            # Create game (admin only)
GET    /api/games/:id        # Get game details
PUT    /api/games/:id        # Update game (admin only)
DELETE /api/games/:id        # Delete game (admin only)
```

### Bots
```
GET    /api/bots             # User's bots
POST   /api/bots             # Submit new bot
GET    /api/bots/:id         # Bot details
PUT    /api/bots/:id         # Update bot
DELETE /api/bots/:id         # Delete bot
POST   /api/bots/:id/validate # Validate bot code
```

### Matches
```
GET    /api/matches          # Recent matches
POST   /api/matches          # Create match
GET    /api/matches/:id      # Match details