# Fabrikator

Fabrikator is a proof-of-concept application for developing objects with electronics and 3D printed parts. It helps users create projects that combine various components like RC planes, smart devices, and other electronic or 3D printed elements.

## Features

- Create and manage multiple projects
- AI-powered project requirements analysis
- Material management and part selection
- Integrated AI chat assistant
- Interactive project workspace
- Wiring diagram generation
- Component management and validation

## Tech Stack

- **Frontend**: React with TypeScript, Material-UI, Konva for canvas rendering
- **Backend**: Node.js with Express, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **AI Integration**: OpenAI API

## Prerequisites

Before setting up the application, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 16 or higher)
- [PostgreSQL](https://www.postgresql.org/) database
- npm or yarn package manager

## Installation & Setup

### Option 1: Docker Setup (Recommended)

The easiest way to run Fabrikator is using Docker. This method automatically sets up the entire application stack including the database, backend, and frontend.

#### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) (version 20.10 or higher)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 2.0 or higher)

#### Quick Start

1. **Clone the Repository:**
   ```bash
   git clone <repository-url>
   cd fabrikator
   ```

2. **Configure Environment:**
   ```bash
   cp env.example .env
   ```
   
   Edit the `.env` file and add your OpenAI API key:
   ```env
   OPENAI_API_KEY=your-openai-api-key-here
   ```

   3. **Start the Application:**
   ```bash
   # Use the automated startup script (recommended)
   ./docker-start.sh
   
   # Or manually:
   # docker-compose up -d
   # docker-compose up migrate
   ```

4. **Access the Application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Database: localhost:5432

#### Docker Management Commands

```bash
# View logs
docker-compose logs -f [service_name]

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Reset database (WARNING: destroys all data)
docker-compose down -v
docker volume rm fabrikator-postgres-data
```

### Option 2: Manual Setup

If you prefer to run the application manually without Docker:

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd fabrikator
```

#### 2. Database Setup

1. Create a PostgreSQL database for the application
2. Note your database connection details (host, port, database name, username, password)

#### 3. Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

#### 4. Environment Configuration

Create a `.env` file in the backend directory:

```bash
cp env.example .env
```

Edit the `.env` file with your configuration:

```env
# Database connection string
DATABASE_URL="postgresql://username:password@localhost:5432/fabrikator_db"

# AI Configuration
# Supported providers: openai, claude, gemini
AI_PROVIDER="openai"

# OpenAI Configuration (default)
OPENAI_API_KEY="your-openai-api-key-here"
OPENAI_MODEL="gpt-4"

# Claude (Anthropic) Configuration
CLAUDE_API_KEY="your-claude-api-key-here"
CLAUDE_MODEL="claude-3-sonnet-20240229"

# Gemini (Google) Configuration
GEMINI_API_KEY="your-gemini-api-key-here"
GEMINI_MODEL="gemini-1.5-flash"

# Server Configuration
PORT=3001
```

#### AI Provider Configuration

Fabrikator supports multiple AI providers. Choose one by setting the `AI_PROVIDER` environment variable:

**OpenAI (Default)**
- Set `AI_PROVIDER="openai"`
- Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- Available models: `gpt-4`, `gpt-4-turbo-preview`, `gpt-3.5-turbo`, `gpt-4o`, `gpt-4o-mini`

**Claude (Anthropic)**
- Set `AI_PROVIDER="claude"`
- Get your API key from [Anthropic Console](https://console.anthropic.com/)
- Available models: `claude-3-opus-20240229`, `claude-3-sonnet-20240229`, `claude-3-haiku-20240307`, `claude-3-5-sonnet-20241022`

**Gemini (Google)**
- Set `AI_PROVIDER="gemini"`
- Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Available models: `gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-pro`

You only need to configure the API key for the provider you want to use.

#### 5. Database Migration

Run Prisma migrations to set up the database schema:

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate
```

#### 6. Frontend Setup

In a new terminal, navigate to the root directory and install frontend dependencies:

```bash
cd ..  # Back to root directory
npm install
```

## Running the Application

### Docker (Recommended)

```bash
# Use the automated startup script
./docker-start.sh

# Or manually start services
docker-compose up -d
docker-compose up migrate
```

### Manual Development Mode

1. **Start the Backend Server:**
   ```bash
   cd backend
   npm run dev
   ```
   The backend server will start on `http://localhost:3001`

2. **Start the Frontend Development Server:**
   ```bash
   # In a new terminal, from root directory
   npm start
   ```
   The frontend will start on `http://localhost:3000`

### Manual Production Mode

1. **Build the Backend:**
   ```bash
   cd backend
   npm run build
   npm start
   ```

2. **Build the Frontend:**
   ```bash
   # From root directory
   npm run build
   ```

## Available Scripts

### Docker Scripts

- `./docker-start.sh` - **Automated startup with environment validation**
- `./docker-stop.sh` - **Stop all services safely**
- `docker logs fabrikator-backend -f` - View backend logs
- `docker logs fabrikator-frontend -f` - View frontend logs
- `docker exec fabrikator-backend printenv | grep OPENAI` - Check API key status
- `docker-compose build` - Rebuild images only

### Backend Scripts (Manual Setup)

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the TypeScript code
- `npm start` - Start production server
- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:studio` - Open Prisma Studio for database management

### Frontend Scripts (Manual Setup)

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

## Troubleshooting

### Docker Issues

**Services won't start:**
```bash
# Check if ports are already in use
docker-compose down
docker system prune -f
docker-compose up -d
```

**Database connection issues:**
```bash
# Reset database volume
docker-compose down -v
docker volume rm fabrikator-postgres-data
docker-compose up -d
```

**Build failures:**
```bash
# Clean Docker cache and rebuild
docker system prune -a
docker-compose build --no-cache
```

### Common Issues

- **Port conflicts**: Ensure ports 3000, 3001, and 5432 are available
- **Environment variables**: Make sure your `.env` file contains a valid `OPENAI_API_KEY`
- **Database migrations**: Run migrations after first setup: `docker-compose up migrate`

### OpenAI API Key Issues

**Symptoms**: AI project creation returns 500 errors, backend logs show 401 from OpenAI

**Check API key in container**:
```bash
docker exec fabrikator-backend printenv OPENAI_API_KEY
```

**If key is empty or wrong**:
1. Check your `.env` file: `cat .env | grep OPENAI`
2. Restart backend: `./docker-stop.sh && ./docker-start.sh`
3. Verify: `docker exec fabrikator-backend printenv OPENAI_API_KEY`

**Test AI functionality**:
```bash
curl -X POST http://localhost:3001/api/projects/create-from-prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Test LED project"}'
```

## Architecture

The Dockerized Fabrikator application consists of:

- **Frontend Container**: React app served by Nginx with optimized production build
- **Backend Container**: Node.js API server with Prisma ORM
- **Database Container**: PostgreSQL 15 with persistent volume storage
- **Migration Service**: One-time container for database schema setup

All services communicate through a dedicated Docker network with health checks and proper dependency management.
