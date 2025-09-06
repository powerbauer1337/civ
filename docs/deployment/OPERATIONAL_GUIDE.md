# Operational Guide - Civilization Game

Comprehensive operational procedures for production deployment, monitoring, and maintenance of the multiplayer civilization game.

## 🚀 Production Deployment

### Pre-deployment Checklist

```bash
# ✅ Code Quality Verification
npm test                           # 579/579 tests passing
npm run build                      # TypeScript compilation success
npm run lint                       # ESLint validation
npm audit                          # Security vulnerability check

# ✅ Performance Benchmarks
cd server && npm run test:game-loop    # <100ms turn processing
cd client && npm run build            # Bundle size <600kB

# ✅ Documentation & Configuration  
npm run docs:validate              # Documentation completeness
cp server/.env.example server/.env.production  # Production config template
```

### Environment Setup

#### Production Environment Variables
```bash
# =============================================================================
# PRODUCTION CONFIGURATION TEMPLATE
# =============================================================================
# Copy to server/.env and customize for your environment

# Core Configuration
NODE_ENV=production
PORT=3001
CLIENT_URL=https://yourdomain.com

# Database & Persistence
PERSISTENCE_PROVIDER=postgres
DATABASE_URL=postgresql://username:password@db-host:5432/civgame_prod
REDIS_URL=redis://redis-host:6379

# Security (REQUIRED - Generate with crypto.randomBytes(64).toString('hex'))
JWT_SECRET=<your-256-bit-jwt-secret>
JWT_REFRESH_SECRET=<your-256-bit-refresh-secret>  
SESSION_SECRET=<your-256-bit-session-secret>

# Security Settings
ENABLE_SECURITY_HEADERS=true
ENABLE_CORS_CREDENTIALS=false
ENABLE_DEBUG_ENDPOINTS=false
BYPASS_RATE_LIMITING=false

# Rate Limiting (15-minute window)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_STRICT_MODE=true

# Game Configuration
MAX_CONCURRENT_GAMES=100
MAX_PLAYERS_PER_GAME=8
MAX_GAMES_PER_USER=3
TURN_TIME_LIMIT=300

# Monitoring & Logging
LOG_LEVEL=info
REQUEST_TIMEOUT_MS=30000
```

#### Security Configuration Generation
```bash
# Generate secure secrets for production
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"  
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Validate secret strength
node -e "const secret = process.env.JWT_SECRET; console.log(secret ? 'Length: ' + secret.length + ' (min 64 required)' : 'NOT SET')"
```

### Deployment Methods

#### Method 1: Traditional Server Deployment

**Server Requirements:**
- Ubuntu 20.04+ or CentOS 8+
- Node.js 18+
- PostgreSQL 14+ 
- Redis 7+ (optional but recommended)
- Nginx (reverse proxy)
- PM2 (process management)

**Deployment Steps:**
```bash
# 1. Server Preparation
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs nginx postgresql postgresql-contrib redis-server

# 2. Application Deployment
sudo mkdir -p /opt/civ-game
cd /opt/civ-game
git clone <your-repo> .
npm install
npm run build

# 3. Database Setup  
sudo -u postgres createuser civgame_user
sudo -u postgres createdb civgame_prod -O civgame_user
sudo -u postgres psql -c "ALTER USER civgame_user PASSWORD 'secure_password';"

# 4. Environment Configuration
sudo cp server/.env.example server/.env
sudo nano server/.env  # Configure production values

# 5. Process Management
sudo npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save

# 6. Reverse Proxy Configuration
sudo cp deployment/nginx.conf /etc/nginx/sites-available/civ-game
sudo ln -s /etc/nginx/sites-available/civ-game /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 7. SSL Certificate (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

#### Method 2: Docker Deployment

**Docker Compose Configuration:**
```yaml
# docker-compose.production.yml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: server/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://civgame:${DB_PASSWORD}@db:5432/civgame
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - CLIENT_URL=${CLIENT_URL}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: .
      dockerfile: client/Dockerfile
    ports:
      - "80:80"
      - "443:443"
    environment:
      - VITE_API_BASE_URL=${API_BASE_URL}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: civgame
      POSTGRES_USER: civgame  
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U civgame"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    driver: bridge
```

**Docker Deployment Commands:**
```bash
# Deploy with environment variables
export JWT_SECRET=$(openssl rand -base64 64)
export DB_PASSWORD=$(openssl rand -base64 32)
export REDIS_PASSWORD=$(openssl rand -base64 32)
export CLIENT_URL=https://yourdomain.com
export API_BASE_URL=https://api.yourdomain.com

