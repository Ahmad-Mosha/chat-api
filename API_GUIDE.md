# Chat API - API Documentation & Testing Guide

## Prerequisites

1. **Database Setup** (using Docker):
   ```bash
   # Start PostgreSQL database
   docker run --name chat-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=chat_api -p 5432:5432 -d postgres:15
   ```

2. **Environment Configuration**:
   Copy `.env.example` to `.env` and update the values:
   ```bash
   cp .env.example .env
   ```

## Quick Start

### Development Setup
```bash
# Install dependencies
npm install

# Start development server
npm run start:dev
```

### Using Docker Compose (Recommended)
```bash
# Start all services (app + database)
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

The API will be available at:
- **Application**: http://localhost:3000
- **Swagger Documentation**: http://localhost:3000/api/docs

## API Testing Examples

### 1. Authentication

#### Register User
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

#### Login User
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "john@example.com",
    "password": "password123"
  }'
```

**Response** (save the token for authenticated requests):
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid-here",
    "username": "john_doe",
    "email": "john@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. User Management

#### Get Current User Profile
```bash
curl -X GET http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Search Users
```bash
curl -X GET "http://localhost:3000/api/v1/users/search?q=john" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Update Profile
```bash
curl -X PUT http://localhost:3000/api/v1/users/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "firstName": "Johnny",
    "lastName": "Doe"
  }'
```

### 3. Chat Operations

#### Create Direct Conversation
```bash
curl -X POST http://localhost:3000/api/v1/chat/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "direct",
    "participantIds": ["OTHER_USER_UUID"]
  }'
```

#### Create Group Conversation
```bash
curl -X POST http://localhost:3000/api/v1/chat/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Team Chat",
    "type": "group",
    "description": "Project discussion",
    "participantIds": ["USER_UUID_1", "USER_UUID_2"]
  }'
```

#### Send Message
```bash
curl -X POST http://localhost:3000/api/v1/chat/conversations/CONVERSATION_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "content": "Hello, how are you?",
    "type": "text"
  }'
```

#### Get Messages
```bash
curl -X GET "http://localhost:3000/api/v1/chat/conversations/CONVERSATION_ID/messages?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### React to Message
```bash
curl -X POST http://localhost:3000/api/v1/chat/messages/MESSAGE_ID/reactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "emoji": "👍"
  }'
```

### 4. File Upload

#### Upload File
```bash
curl -X POST http://localhost:3000/api/v1/files/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/your/file.jpg"
```

## WebSocket Connection

### JavaScript/Node.js Example
```javascript
const io = require('socket.io-client');

// Connect to chat namespace
const socket = io('http://localhost:3000/chat', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});

// Join a conversation
socket.emit('join:conversation', { conversationId: 'CONVERSATION_ID' });

// Send a message
socket.emit('send:message', {
  conversationId: 'CONVERSATION_ID',
  content: 'Hello from WebSocket!',
  type: 'text'
});

// Listen for new messages
socket.on('message:new', (data) => {
  console.log('New message:', data.message);
});

// Listen for typing indicators
socket.on('typing:start', (data) => {
  console.log(`${data.user.username} is typing...`);
});

socket.on('typing:stop', (data) => {
  console.log(`${data.user.username} stopped typing`);
});

// Start/stop typing
socket.emit('typing:start', { conversationId: 'CONVERSATION_ID' });
setTimeout(() => {
  socket.emit('typing:stop', { conversationId: 'CONVERSATION_ID' });
}, 3000);
```

### Python Example (using python-socketio)
```python
import socketio

sio = socketio.Client()

@sio.on('message:new')
def on_message(data):
    print(f"New message: {data['message']['content']}")

@sio.on('typing:start')
def on_typing_start(data):
    print(f"{data['user']['username']} is typing...")

# Connect with authentication
sio.connect('http://localhost:3000/chat', 
           auth={'token': 'YOUR_JWT_TOKEN'})

# Join conversation and send message
sio.emit('join:conversation', {'conversationId': 'CONVERSATION_ID'})
sio.emit('send:message', {
    'conversationId': 'CONVERSATION_ID',
    'content': 'Hello from Python!',
    'type': 'text'
})
```

## Features Showcase

### Real-time Features
1. **Instant Messaging** - Messages appear instantly across all connected clients
2. **Typing Indicators** - See when someone is typing
3. **Online Status** - Real-time user presence
4. **Read Receipts** - Know when messages are read
5. **Message Reactions** - React with emojis

### Message Types
- **Text Messages** - Regular text communication
- **File Attachments** - Images, documents, videos
- **Reply Messages** - Thread-like conversations
- **System Messages** - Automated notifications

### Security Features
- **JWT Authentication** - Secure token-based auth
- **Input Validation** - All inputs are validated
- **File Upload Security** - Type and size restrictions
- **Rate Limiting** - Prevent spam and abuse

## Production Deployment

### Environment Variables for Production
```env
NODE_ENV=production
DATABASE_HOST=your-postgres-host
DATABASE_USERNAME=your-db-user
DATABASE_PASSWORD=your-secure-password
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars
CORS_ORIGIN=https://your-frontend-domain.com
```

### Docker Production Build
```bash
# Build production image
docker build -t chat-api:latest .

# Run in production
docker run -d \
  --name chat-api \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_HOST=your-host \
  -e DATABASE_PASSWORD=your-password \
  chat-api:latest
```

## Monitoring and Health Checks

### Health Check Endpoint
```bash
curl -X GET http://localhost:3000/api/v1/health
```

### API Documentation
Visit http://localhost:3000/api/docs for complete interactive API documentation with Swagger UI.

## Performance Tips

1. **Database Indexing** - Ensure proper indexes on frequently queried fields
2. **Connection Pooling** - Configure TypeORM connection pool size
3. **File Storage** - Use cloud storage (AWS S3, etc.) for production file uploads
4. **Caching** - Implement Redis for session storage and caching
5. **Load Balancing** - Use multiple instances behind a load balancer
6. **CDN** - Serve static files through a CDN

## Troubleshooting

### Common Issues

1. **Database Connection Refused**
   ```bash
   # Ensure PostgreSQL is running
   docker ps | grep postgres
   ```

2. **JWT Token Expired**
   ```bash
   # Re-login to get a new token
   curl -X POST http://localhost:3000/api/v1/auth/login
   ```

3. **WebSocket Connection Failed**
   - Check if the JWT token is valid
   - Ensure CORS settings allow your domain

### Logs
```bash
# View application logs
docker-compose logs -f app

# View database logs
docker-compose logs -f postgres
```

---

For more detailed information, refer to the main README.md file and the Swagger documentation at `/api/docs`.