# Monitoring Templates - Civilization Game

Ready-to-use monitoring configurations, alerting templates, and operational dashboards for the multiplayer civilization game.

## 📊 Health Check Scripts

### Basic Health Monitor
```bash
#!/bin/bash
# health-monitor.sh - Basic health monitoring script

# Configuration
API_URL="https://your-domain.com"
WEBHOOK_URL="your-slack-webhook-url"
LOG_FILE="/var/log/civ-game/health-monitor.log"
THRESHOLD_RESPONSE_TIME=5000  # 5 seconds

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

send_alert() {
    local message="$1"
    log "ALERT: $message"
    
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🚨 CIV GAME ALERT: $message\"}" \
        "$WEBHOOK_URL" 2>/dev/null
}

check_health() {
    local start_time=$(date +%s%3N)
    local response=$(curl -s -w "%{http_code},%{time_total}" -o /dev/null "$API_URL/health")
    local end_time=$(date +%s%3N)
    
    local http_code=$(echo "$response" | cut -d',' -f1)
    local response_time=$(echo "$response" | cut -d',' -f2)
    local response_time_ms=$(echo "$response_time * 1000" | bc)
    
    if [ "$http_code" != "200" ]; then
        send_alert "Health check failed - HTTP $http_code"
        return 1
    fi
    
    if (( $(echo "$response_time_ms > $THRESHOLD_RESPONSE_TIME" | bc -l) )); then
        send_alert "Slow response time: ${response_time_ms}ms (threshold: ${THRESHOLD_RESPONSE_TIME}ms)"
    fi
    
    log "Health check OK - HTTP $http_code, ${response_time_ms}ms"
    return 0
}

check_database() {
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        send_alert "Database connection failed"
        return 1
    fi
    
    log "Database check OK"
    return 0
}

check_redis() {
    if [ -n "$REDIS_URL" ]; then
        if ! redis-cli -u "$REDIS_URL" ping >/dev/null 2>&1; then
            send_alert "Redis connection failed"
            return 1
        fi
        log "Redis check OK"
    fi
    return 0
}

check_disk_space() {
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$usage" -gt 80 ]; then
        send_alert "High disk usage: ${usage}%"
        return 1
    fi
    
    log "Disk space OK: ${usage}%"
    return 0
}

check_memory() {
    local memory_usage=$(free | awk '/^Mem:/ {printf "%.0f", $3/$2 * 100.0}')
    if [ "$memory_usage" -gt 90 ]; then
        send_alert "High memory usage: ${memory_usage}%"
        return 1
    fi
    
    log "Memory usage OK: ${memory_usage}%"
    return 0
}

# Main execution
log "Starting health checks..."
check_health
check_database  
check_redis
check_disk_space
check_memory
log "Health checks completed"
```

### Advanced Performance Monitor
```bash
#!/bin/bash
# performance-monitor.sh - Advanced performance monitoring

# Configuration
API_URL="https://your-domain.com"
WEBHOOK_URL="your-slack-webhook-url"
LOG_FILE="/var/log/civ-game/performance-monitor.log"
METRICS_FILE="/var/log/civ-game/metrics.json"

log_metric() {
    local metric_name="$1"
    local metric_value="$2"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    
    echo "{\"timestamp\":\"$timestamp\",\"metric\":\"$metric_name\",\"value\":$metric_value}" >> "$METRICS_FILE"
}

check_api_performance() {
    local endpoints=("/health" "/api/status" "/api/games")
    
    for endpoint in "${endpoints[@]}"; do
        local start_time=$(date +%s%3N)
        local response=$(curl -s -w "%{http_code},%{time_total}" -o /dev/null "$API_URL$endpoint")
        local end_time=$(date +%s%3N)
        
        local http_code=$(echo "$response" | cut -d',' -f1)
        local response_time=$(echo "$response" | cut -d',' -f2)
        local response_time_ms=$(echo "$response_time * 1000" | bc)
        
        log_metric "api_response_time_${endpoint//\//_}" "$response_time_ms"
        log_metric "api_http_code_${endpoint//\//_}" "$http_code"
        
        echo "[$(date)] $endpoint: ${response_time_ms}ms (HTTP $http_code)" >> "$LOG_FILE"
    done
}

check_websocket_performance() {
    # WebSocket connection test
    local websocket_test=$(node -e "
        const io = require('socket.io-client');
        const start = Date.now();
        const socket = io('$API_URL');
        
        socket.on('connect', () => {
            const connectTime = Date.now() - start;
            console.log(connectTime);
            socket.disconnect();
        });
        
        socket.on('connect_error', () => {
            console.log(-1);
        });
        
        setTimeout(() => {
            console.log(-1);
            process.exit(1);
        }, 5000);
    " 2>/dev/null)
    
    log_metric "websocket_connect_time" "$websocket_test"
    echo "[$(date)] WebSocket connect: ${websocket_test}ms" >> "$LOG_FILE"
}

check_system_metrics() {
    # CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    log_metric "cpu_usage" "$cpu_usage"
    
    # Memory usage
    local memory_usage=$(free | awk '/^Mem:/ {printf "%.1f", $3/$2 * 100.0}')
    log_metric "memory_usage" "$memory_usage"
    
    # Load average
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    log_metric "load_average" "$load_avg"
    
    # Network connections
    local active_connections=$(netstat -an | grep :3001 | grep ESTABLISHED | wc -l)
    log_metric "active_connections" "$active_connections"
    
    echo "[$(date)] CPU: ${cpu_usage}%, Memory: ${memory_usage}%, Load: ${load_avg}, Connections: ${active_connections}" >> "$LOG_FILE"
}

# Main execution
check_api_performance
check_websocket_performance  
check_system_metrics

# Rotate metrics file if it gets too large (>10MB)
if [ -f "$METRICS_FILE" ] && [ $(stat -f%z "$METRICS_FILE" 2>/dev/null || stat -c%s "$METRICS_FILE" 2>/dev/null) -gt 10485760 ]; then
    mv "$METRICS_FILE" "${METRICS_FILE}.$(date +%Y%m%d_%H%M%S)"
    touch "$METRICS_FILE"
fi
```