# Start production stack
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose -f docker-compose.production.yml logs -f backend
docker-compose -f docker-compose.production.yml logs -f frontend

# Scale backend instances
docker-compose -f docker-compose.production.yml up -d --scale backend=3
```

#### Method 3: Cloud Platform Deployment

**Heroku Deployment:**
```bash
# Create applications
heroku create civ-game-backend --stack heroku-20
heroku create civ-game-frontend --stack heroku-20

# Configure backend
heroku config:set NODE_ENV=production --app civ-game-backend
heroku config:set JWT_SECRET=$(openssl rand -base64 64) --app civ-game-backend
heroku addons:create heroku-postgresql:mini --app civ-game-backend
heroku addons:create heroku-redis:mini --app civ-game-backend

# Deploy
git subtree push --prefix server heroku-backend main
git subtree push --prefix client heroku-frontend main
```

**DigitalOcean App Platform:**
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

## 📊 Monitoring & Observability

### Health Check Endpoints

```bash
# Primary health check
curl https://yourdomain.com/health
# Expected: {"status":"healthy","timestamp":"...","uptime":...,"environment":"production"}

# Detailed system status  
curl https://yourdomain.com/api/status
# Expected: {"gameServer":"running","totalGames":N,"activeGames":N,"players":N}

# Component health checks
curl https://yourdomain.com/api/db-health     # Database connectivity
curl https://yourdomain.com/api/redis-health  # Redis connectivity  
curl https://yourdomain.com/api/websocket-health  # WebSocket status
```

### Application Monitoring

#### Performance Metrics
```javascript
// Built-in performance monitoring (server/src/middleware/monitoring.js)
const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const memory = process.memoryUsage();
    
    console.log({
      method: req.method,
      path: req.path,
      duration: `${duration}ms`,
      status: res.statusCode,
      memory: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`
    });
    
    // Alert on slow requests
    if (duration > 1000) {
      console.warn(`SLOW REQUEST: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  
  next();
};
```

#### Custom Monitoring Dashboard
```bash
# Real-time system metrics
curl -s https://yourdomain.com/health | jq '{status,uptime,timestamp}'

# Game metrics
curl -s https://yourdomain.com/api/status | jq '{totalGames,activeGames,players}'

# Performance metrics (if implemented)
curl -s https://yourdomain.com/api/metrics | jq '{
  averageResponseTime,
  requestsPerSecond,  
  memoryUsage,
  activeConnections
}'
```

### Log Management

#### Production Logging Configuration
```javascript
// server/src/config/logging.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5  
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});
```

#### Log Analysis Commands
```bash
# Error monitoring
tail -f /opt/civ-game/logs/error.log | grep -E "(ERROR|FATAL)"

# Performance monitoring  
tail -f /opt/civ-game/logs/combined.log | grep -E "(SLOW|timeout|connection)"

# Security monitoring
tail -f /opt/civ-game/logs/combined.log | grep -E "(401|403|429|security|auth)"

# Game activity monitoring
tail -f /opt/civ-game/logs/combined.log | grep -E "(game_created|game_started|player_joined)"

# Log aggregation with systemd
journalctl -u civ-game-server -f --since "1 hour ago"
```

### Database Monitoring

#### PostgreSQL Performance Monitoring
```sql
-- Active connections and queries
SELECT 
  client_addr,
  state,
  query_start,
  query
FROM pg_stat_activity 
WHERE datname = 'civgame' 
  AND state = 'active';

-- Database size and growth
SELECT 
  pg_size_pretty(pg_database_size('civgame')) AS size,
  (SELECT count(*) FROM games) AS total_games,
  (SELECT count(*) FROM players) AS total_players;

-- Slow query monitoring
SELECT 
  calls,
  total_time,
  mean_time,
  query
FROM pg_stat_statements 
WHERE mean_time > 100  -- Queries slower than 100ms
ORDER BY mean_time DESC;

-- Lock monitoring
SELECT 
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

#### Redis Monitoring
```bash
# Connection and memory stats  
redis-cli info | grep -E "(connected_clients|used_memory|keyspace)"

# Real-time monitoring
redis-cli monitor

# Key analysis
redis-cli --scan | head -20  # Sample keys
redis-cli info keyspace      # Database statistics
```

### Alerting & Notifications

