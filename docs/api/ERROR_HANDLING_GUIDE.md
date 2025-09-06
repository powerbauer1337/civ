# Error Handling Guide

## Overview

The Civilization Game API provides comprehensive error handling with standardized error responses, status codes, and error types. This guide covers all error scenarios and how to handle them effectively.

## HTTP Status Codes

### Success Codes (2xx)
- `200 OK` - Request successful
- `201 Created` - Resource created successfully (user registration, game creation)

### Client Error Codes (4xx)
- `400 Bad Request` - Invalid request format or validation failed
- `401 Unauthorized` - Authentication required or token invalid/expired
- `403 Forbidden` - Valid authentication but insufficient permissions
- `404 Not Found` - Resource not found (game, user, save file)
- `409 Conflict` - Resource already exists (duplicate username/email)
- `422 Unprocessable Entity` - Valid format but business logic validation failed
- `429 Too Many Requests` - Rate limit exceeded

### Server Error Codes (5xx)
- `500 Internal Server Error` - Unexpected server error
- `502 Bad Gateway` - Upstream service error
- `503 Service Unavailable` - Server temporarily unavailable

## Error Response Format

### REST API Errors

All REST API errors follow a consistent format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE_CONSTANT",
  "details": [
    {
      "field": "fieldName",
      "message": "Specific field error",
      "code": "validation_code"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_123456789"
}
```

### WebSocket Errors

WebSocket errors are sent via the `error` event:

```json
{
  "message": "Error description",
  "type": "error_type",
  "code": "ERROR_CODE",
  "context": {
    "gameId": "game_123",
    "action": "failed_action"
  }
}
```

## Authentication Errors

### JWT Token Errors

#### Missing Token
```json
{
  "error": "Access token required",
  "code": "MISSING_TOKEN"
}
```
**Status Code**: `401`
**Description**: No Authorization header provided
**Solution**: Include `Authorization: Bearer <token>` header

#### Invalid Token
```json
{
  "error": "Invalid or malformed token",
  "code": "INVALID_TOKEN"
}
```
**Status Code**: `403`
**Description**: Token is malformed or corrupted
**Solution**: Re-authenticate to get new token

#### Expired Token
```json
{
  "error": "Token has expired",
  "code": "TOKEN_EXPIRED"
}
```
**Status Code**: `401`
**Description**: JWT token has passed expiration time
**Solution**: Use refresh token to get new access token or re-authenticate

#### Revoked Token
```json
{
  "error": "Token has been revoked",
  "code": "TOKEN_REVOKED"
}
```
**Status Code**: `401`
**Description**: Token was manually blacklisted (logout, security breach)
**Solution**: Re-authenticate with credentials

#### User Not Found
```json
{
  "error": "User not found",
  "code": "USER_NOT_FOUND"
}
```
**Status Code**: `404`
**Description**: Token valid but user account no longer exists
**Solution**: Re-register or contact support

### Login/Registration Errors

#### Invalid Credentials
```json
{
  "error": "Invalid credentials",
  "code": "INVALID_CREDENTIALS"
}
```
**Status Code**: `401`
**Context**: Login attempt with wrong username/password
**Solution**: Verify credentials or reset password

#### User Already Exists
```json
{
  "error": "Username or email already exists",
  "code": "USER_ALREADY_EXISTS"
}
```
**Status Code**: `409`
**Context**: Registration with duplicate username/email
**Solution**: Choose different username/email

#### Weak Password
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "password",
      "message": "Password must contain at least one uppercase, lowercase, number, and special character",
      "code": "invalid_string"
    }
  ]
}
```
**Status Code**: `400`
**Context**: Password doesn't meet complexity requirements
**Solution**: Use stronger password matching requirements

## Validation Errors

### Request Validation

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "body.email",
      "message": "Invalid email format",
      "code": "invalid_string"
    },
    {
      "field": "body.username",
      "message": "Username must be at least 3 characters",
      "code": "too_small"
    }
  ]
}
```
**Status Code**: `400`
**Description**: Input validation failed according to schema rules
**Solution**: Fix input data according to validation requirements

### Game Configuration Validation

```json
{
  "valid": false,
  "errors": [
    "Map width must be between 10 and 100",
    "Maximum players must be between 2 and 8",
    "At least one victory condition is required"
  ],
  "warnings": [
    "Large maps may impact performance",
    "Very short turn time limits may frustrate players"
  ]
}
```
**Status Code**: `200` (validation result, not error)
**Context**: Game configuration validation endpoint
**Solution**: Adjust configuration according to error messages

## Game-Specific Errors

### Game Not Found
```json
{
  "error": "Game not found",
  "code": "GAME_NOT_FOUND"
}
```
**Status Code**: `404`
**Context**: Attempting to access non-existent game
**Solution**: Verify game ID or check if game was deleted

### Game Full
```json
{
  "message": "Game is full",
  "type": "join_game_error",
  "code": "GAME_FULL"
}
```
**Context**: WebSocket - trying to join game at capacity
**Solution**: Find different game or wait for slot to open

### Invalid Game Action
```json
{
  "action": "move_unit",
  "success": false,
  "error": "Invalid move: unit cannot reach that position",
  "code": "INVALID_MOVE"
}
```
**Context**: WebSocket - invalid game action attempted
**Solution**: Check game rules and unit capabilities

### Not Player's Turn
```json
{
  "action": "move_unit",
  "success": false,
  "error": "Not your turn",
  "code": "NOT_PLAYERS_TURN"
}
```
**Context**: WebSocket - action attempted out of turn
**Solution**: Wait for your turn or check turn order

### Insufficient Resources
```json
{
  "action": "build_unit",
  "success": false,
  "error": "Insufficient gold to build unit",
  "code": "INSUFFICIENT_RESOURCES"
}
```
**Context**: WebSocket - cannot afford game action
**Solution**: Gather more resources before attempting action

## Rate Limiting Errors

### Authentication Rate Limit
```json
{
  "error": "Too many authentication attempts",
  "message": "Please wait before trying again",
  "retryAfter": 300
}
```
**Status Code**: `429`
**Headers**:
- `Retry-After: 300`
- `X-RateLimit-Limit: 5`
- `X-RateLimit-Remaining: 0`
- `X-RateLimit-Reset: 2024-01-15T10:35:00Z`

**Context**: Too many login/register attempts
**Solution**: Wait for `retryAfter` seconds before retry

### API Rate Limit
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests from this IP",
  "retryAfter": 60
}
```
**Status Code**: `429`
**Context**: General API usage exceeded limits
**Solution**: Implement exponential backoff, cache responses