## 🔔 Alerting Configurations

### Slack Webhook Integration
```bash
#!/bin/bash
# slack-alerts.sh - Slack integration for alerts

SLACK_WEBHOOK_URL="your-webhook-url"
SLACK_CHANNEL="#civ-game-alerts"
SLACK_USERNAME="CivGame Monitor"

send_slack_alert() {
    local severity="$1"  # INFO, WARNING, CRITICAL
    local title="$2"
    local message="$3"
    local color="good"
    
    case "$severity" in
        "WARNING") color="warning" ;;
        "CRITICAL") color="danger" ;;
    esac
    
    local payload=$(cat <<EOF
{
    "channel": "$SLACK_CHANNEL",
    "username": "$SLACK_USERNAME",
    "attachments": [
        {
            "color": "$color",
            "fields": [
                {
                    "title": "$title",
                    "value": "$message",
                    "short": false
                },
                {
                    "title": "Server",
                    "value": "$(hostname)",
                    "short": true
                },
                {
                    "title": "Timestamp",
                    "value": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
                    "short": true
                }
            ]
        }
    ]
}
EOF
)
    
    curl -X POST -H 'Content-type: application/json' \
        --data "$payload" \
        "$SLACK_WEBHOOK_URL"
}

# Usage examples:
# send_slack_alert "INFO" "Service Started" "Civilization Game server started successfully"
# send_slack_alert "WARNING" "High Memory Usage" "Memory usage is at 85%"
# send_slack_alert "CRITICAL" "Service Down" "Health check failed - server not responding"
```

### Email Alerts
```bash
#!/bin/bash
# email-alerts.sh - Email notification system

EMAIL_TO="admin@yourdomain.com"
EMAIL_FROM="noreply@yourdomain.com"
SMTP_SERVER="localhost"

send_email_alert() {
    local subject="$1"
    local body="$2"
    local priority="$3"  # normal, high, urgent
    
    local email_content=$(cat <<EOF
To: $EMAIL_TO
From: $EMAIL_FROM
Subject: [CIV-GAME] $subject
X-Priority: $(case "$priority" in "high") echo "2";; "urgent") echo "1";; *) echo "3";; esac)

Server: $(hostname)
Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Environment: $NODE_ENV

$body

---
This is an automated message from the Civilization Game monitoring system.
EOF
)
    
    echo "$email_content" | sendmail "$EMAIL_TO"
}

# Usage:
# send_email_alert "Service Down" "Health check failed for 5 minutes" "urgent"
# send_email_alert "High Resource Usage" "CPU usage above 90% for 10 minutes" "high"
```

## 📈 Grafana Dashboard Configuration