#### Basic Alert Scripts
```bash
#!/bin/bash
# /opt/civ-game/scripts/health-check.sh

HEALTH_URL="https://yourdomain.com/health"
WEBHOOK_URL="your-slack-webhook-or-email-service"

# Health check
if ! curl -f -s "$HEALTH_URL" > /dev/null; then
  echo "ALERT: Health check failed for $HEALTH_URL" | \
    curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"🚨 Civilization Game Server Down"}' \
    "$WEBHOOK_URL"
fi

# Database check  
if ! PGPASSWORD="$DB_PASSWORD" psql -h localhost -U civgame -d civgame -c "SELECT 1;" > /dev/null 2>&1; then
  echo "ALERT: Database connection failed" | \
    curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"🚨 Database Connection Failed"}' \
    "$WEBHOOK_URL"
fi

# Disk space check
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
  echo "ALERT: Disk usage is ${DISK_USAGE}%" | \
    curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"⚠️ High Disk Usage: ${DISK_USAGE}%\"}" \
    "$WEBHOOK_URL"
fi
```

#### Crontab Configuration
```bash
# Add to crontab (crontab -e)
*/5 * * * * /opt/civ-game/scripts/health-check.sh    # Every 5 minutes
0 2 * * * /opt/civ-game/scripts/daily-report.sh      # Daily report at 2 AM
0 0 * * 0 /opt/civ-game/scripts/weekly-maintenance.sh # Weekly maintenance
```

## 🔧 Maintenance Procedures

### Regular Maintenance Tasks

#### Daily Maintenance
```bash
#!/bin/bash
# /opt/civ-game/scripts/daily-maintenance.sh

echo "=== Daily Maintenance Report $(date) ==="

# Health check
echo "🏥 Health Status:"
curl -s https://yourdomain.com/health | jq .

# Game statistics
echo "🎮 Game Statistics:"
curl -s https://yourdomain.com/api/status | jq .

# Error count (last 24 hours)
echo "❌ Error Count (24h):"
grep -c "ERROR\|FATAL" /opt/civ-game/logs/error.log || echo "0"

# Disk usage
echo "💾 Disk Usage:"
df -h /

# Memory usage
echo "🧠 Memory Usage:"
free -h

# Database size
echo "🗄️ Database Size:"
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U civgame -d civgame -c "
  SELECT pg_size_pretty(pg_database_size('civgame')) as database_size;"

# Log rotation (if needed)
find /opt/civ-game/logs -name "*.log" -size +10M -exec logrotate {} \;
```

#### Weekly Maintenance
```bash
#!/bin/bash
# /opt/civ-game/scripts/weekly-maintenance.sh

echo "=== Weekly Maintenance Report $(date) ==="

# Update system packages
sudo apt update && sudo apt list --upgradable

# NPM security audit
cd /opt/civ-game
npm audit

# Database maintenance
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U civgame -d civgame -c "VACUUM ANALYZE;"

# Clear old logs (older than 30 days)
find /opt/civ-game/logs -name "*.log" -mtime +30 -delete

# PM2 restart (zero-downtime)
pm2 reload ecosystem.config.js

# Backup creation
pg_dump civgame > /backups/civgame_$(date +%Y%m%d).sql
```

### Database Maintenance

#### Backup Procedures
```bash
# Full database backup
pg_dump civgame > civgame_backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup  
pg_dump civgame | gzip > civgame_backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Schema-only backup
pg_dump --schema-only civgame > civgame_schema_$(date +%Y%m%d).sql

# Automated backup with retention
#!/bin/bash
BACKUP_DIR="/backups"
RETENTION_DAYS=30

# Create backup
pg_dump civgame | gzip > "$BACKUP_DIR/civgame_$(date +%Y%m%d_%H%M%S).sql.gz"

# Remove old backups
find "$BACKUP_DIR" -name "civgame_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Upload to cloud storage (optional)
# aws s3 cp "$BACKUP_DIR/civgame_$(date +%Y%m%d_%H%M%S).sql.gz" s3://your-backup-bucket/
```

#### Restore Procedures
```bash
# Restore from backup
dropdb civgame && createdb civgame
psql civgame < civgame_backup_20231201_120000.sql

# Restore from compressed backup
gunzip -c civgame_backup_20231201_120000.sql.gz | psql civgame

# Point-in-time recovery (if using WAL archiving)
pg_basebackup -h localhost -D /tmp/backup -U postgres -W
```

### Scaling & Performance Optimization

#### Horizontal Scaling
```bash
# Scale backend instances with PM2
pm2 scale civ-game-server 4  # Scale to 4 instances

# Docker scaling
docker-compose -f docker-compose.production.yml up -d --scale backend=4

# Load balancer configuration (Nginx)
upstream backend_servers {
    least_conn;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3002 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3003 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3004 max_fails=3 fail_timeout=30s;
}
```

