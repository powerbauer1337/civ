# 🚀 Deployment Guide - Civilization Game

This guide covers how to deploy the Civilization Game in various environments, from development to production.

## 📋 Overview

The Civilization Game consists of three main components:
- **Frontend**: React application built with Vite
- **Backend**: Node.js Express server with Socket.io
- **Shared**: Common TypeScript types and utilities

## 🛠️ Development Deployment

### Local Development Setup

#### Quick Start
```bash
# Clone and install
git clone <repository-url>
cd civ-game
npm install

# Start development servers
npm run dev
```

#### Individual Services
```bash
# Backend only (port 4002)
npm run dev:server

# Frontend only (port 5173)
npm run dev:client
```

#### Environment Configuration
Create `.env.local` files for local development:

**Backend** (`.env.local` in root):
```bash
NODE_ENV=development
PORT=4002
DATABASE_URL=postgresql://localhost:5432/civgame_dev
CLIENT_URL=http://localhost:5173
```

**Frontend** (`.env.local` in client/):
```bash
VITE_API_BASE_URL=http://localhost:4002
VITE_SOCKET_URL=http://localhost:4002
```

#### Development Features
- **Hot Reload**: Frontend changes appear instantly
- **Auto-restart**: Backend restarts on file changes
- **Security**: Secure development keys generated automatically
- **CORS**: Properly configured for cross-origin requests

### Development Testing
```bash
# Run integration tests
node docs/setup/test-complete-system.js

# Test WebSocket multiplayer
node docs/setup/test-multi-websocket.js

# Manual API testing
curl http://localhost:4002/api/status
```

## 🏭 Production Deployment

### Build Process
```bash
# Build all packages for production
npm run build

# Individual builds
npm run build:server
npm run build:client
npm run build:shared
```

### Environment Variables

#### Required Environment Variables
```bash
# Backend (.env)
NODE_ENV=production
PORT=4002
DATABASE_URL=postgresql://user:pass@host:port/database
JWT_SECRET=your-256-bit-secure-secret-key
JWT_REFRESH_SECRET=your-256-bit-refresh-secret
SESSION_SECRET=your-256-bit-session-secret
CLIENT_URL=https://yourdomain.com

# Optional for production
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Frontend Environment Variables
```bash
# Frontend (.env.production)
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_SOCKET_URL=https://api.yourdomain.com
```

### Security Checklist
- [ ] No hardcoded secrets in code
- [ ] Environment variables properly set
- [ ] JWT secrets are 256+ bits
- [ ] HTTPS configured (TLS 1.2+)
- [ ] CORS configured for production domains
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Security headers configured

## ☁️ Cloud Deployment Options

### Option 1: Traditional VPS/Server

#### Server Requirements
- **OS**: Linux (Ubuntu 20.04+ recommended)
- **Node.js**: Version 18+
- **Memory**: 1GB minimum, 2GB+ recommended
- **Storage**: 10GB minimum
- **Network**: Public IP with ports 80, 443, 4002 accessible

#### Deployment Steps
```bash
# 1. Server setup
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs nginx postgresql

# 2. Application deployment
git clone <repository-url> /opt/civ-game
cd /opt/civ-game
npm install
npm run build

# 3. Environment configuration
sudo cp .env.example .env
sudo nano .env  # Configure production values

# 4. Process manager
sudo npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save

# 5. Reverse proxy (Nginx)
sudo cp deployment/nginx.conf /etc/nginx/sites-available/civ-game
sudo ln -s /etc/nginx/sites-available/civ-game /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

#### PM2 Configuration (ecosystem.config.js)
```javascript
module.exports = {
  apps: [{
    name: 'civ-game-server',
    script: 'server/dist/test-game-server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4002
    },
    error_file: '/var/log/pm2/civ-game-error.log',
    out_file: '/var/log/pm2/civ-game-out.log',
    log_file: '/var/log/pm2/civ-game-combined.log'
  }]
}
```

#### Nginx Configuration
```nginx
# /etc/nginx/sites-available/civ-game
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Frontend static files
    location / {
        root /opt/civ-game/client/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API backend proxy
    location /api {
        proxy_pass http://localhost:4002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket proxy
    location /socket.io {
        proxy_pass http://localhost:4002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:4002;
    }
}
```

### Option 2: Docker Deployment

#### Dockerfile (Backend)
```dockerfile
# server/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY shared/ ./shared/
COPY server/ ./server/

# Build application
RUN npm run build:shared
RUN npm run build:server

# Expose port
EXPOSE 4002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:4002/health || exit 1

# Start application
CMD ["node", "server/dist/test-game-server.js"]
```

#### Dockerfile (Frontend)
```dockerfile
# client/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm ci

# Copy source code
COPY shared/ ./shared/
COPY client/ ./client/

# Build application
RUN npm run build:shared
RUN npm run build:client

# Production image
FROM nginx:alpine

# Copy built application
COPY --from=builder /app/client/dist /usr/share/nginx/html

# Copy nginx configuration
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost || exit 1
```

#### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: server/Dockerfile
    ports:
      - "4002:4002"
    environment:
      - NODE_ENV=production
      - PORT=4002
      - DATABASE_URL=postgresql://postgres:password@db:5432/civgame
      - JWT_SECRET=${JWT_SECRET}
      - CLIENT_URL=http://localhost:3000
    depends_on:
      - db
      - redis
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: client/Dockerfile
    ports:
      - "3000:80"
    environment:
      - VITE_API_BASE_URL=http://localhost:4002
      - VITE_SOCKET_URL=http://localhost:4002
    restart: unless-stopped

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=civgame
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### Docker Deployment Commands
```bash
# Build and start services
docker-compose up -d --build

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Scale backend
docker-compose up -d --scale backend=3

# Stop services
docker-compose down

# Remove volumes (data loss!)
docker-compose down -v
```

### Option 3: Cloud Platform Deployment

#### Heroku
```bash
# Heroku deployment
heroku create civ-game-backend
heroku create civ-game-frontend

# Set environment variables
heroku config:set NODE_ENV=production --app civ-game-backend
heroku config:set JWT_SECRET=$(openssl rand -base64 32) --app civ-game-backend

# Deploy backend
git subtree push --prefix server heroku-backend main

# Deploy frontend
git subtree push --prefix client heroku-frontend main
```

#### Vercel (Frontend Only)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd client
vercel --prod

# Set environment variables in Vercel dashboard
```

#### DigitalOcean App Platform
```yaml
# .do/app.yaml
name: civ-game
services:
  - name: backend
    source_dir: server
    github:
      repo: your-username/civ-game
      branch: main
    run_command: npm start
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    envs:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        value: ${JWT_SECRET}
    health_check:
      http_path: /health

  - name: frontend
    source_dir: client
    github:
      repo: your-username/civ-game
      branch: main
    build_command: npm run build
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs

databases:
  - name: db
    engine: PG
    version: "14"
```

## 🔄 CI/CD Pipeline

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: npm
      
      - run: npm ci
      - run: npm test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: success()
    
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          # Add deployment commands here
          echo "Deploying to production..."
```

### Automated Testing
```bash
# Pre-deployment tests
npm test                          # Unit tests
npm run test:integration         # Integration tests
npm run build                    # Build test
node docs/setup/test-complete-system.js  # System test
```

## 📊 Monitoring & Observability

### Health Monitoring
```bash
# Health check endpoints
curl https://yourdomain.com/health
curl https://yourdomain.com/api/status
```

### Log Management
```bash
# PM2 logs
pm2 logs civ-game-server

# Docker logs
docker-compose logs -f backend

# System logs
journalctl -u nginx -f
```

### Performance Monitoring
```javascript
// Add to server for basic metrics
const startTime = Date.now();
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} - ${Date.now() - startTime}ms`);
  });
  next();
});
```

### Alerting Setup
- **Uptime monitoring**: Use services like UptimeRobot, Pingdom
- **Error tracking**: Sentry, Rollbar, or similar
- **Performance**: New Relic, DataDog, or similar

## 🔧 Maintenance & Updates

### Regular Maintenance
```bash
# Update dependencies
npm update
npm audit fix

# Security updates
npm audit
npm audit fix --force  # if needed

# Log rotation
sudo logrotate -f /etc/logrotate.d/pm2
```

### Database Backups
```bash
# PostgreSQL backup
pg_dump civgame > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backups (crontab)
0 2 * * * pg_dump civgame > /backups/civgame_$(date +\%Y\%m\%d).sql
```

### Zero-Downtime Deployment
```bash
# Using PM2
pm2 reload ecosystem.config.js

# Using Docker
docker-compose up -d --no-deps backend

# Using load balancer
# Route traffic to new instances, then update old ones
```

## 🚨 Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check logs
pm2 logs civ-game-server
docker-compose logs backend

# Check environment variables
env | grep NODE_ENV

# Check port conflicts
netstat -tulpn | grep :4002
```

#### WebSocket Connection Issues
```bash
# Check nginx WebSocket config
sudo nginx -t
sudo systemctl reload nginx

# Test WebSocket directly
node docs/setup/test-websocket-client.js
```

#### Database Connection Issues
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check connection pooling
# Monitor active connections
```

#### High Memory Usage
```bash
# Check Node.js memory usage
pm2 monit

# Restart application
pm2 restart civ-game-server

# Check for memory leaks
node --inspect server/dist/test-game-server.js
```

### Performance Optimization
- **Enable gzip**: Nginx compression for static files
- **CDN**: Use CloudFlare or similar for static assets
- **Database indexing**: Add indexes for frequently queried columns
- **Redis caching**: Cache frequently accessed data
- **Connection pooling**: Optimize database connections

## 📈 Scaling Considerations

### Horizontal Scaling
- **Load Balancer**: Nginx, HAProxy, or cloud load balancer
- **Multiple Backend Instances**: PM2 cluster mode or Docker scaling
- **Session Affinity**: Sticky sessions for WebSocket connections
- **Redis**: Shared session storage across instances

### Database Scaling
- **Connection Pooling**: Optimize database connections
- **Read Replicas**: For read-heavy workloads
- **Caching**: Redis for frequently accessed data
- **Indexing**: Optimize database queries

### Monitoring at Scale
- **Application Metrics**: Response times, error rates
- **Infrastructure Metrics**: CPU, memory, disk usage
- **Business Metrics**: Active users, games created
- **Alerting**: Automated alerts for issues

---

**🚀 Ready for production deployment? Follow the steps above to get your Civilization Game running smoothly in any environment!**