### Strict Rate Limit
```json
{
  "error": "Strict rate limit exceeded",
  "message": "This endpoint has strict limits for security",
  "retryAfter": 1800
}
```
**Status Code**: `429`
**Context**: Critical endpoints (password reset, etc.)
**Solution**: Wait extended period before retry

## Save/Load Errors

### Save Not Found
```json
{
  "message": "Save not found",
  "type": "load_error"
}
```
**Context**: WebSocket - attempting to load non-existent save
**Solution**: Verify save ID or check if save was deleted

### Insufficient Storage
```json
{
  "message": "Save quota exceeded",
  "type": "save_error"
}
```
**Context**: WebSocket - user has too many saves
**Solution**: Delete old saves or upgrade account

### Corrupted Save File
```json
{
  "message": "Save file corrupted or incompatible",
  "type": "load_error"
}
```
**Context**: WebSocket - save file cannot be loaded
**Solution**: Try different save file or report bug

### Access Denied
```json
{
  "message": "Access denied to this save",
  "type": "load_error"
}
```
**Context**: WebSocket - attempting to load another user's save
**Solution**: Use only your own save files

## Network Errors

### Connection Timeout
```json
{
  "error": "Request timeout",
  "code": "TIMEOUT"
}
```
**Status Code**: `504`
**Context**: Request took longer than configured timeout
**Solution**: Retry with exponential backoff

### WebSocket Connection Errors

#### Connection Failed
```javascript
socket.on('connect_error', (error) => {
  console.log('Connection failed:', error.message);
  // error.type can be: "TransportError", "ConnectTimeoutError", etc.
});
```
**Context**: Initial WebSocket connection failed
**Solution**: Check network connectivity, retry with backoff