#### Performance Tuning
```javascript
// Node.js performance optimizations
process.env.UV_THREADPOOL_SIZE = 128;  // Increase thread pool size
app.use(compression());                 // Enable gzip compression

// Database connection pooling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,              // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis connection optimization  
const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableOfflineQueue: false,
});
```

### Security Maintenance

#### Security Auditing
```bash
# NPM security audit
npm audit
npm audit fix

# Check for outdated packages
npm outdated

# SSL certificate monitoring
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -text -noout | grep "Not After"

# Security headers verification
curl -I https://yourdomain.com | grep -E "(Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options)"
```

#### Access Log Analysis
```bash
# Failed authentication attempts
grep "401\|403" /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -nr | head -20

# Rate limiting triggers
grep "429" /var/log/nginx/access.log | tail -50

# Suspicious request patterns
grep -E "(\.\.|\|\||<script|DROP|SELECT.*FROM)" /var/log/nginx/access.log
```

## 🚨 Incident Response

### Emergency Procedures

#### Service Down Response
```bash
# 1. Immediate assessment
curl https://yourdomain.com/health  # Check if completely down
systemctl status nginx              # Check reverse proxy
pm2 status                         # Check application processes

# 2. Quick restart
pm2 restart civ-game-server        # Restart application
systemctl restart nginx            # Restart reverse proxy
systemctl restart postgresql       # Restart database (if needed)

# 3. Log analysis
tail -100 /opt/civ-game/logs/error.log     # Recent errors
tail -100 /var/log/nginx/error.log         # Nginx errors
journalctl -u civ-game-server --since "10 minutes ago"  # System logs
```

#### Database Emergency Response
```bash
# Database connection issues
pg_isready -h localhost -p 5432    # Check if PostgreSQL is running
systemctl status postgresql        # System status

# Database corruption recovery
sudo -u postgres pg_resetwal /var/lib/postgresql/14/main/  # Reset WAL (last resort)

# High CPU/Memory usage
SELECT * FROM pg_stat_activity WHERE state = 'active';  # Active queries
SELECT pg_cancel_backend(PID);                          # Cancel problematic query
```

#### Security Incident Response
```bash
# Suspected breach or attack
# 1. Immediate containment
iptables -A INPUT -s SUSPICIOUS_IP -j DROP    # Block malicious IP

# 2. Change security credentials
# Generate new JWT secrets
export NEW_JWT_SECRET=$(openssl rand -base64 64)
# Update environment and restart

# 3. Audit and investigation  
grep "SUSPICIOUS_IP" /var/log/nginx/access.log  # Review attack patterns
grep "401\|403\|429" /opt/civ-game/logs/combined.log  # Failed access attempts

# 4. Force logout all users (invalidate all JWTs)
# Restart application with new JWT secret
```

### Recovery Procedures

#### Full System Recovery
```bash
# Complete disaster recovery procedure

# 1. Fresh server setup
# Follow deployment procedure

# 2. Restore database from backup
gunzip -c /backups/civgame_latest.sql.gz | psql civgame

# 3. Restore application code
git clone <repository> /opt/civ-game
cd /opt/civ-game
npm install
npm run build

# 4. Configure environment
cp server/.env.backup server/.env  # Restore environment config

# 5. Start services
pm2 start ecosystem.config.js
systemctl restart nginx

# 6. Verify recovery
curl https://yourdomain.com/health
npm test  # Run smoke tests
```

## 📊 Performance Baselines

### Expected Performance Metrics

**Response Time Targets:**
- Health check: <50ms
- API endpoints: <200ms
- WebSocket connection: <100ms
- Game action processing: <100ms
- Database queries: <50ms

**Throughput Targets:**
- Concurrent users: 1000+
- Concurrent games: 100+
- Requests per second: 1000+
- WebSocket messages/sec: 5000+

**Resource Usage Limits:**
- Memory usage: <500MB per instance
- CPU usage: <70% average
- Disk usage: <80%
- Database connections: <50% of pool

### Performance Monitoring
```bash
# Real-time performance monitoring
watch -n 1 'curl -s -w "%{time_total}\n" -o /dev/null https://yourdomain.com/health'

# Load testing
npm install -g artillery
artillery run load-test.yml  # Load test configuration

# Database performance
SELECT 
  schemaname,
  tablename,
  n_tup_ins + n_tup_upd + n_tup_del as total_writes,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes
FROM pg_stat_user_tables 
ORDER BY total_writes DESC;
```

---

This operational guide provides comprehensive procedures for production deployment, monitoring, and maintenance. Follow these procedures to ensure reliable, secure, and performant operation of the Civilization Game.