### Grafana JSON Dashboard
```json
{
  "dashboard": {
    "id": null,
    "title": "Civilization Game - Production Dashboard",
    "tags": ["civilization", "game", "production"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "API Response Times",
        "type": "graph",
        "targets": [
          {
            "expr": "api_response_time_health",
            "legendFormat": "Health Check"
          },
          {
            "expr": "api_response_time_api_status",
            "legendFormat": "API Status"
          }
        ],
        "yAxes": [
          {
            "label": "Response Time (ms)",
            "min": 0
          }
        ],
        "alert": {
          "conditions": [
            {
              "evaluator": {
                "params": [1000]
              },
              "operator": {
                "type": "gt"
              },
              "query": {
                "params": ["A", "5m", "now"]
              },
              "reducer": {
                "params": [],
                "type": "avg"
              },
              "type": "query"
            }
          ],
          "executionErrorState": "alerting",
          "for": "2m",
          "frequency": "30s",
          "handler": 1,
          "name": "High API Response Time",
          "noDataState": "no_data",
          "notifications": []
        }
      },
      {
        "id": 2,
        "title": "Active Games & Players",
        "type": "stat",
        "targets": [
          {
            "expr": "active_games",
            "legendFormat": "Active Games"
          },
          {
            "expr": "active_players", 
            "legendFormat": "Active Players"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "unit": "short"
          }
        }
      },
      {
        "id": 3,
        "title": "System Resources",
        "type": "graph",
        "targets": [
          {
            "expr": "cpu_usage",
            "legendFormat": "CPU Usage (%)"
          },
          {
            "expr": "memory_usage",
            "legendFormat": "Memory Usage (%)"
          }
        ],
        "yAxes": [
          {
            "label": "Percentage",
            "min": 0,
            "max": 100
          }
        ],
        "thresholds": [
          {
            "value": 80,
            "colorMode": "critical",
            "op": "gt"
          },
          {
            "value": 90,
            "colorMode": "critical",
            "op": "gt"
          }
        ]
      },
      {
        "id": 4,
        "title": "WebSocket Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "websocket_connections",
            "legendFormat": "Active Connections"
          },
          {
            "expr": "websocket_connect_time",
            "legendFormat": "Connect Time (ms)"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
```

### Prometheus Configuration
```yaml
# prometheus.yml configuration for Civilization Game monitoring
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "civ-game.rules.yml"

scrape_configs:
  - job_name: 'civ-game-api'
    metrics_path: '/metrics'
    scrape_interval: 10s
    static_configs:
      - targets: ['localhost:3001']
    
  - job_name: 'civ-game-health'
    metrics_path: '/health'
    scrape_interval: 30s
    static_configs:
      - targets: ['localhost:3001']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['localhost:9187']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - "localhost:9093"
```

### Prometheus Alerting Rules
```yaml
# civ-game.rules.yml
groups:
  - name: civ-game.rules
    rules:
      # Service Down Alert
      - alert: ServiceDown
        expr: up{job="civ-game-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Civilization Game service is down"
          description: "The Civilization Game API service has been down for more than 1 minute."
      
      # High Response Time
      - alert: HighResponseTime
        expr: api_response_time_health > 1000
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High API response time"
          description: "API response time is {{ $value }}ms for more than 2 minutes."
      
      # High Memory Usage
      - alert: HighMemoryUsage
        expr: memory_usage > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}% for more than 5 minutes."
      
      # Database Connection Issues
      - alert: DatabaseConnectionFailed
        expr: database_connection_status == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Database connection failed"
          description: "Cannot connect to the database."
      
      # Too Many Active Games
      - alert: TooManyActiveGames
        expr: active_games > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High number of active games"
          description: "There are {{ $value }} active games (threshold: 80)."
```

## 📱 Status Page Configuration

