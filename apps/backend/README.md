# AI Web3 Security Platform

A production-ready NestJS backend for an AI-powered Web3 security platform that provides smart contract analysis, vulnerability detection, and real-time security monitoring.

## Features

- **Modular Architecture**: Clean, scalable NestJS architecture with separation of concerns
- **Database**: PostgreSQL with Prisma ORM for type-safe database operations
- **Caching & Queues**: Redis for caching and BullMQ for background job processing
- **Logging**: Winston-based structured logging with multiple levels and outputs
- **API Documentation**: Swagger/OpenAPI documentation
- **Security**: Built-in rate limiting, validation, and security best practices
- **Docker Support**: Complete Docker setup for development and production
- **TypeScript**: Full TypeScript support with strict typing

## Tech Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Cache/Queue**: Redis + BullMQ
- **Logging**: Winston
- **Documentation**: Swagger/OpenAPI
- **Containerization**: Docker & Docker Compose

## Project Structure

```
src/
├── app.controller.ts          # Application controller
├── app.service.ts             # Application service
├── app.module.ts              # Root module
├── main.ts                    # Application entry point
├── common/                    # Common utilities
│   ├── database/              # Database configuration
│   │   ├── database.module.ts
│   │   └── prisma.service.ts
│   ├── redis/                 # Redis configuration
│   │   ├── redis.module.ts
│   │   └── redis.service.ts
│   └── logger/                # Logging configuration
│       ├── logger.module.ts
│       └── logger.service.ts
├── config/                    # Configuration files
│   ├── logger.config.ts
│   └── database.config.ts
├── modules/                   # Business modules (to be implemented)
└── queues/                    # Queue management
    ├── queue.module.ts
    └── queue.service.ts
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- Docker & Docker Compose
- PostgreSQL (if not using Docker)
- Redis (if not using Docker)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-web3-security-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start infrastructure services**
   ```bash
   # Start PostgreSQL and Redis
   docker-compose up -d

   # Optional: Start with admin tools
   docker-compose --profile tools up -d
   ```

5. **Setup database**
   ```bash
   # Generate Prisma client
   npm run prisma:generate

   # Run database migrations
   npm run prisma:migrate

   # (Optional) Seed database
   npm run prisma:seed
   ```

6. **Start the application**
   ```bash
   # Development mode
   npm run start:dev

   # Production mode
   npm run build
   npm run start:prod
   ```

## Available Scripts

- `npm run start` - Start the application
- `npm run start:dev` - Start in development mode with hot reload
- `npm run start:debug` - Start in debug mode
- `npm run start:prod` - Start in production mode
- `npm run build` - Build the application
- `npm run test` - Run unit tests
- `npm run test:cov` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run prisma:seed` - Seed the database

## API Documentation

Once the application is running, visit:
- **API Docs**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/health

## Development Tools

### Database Administration
- **PgAdmin**: http://localhost:8080 (admin@example.com / admin)
- **Prisma Studio**: `npm run prisma:studio`

### Redis Administration
- **Redis Commander**: http://localhost:8081

### Environment Variables

Key environment variables (see `.env.example` for complete list):

```bash
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/ai_web3_security

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
JWT_SECRET=your-super-secret-jwt-key

# Web3 Configuration
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID

# AI Services
OPENAI_API_KEY=your-openai-api-key
```

## Architecture Overview

### Modules

The application follows a modular architecture where each feature is organized into its own module:

- **Common**: Shared utilities and configurations
- **Config**: Environment-based configuration
- **Queues**: Background job processing with BullMQ
- **Modules**: Business logic modules (to be implemented)

### Database

Uses PostgreSQL with Prisma ORM for type-safe database operations. The schema is defined in `prisma/schema.prisma` and includes:

- Users management
- Audit logging
- Security scan results
- Alert system
- Security rules
- Network configurations

### Caching & Queues

Redis is used for:
- Session storage
- API response caching
- Real-time data
- Queue backend for BullMQ

BullMQ handles:
- Smart contract analysis jobs
- Security scanning tasks
- Notification processing
- Data synchronization

### Logging

Winston provides structured logging with:
- Console output (development)
- File output (production)
- Different log levels
- Context-aware logging
- Performance and security logging

## Production Deployment

### Docker Production

```bash
# Build production image
docker build -t ai-web3-security-platform .

# Run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Setup

1. Set production environment variables
2. Configure secure database connections
3. Set up Redis with persistence
4. Configure logging and monitoring
5. Set up reverse proxy (nginx)
6. Configure SSL certificates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run linting and tests
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the repository.
