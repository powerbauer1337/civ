# 🚀 Deployment Guide

This document provides comprehensive deployment instructions for the Civilization browser game.

## 🎯 Deployment Options

### 1. GitHub Pages (Frontend Only - Demo Mode)

The frontend is automatically deployed to GitHub Pages with demo mode enabled, allowing users to experience the game without a backend server.

**Live Demo**: https://powerbauer1337.github.io/civ/

#### Features in Demo Mode:
- ✅ Complete UI and game interface
- ✅ Offline single-player gameplay with AI opponents
- ✅ Local storage persistence
- ✅ All game mechanics (combat, city management, tech tree)
- ✅ Simulated multiplayer experience
- ❌ Real multiplayer (requires backend server)

#### Automatic Deployment:
- Triggers on push to `main` branch
- Uses GitHub Actions workflow (`.github/workflows/deploy.yml`)
- Builds optimized production bundle
- Deploys to GitHub Pages

### 2. Full-Stack Deployment (Production)

For real multiplayer functionality, deploy both frontend and backend.

#### Recommended Hosting Platforms:

##### Backend Options:
- **Heroku** (Recommended for beginners)
- **Railway** (Modern, simple deployment)
- **DigitalOcean App Platform**
- **AWS Elastic Beanstalk**
- **Google Cloud Run**
- **Vercel** (Serverless functions)

##### Database Options:
- **Heroku Postgres** (managed PostgreSQL)
- **PlanetScale** (managed MySQL/PostgreSQL)
- **Supabase** (PostgreSQL with real-time features)
- **Railway PostgreSQL** (simple setup)

##### Redis Caching:
- **Redis Labs** (managed Redis)
- **Heroku Redis** (Redis add-on)
- **Railway Redis** (one-click Redis)

## 🛠️ Backend Deployment

### Heroku Deployment (Recommended)

1. **Install Heroku CLI**
   ```bash
   # macOS
   brew tap heroku/brew && brew install heroku
   
   # Windows
   # Download from https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create Heroku Apps**
   ```bash
   # Create app for backend
   heroku create your-civ-game-api
   
   # Add PostgreSQL database
   heroku addons:create heroku-postgresql:mini -a your-civ-game-api
   
   # Add Redis (optional)
   heroku addons:create heroku-redis:mini -a your-civ-game-api
   ```

4. **Configure Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production -a your-civ-game-api
   heroku config:set JWT_SECRET=your-super-secret-jwt-key -a your-civ-game-api
   heroku config:set CLIENT_URL=https://powerbauer1337.github.io -a your-civ-game-api
   ```

5. **Deploy Backend**
   ```bash
   # Add Heroku remote
   git remote add heroku-server https://git.heroku.com/your-civ-game-api.git
   
   # Deploy server subdirectory
   git subtree push --prefix server heroku-server main
   ```

6. **Update Frontend Configuration**
   ```bash
   # Set GitHub repository secrets for frontend deployment
   # Go to: https://github.com/powerbauer1337/civ/settings/secrets/actions
   
   # Add secrets:
   API_BASE_URL=https://your-civ-game-api.herokuapp.com
   SOCKET_URL=https://your-civ-game-api.herokuapp.com
   ```

### Railway Deployment (Alternative)

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and Deploy**
   ```bash
   railway login
   
   # Deploy backend
   cd server
   railway init
   railway up
   
   # Add database
   railway add postgresql
   railway add redis
   ```

3. **Set Environment Variables**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set JWT_SECRET=your-super-secret-jwt-key
   ```

## 🔧 Environment Variables

### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://localhost:5432/civgame
REDIS_URL=redis://localhost:6379

# Server
NODE_ENV=production
PORT=3001
CLIENT_URL=https://powerbauer1337.github.io

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Game Configuration
MAX_GAMES_PER_USER=3
TURN_TIME_LIMIT=300
MAX_CONCURRENT_GAMES=100

# Features
ENABLE_AI_PLAYERS=true
ENABLE_SPECTATORS=true
```

### Frontend (GitHub Secrets)
```bash
VITE_API_BASE_URL=https://your-backend-url.com
VITE_SOCKET_URL=https://your-backend-url.com
```

## 📋 Pre-Deployment Checklist

