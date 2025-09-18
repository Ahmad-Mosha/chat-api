# Chat API

A fully featured NestJS Chat API with real-time messaging capabilities, built with modern technologies and best practices.

## Features

### 🔐 Authentication & Authorization
- JWT-based authentication
- User registration and login
- Protected routes with guards
- Password hashing with bcrypt

### 👥 User Management
- User profiles with avatars
- Online/offline status tracking
- Friend system
- User blocking functionality
- User search

### 💬 Real-time Messaging
- WebSocket integration with Socket.IO
- Direct and group conversations
- Message types (text, image, video, audio, file)
- Message reactions with emojis
- Reply to messages
- Message editing and deletion
- Typing indicators
- Read receipts
- Message search

### 📁 File Handling
- File upload with validation
- Support for images, documents, audio, and video
- File size limits and type restrictions
- Static file serving

### 🏗️ Technical Features
- PostgreSQL database with TypeORM
- Comprehensive API documentation with Swagger
- Rate limiting and security middleware
- CORS configuration
- Input validation and transformation
- Error handling and logging
- Docker support for easy deployment

## Tech Stack

- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Authentication**: JWT with Passport
- **Real-time**: Socket.IO
- **Documentation**: Swagger/OpenAPI
- **Validation**: class-validator
- **File Upload**: Multer
- **Containerization**: Docker & Docker Compose

## Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ahmad-Mosha/chat-api.git
   cd chat-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your configuration:
   ```env
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   DATABASE_USERNAME=postgres
   DATABASE_PASSWORD=password
   DATABASE_NAME=chat_api
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=24h
   PORT=3000
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:3000
   MAX_FILE_SIZE=10485760
   UPLOAD_DEST=./uploads
   ```

4. **Start the database**
   ```bash
   # Using Docker Compose (recommended)
   docker-compose up postgres -d
   
   # Or set up PostgreSQL manually
   ```

5. **Run the application**
   ```bash
   # Development mode
   npm run start:dev
   
   # Production mode
   npm run build
   npm run start:prod
   ```

### Using Docker (Recommended)

1. **Start all services**
   ```bash
   docker-compose up -d
   ```

2. **View logs**
   ```bash
   docker-compose logs -f app
   ```

3. **Stop services**
   ```bash
   docker-compose down
   ```

## API Documentation

Once the application is running, visit:
- **Swagger UI**: http://localhost:3000/api/docs
- **API Base URL**: http://localhost:3000/api/v1

### Key Endpoints

#### Authentication
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/profile` - Get user profile

#### Users
- `GET /api/v1/users` - Get all users
- `GET /api/v1/users/search?q=query` - Search users
- `PUT /api/v1/users/me` - Update profile
- `POST /api/v1/users/friends/:id` - Add friend
- `DELETE /api/v1/users/friends/:id` - Remove friend

#### Chat
- `POST /api/v1/chat/conversations` - Create conversation
- `GET /api/v1/chat/conversations` - Get user conversations
- `POST /api/v1/chat/conversations/:id/messages` - Send message
- `GET /api/v1/chat/conversations/:id/messages` - Get messages
- `PUT /api/v1/chat/messages/:id` - Edit message
- `DELETE /api/v1/chat/messages/:id` - Delete message

#### Files
- `POST /api/v1/files/upload` - Upload file

## WebSocket Events

### Connection
Connect to: `ws://localhost:3000/chat`

Include JWT token in connection:
```javascript
const socket = io('http://localhost:3000/chat', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events

#### Client to Server
- `join:conversation` - Join a conversation room
- `leave:conversation` - Leave a conversation room
- `send:message` - Send a message
- `edit:message` - Edit a message
- `delete:message` - Delete a message
- `react:message` - React to a message
- `typing:start` - Start typing
- `typing:stop` - Stop typing
- `read:conversation` - Mark conversation as read
- `update:status` - Update user status

#### Server to Client
- `message:new` - New message received
- `message:edited` - Message was edited
- `message:deleted` - Message was deleted
- `message:reaction` - Message reaction added/removed
- `typing:start` - User started typing
- `typing:stop` - User stopped typing
- `user:online` - User came online
- `user:offline` - User went offline
- `user:status` - User status changed
- `conversation:read` - Conversation was read

## Project Structure

```
src/
├── auth/                 # Authentication module
│   ├── dto/             # Data transfer objects
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── jwt.strategy.ts
│   └── jwt-auth.guard.ts
├── users/               # User management module
│   ├── dto/
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── chat/                # Chat functionality module
│   ├── dto/
│   ├── chat.controller.ts
│   ├── chat.service.ts
│   └── chat.module.ts
├── websockets/          # WebSocket module
│   ├── chat.gateway.ts
│   └── websockets.module.ts
├── files/               # File handling module
│   ├── files.controller.ts
│   └── files.module.ts
├── entities/            # Database entities
│   ├── user.entity.ts
│   ├── conversation.entity.ts
│   └── message.entity.ts
├── config/              # Configuration files
│   ├── database.config.ts
│   ├── jwt.config.ts
│   └── app.config.ts
├── common/              # Shared utilities
│   ├── decorators/
│   ├── guards/
│   └── pipes/
├── app.module.ts
└── main.ts
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt for secure password storage
- **Input Validation**: Comprehensive input validation and sanitization
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS**: Configurable CORS settings
- **File Upload Security**: File type and size validation
- **SQL Injection Protection**: TypeORM provides built-in protection

## Performance Considerations

- **Database Indexing**: Proper indexing on frequently queried fields
- **Pagination**: Implemented for message history and user lists
- **Connection Pooling**: Database connection pooling for better performance
- **Caching**: Ready for Redis integration for caching
- **File Optimization**: File size limits and type restrictions

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@example.com or open an issue on GitHub.

---

Built with ❤️ using NestJS