### Simple Status Page (HTML)
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Civilization Game - Status</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background-color: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .status { padding: 15px; margin: 10px 0; border-radius: 5px; font-weight: bold; }
        .operational { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .degraded { background-color: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        .down { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .updated { color: #666; font-size: 12px; text-align: center; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏛️ Civilization Game Status</h1>
        
        <div class="status operational" id="overall-status">
            🟢 All Systems Operational
        </div>
        
        <h2>Service Status</h2>
        <div class="metric">
            <span>🌐 Game API</span>
            <span id="api-status">🟢 Operational</span>
        </div>
        <div class="metric">
            <span>🔌 WebSocket Server</span>
            <span id="websocket-status">🟢 Operational</span>
        </div>
        <div class="metric">
            <span>🗄️ Database</span>
            <span id="database-status">🟢 Operational</span>
        </div>
        <div class="metric">
            <span>⚡ Redis Cache</span>
            <span id="redis-status">🟢 Operational</span>
        </div>
        
        <h2>Current Metrics</h2>
        <div class="metric">
            <span>Active Games</span>
            <span id="active-games">Loading...</span>
        </div>
        <div class="metric">
            <span>Online Players</span>
            <span id="online-players">Loading...</span>
        </div>
        <div class="metric">
            <span>Response Time</span>
            <span id="response-time">Loading...</span>
        </div>
        <div class="metric">
            <span>Uptime</span>
            <span id="uptime">Loading...</span>
        </div>
        
        <div class="updated">
            Last updated: <span id="last-updated">Never</span>
        </div>
    </div>
    
    <script>
        const API_BASE = 'https://your-domain.com';
        
        async function updateStatus() {
            try {
                const start = Date.now();
                const healthResponse = await fetch(`${API_BASE}/health`);
                const responseTime = Date.now() - start;
                
                if (healthResponse.ok) {
                    const health = await healthResponse.json();
                    
                    document.getElementById('response-time').textContent = `${responseTime}ms`;
                    document.getElementById('uptime').textContent = `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m`;
                    
                    // Get game status
                    const statusResponse = await fetch(`${API_BASE}/api/status`);
                    if (statusResponse.ok) {
                        const status = await statusResponse.json();
                        document.getElementById('active-games').textContent = status.activeGames || 0;
                        document.getElementById('online-players').textContent = status.players || 0;
                    }
                    
                    document.getElementById('last-updated').textContent = new Date().toLocaleString();
                } else {
                    document.getElementById('overall-status').className = 'status down';
                    document.getElementById('overall-status').textContent = '🔴 Service Degraded';
                    document.getElementById('api-status').textContent = '🔴 Down';
                }
            } catch (error) {
                document.getElementById('overall-status').className = 'status down';
                document.getElementById('overall-status').textContent = '🔴 Service Down';
                document.getElementById('api-status').textContent = '🔴 Connection Failed';
            }
        }
        
        // Update status immediately and then every 30 seconds
        updateStatus();
        setInterval(updateStatus, 30000);
    </script>
</body>
</html>
```

## 🛠️ Automation Scripts

### Crontab Configuration
```bash
# /etc/cron.d/civ-game-monitoring
# Comprehensive monitoring schedule for Civilization Game

# Every 5 minutes - Basic health check
*/5 * * * * root /opt/civ-game/scripts/health-monitor.sh

# Every minute - Performance monitoring (production only)
* * * * * root /opt/civ-game/scripts/performance-monitor.sh

# Every 15 minutes - Extended system checks
*/15 * * * * root /opt/civ-game/scripts/system-check.sh

# Every hour - Log analysis and cleanup
0 * * * * root /opt/civ-game/scripts/log-analysis.sh

# Daily at 2 AM - Maintenance and reports
0 2 * * * root /opt/civ-game/scripts/daily-maintenance.sh

# Weekly on Sunday at 3 AM - Full system maintenance
0 3 * * 0 root /opt/civ-game/scripts/weekly-maintenance.sh
```

### Log Rotation Configuration
```bash
# /etc/logrotate.d/civ-game
/var/log/civ-game/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 root root
    postrotate
        systemctl reload civ-game-server || true
    endscript
}

/opt/civ-game/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 0644 civgame civgame
    postrotate
        pm2 reload ecosystem.config.js || true
    endscript
}
```

## 📋 Monitoring Checklist

### Daily Operations Checklist
```markdown
## Daily CivGame Operations Checklist

**Morning Check (Start of Business Day)**
- [ ] Verify service is running (`curl https://domain.com/health`)
- [ ] Check overnight alerts and logs
- [ ] Review active games count vs. historical average
- [ ] Verify database connectivity and performance
- [ ] Check disk space and system resources
- [ ] Review backup completion status

**Business Hours Monitoring**
- [ ] Monitor response times (<200ms average)
- [ ] Track active player count and engagement
- [ ] Watch for error rate spikes (>1% error rate)
- [ ] Monitor memory usage trends
- [ ] Check WebSocket connection stability

**End of Day Review**
- [ ] Review day's performance metrics
- [ ] Check error logs for patterns
- [ ] Verify automated backups completed
- [ ] Update on-call schedule if needed
- [ ] Document any incidents or unusual patterns

**Weekly Tasks**
- [ ] Review and update alert thresholds
- [ ] Analyze performance trends
- [ ] Update documentation
- [ ] Review security logs
- [ ] Plan capacity requirements
```

This comprehensive monitoring setup provides automated monitoring, alerting, and operational visibility for the Civilization Game in production environments.