### Backend
- [ ] All environment variables configured
- [ ] Database migrations run successfully
- [ ] CORS configured for your frontend domain
- [ ] JWT secret is cryptographically secure
- [ ] Rate limiting configured
- [ ] Logging and monitoring setup

### Frontend
- [ ] Build process completes without errors
- [ ] All routes work correctly
- [ ] WebSocket connections establish properly
- [ ] Mobile responsiveness tested
- [ ] Production bundle optimized

## 🚀 Deployment Commands

### Complete Deployment Process

1. **Commit and Push Changes**
   ```bash
   git add .
   git commit -m "feat: ready for production deployment"
   git push origin main
   ```

2. **Deploy Backend to Heroku**
   ```bash
   # From project root
   git subtree push --prefix server heroku-server main
   ```

3. **Frontend Auto-Deploys**
   - GitHub Pages deployment triggers automatically
   - Check Actions tab: https://github.com/powerbauer1337/civ/actions

4. **Verify Deployment**
   - Frontend: https://powerbauer1337.github.io/civ/
   - Backend: https://your-civ-game-api.herokuapp.com/health

## 🔍 Monitoring & Maintenance

### Health Checks
- Backend health endpoint: `/health`
- Frontend build status in GitHub Actions
- Database connection monitoring

### Performance Monitoring
- **Heroku Metrics** for backend performance
- **GitHub Pages** analytics for frontend usage
- **Database performance** monitoring

### Scaling Considerations
- **Horizontal scaling**: Multiple backend instances
- **Database optimization**: Connection pooling, indexing
- **CDN**: CloudFlare for static asset delivery
- **Caching**: Redis for improved performance

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**
   ```javascript
   // server/src/index.ts
   app.use(cors({
     origin: ['https://powerbauer1337.github.io', 'http://localhost:5173']
   }))
   ```

2. **WebSocket Connection Failed**
   - Check Socket.io CORS configuration
   - Verify backend URL in frontend config
   - Ensure WSS (secure WebSocket) for HTTPS

3. **Database Connection Issues**
   - Verify DATABASE_URL format
   - Check Heroku PostgreSQL addon
   - Run database migrations

4. **Build Failures**
   - Clear node_modules and reinstall
   - Check TypeScript compilation errors
   - Verify all dependencies are installed

## 💡 Production Optimizations

### Backend
- Enable gzip compression
- Implement request logging
- Setup error tracking (Sentry)
- Configure production database pooling
- Enable Redis caching

### Frontend
- Bundle splitting for optimal loading
- Service worker for offline capability
- Image optimization and lazy loading
- Performance monitoring (Web Vitals)

## 🔐 Security Considerations

### Production Security
- Use HTTPS everywhere
- Implement proper CORS policies
- Secure JWT secrets (use environment variables)
- Enable rate limiting
- Input validation and sanitization
- Regular security updates

### Database Security
- Use connection pooling
- Implement database backups
- Monitor for unusual query patterns
- Restrict database access by IP

## 📊 Analytics & Monitoring

### Recommended Tools
- **Frontend**: Google Analytics, Vercel Analytics
- **Backend**: Heroku Metrics, New Relic
- **Database**: PgHero, DataDog
- **Errors**: Sentry, LogRocket

## 🎯 Next Steps After Deployment

1. **Domain Setup** (Optional)
   - Purchase custom domain
   - Configure DNS settings
   - Setup SSL certificates

2. **Enhanced Monitoring**
   - Setup uptime monitoring
   - Error tracking and alerts
   - Performance monitoring

3. **Feature Expansion**
   - Mobile app (React Native)
   - Advanced AI opponents
   - Tournament system
   - Replay system

---

## 🚀 Quick Deployment Summary

**Frontend (Automatic)**:
- Push to main → GitHub Actions → GitHub Pages
- Live at: https://powerbauer1337.github.io/civ/

**Backend (Manual)**:
1. Create Heroku app: `heroku create your-app-name`
2. Add database: `heroku addons:create heroku-postgresql:mini`
3. Deploy: `git subtree push --prefix server heroku main`
4. Configure environment variables via Heroku dashboard

**Full-Stack Live Example**:
- Demo Mode: https://powerbauer1337.github.io/civ/ (Frontend only)
- With Backend: https://your-api.herokuapp.com (Backend + Frontend)

Your Civilization empire awaits! 🌍👑