#### Disconnected
```javascript
socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server initiated disconnect (maintenance, etc.)
  } else if (reason === 'io client disconnect') {
    // Client initiated disconnect
  } else if (reason === 'ping timeout') {
    // Connection lost due to network issues
  }
});
```
**Solution**: Implement automatic reconnection with state recovery

## Error Handling Best Practices

### Client-Side Error Handling

```javascript
// REST API Error Handling
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new APIError(errorData, response.status);
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      handleAPIError(error);
    } else {
      handleNetworkError(error);
    }
    throw error;
  }
}

class APIError extends Error {
  constructor(data, status) {
    super(data.error || 'API Error');
    this.data = data;
    this.status = status;
    this.code = data.code;
  }
}

function handleAPIError(error) {
  switch (error.code) {
    case 'TOKEN_EXPIRED':
      refreshTokenAndRetry();
      break;
    case 'VALIDATION_FAILED':
      displayValidationErrors(error.data.details);
      break;
    case 'RATE_LIMIT_EXCEEDED':
      scheduleRetry(error.data.retryAfter);
      break;
    default:
      showErrorMessage(error.message);
  }
}
```

### WebSocket Error Handling

```javascript
// WebSocket Error Handling
socket.on('error', (error) => {
  switch (error.type) {
    case 'join_game_error':
      handleGameJoinError(error);
      break;
    case 'game_action_error':
      handleActionError(error);
      break;
    case 'save_error':
      handleSaveError(error);
      break;
    default:
      showGenericError(error.message);
  }
});

socket.on('action_acknowledged', (response) => {
  if (!response.success) {
    handleActionFailure(response);
  }
});

function handleActionFailure(response) {
  switch (response.error) {
    case 'Not your turn':
      showTurnWarning();
      break;
    case 'Invalid move':
      highlightInvalidMove();
      break;
    case 'Insufficient resources':
      showResourceRequirement();
      break;
    default:
      showActionError(response.error);
  }
}
```

### Retry Logic

```javascript
// Exponential Backoff Retry
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // Don't retry client errors (4xx) except for rate limiting
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
}

// Rate Limit Aware Retry
async function retryAfterRateLimit(fn, error) {
  const retryAfter = error.data.retryAfter || 60;
  await sleep(retryAfter * 1000);
  return await fn();
}
```

### Token Refresh Handling

```javascript
// Automatic Token Refresh
async function refreshTokenIfNeeded(error) {
  if (error.code === 'TOKEN_EXPIRED') {
    try {
      const refreshToken = getRefreshToken();
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      
      if (response.ok) {
        const data = await response.json();
        setToken(data.accessToken);
        return true; // Retry original request
      }
    } catch (refreshError) {
      // Refresh failed, redirect to login
      redirectToLogin();
    }
  }
  return false;
}
```

## Error Logging and Monitoring

### Client-Side Logging

```javascript
// Error Tracking
function trackError(error, context = {}) {
  console.error('API Error:', {
    message: error.message,
    code: error.code,
    status: error.status,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  });
  
  // Send to error tracking service
  if (window.analytics) {
    window.analytics.track('API Error', {
      error_code: error.code,
      error_message: error.message,
      status_code: error.status
    });
  }
}
```

### Server-Side Error Responses

The server logs all errors internally and returns appropriate responses:

- **Development**: Full error details including stack traces
- **Production**: Sanitized error messages without sensitive information
- **Rate Limiting**: Appropriate headers for client guidance
- **Validation**: Detailed field-level validation feedback

### Error Recovery Strategies

1. **Automatic Retry** - Network errors, timeouts, 5xx errors
2. **User Notification** - 4xx errors requiring user action
3. **Graceful Degradation** - Fallback to cached data or limited functionality
4. **State Recovery** - WebSocket reconnection with state synchronization
5. **Progressive Enhancement** - Core functionality works even if advanced features fail

## Development vs Production

### Development Environment
- Detailed error messages with stack traces
- Relaxed rate limiting for testing
- Debug endpoints available
- Verbose logging

### Production Environment
- Sanitized error messages
- Strict rate limiting
- Security-focused error handling
- Minimal information disclosure

This comprehensive error handling ensures robust client applications and clear debugging information during development while maintaining security in production.