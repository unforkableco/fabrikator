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

### 1. Clone the Repository

```bash
git clone <repository-url>
cd fabrikator
```

### 2. Database Setup

1. Create a PostgreSQL database for the application
2. Note your database connection details (host, port, database name, username, password)

### 3. Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

### 4. Environment Configuration

Create a `.env` file in the backend directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Database connection string
DATABASE_URL="postgresql://username:password@localhost:5432/fabrikator_db"

# OpenAI API key for AI features
OPENAI_API_KEY="your-openai-api-key-here"
```

### 5. Database Migration

Run Prisma migrations to set up the database schema:

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate
```

### 6. Frontend Setup

In a new terminal, navigate to the root directory and install frontend dependencies:

```bash
cd ..  # Back to root directory
npm install
```

## Running the Application

### Development Mode

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

### Production Mode

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

### Backend Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the TypeScript code
- `npm start` - Start production server
- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:reset` - Reset database (⚠️ destroys all data)
- `npm run db:studio` - Open Prisma Studio for database management

### Frontend Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App (⚠️ irreversible)

## Project Structure

```
fabrikator/
├── backend/                 # Backend API server
│   ├── src/
│   │   ├── modules/        # Feature modules (material, project, wiring)
│   │   ├── services/       # Business logic services
│   │   ├── config/         # Configuration files
│   │   └── prisma/         # Database service
│   ├── prisma/            # Database schema and migrations
│   └── package.json
├── src/                    # Frontend React application
│   ├── app/               # App configuration and theme
│   ├── features/          # Feature-based components
│   │   └── projects/      # Project management features
│   ├── pages/             # Top-level page components
│   └── shared/            # Shared utilities and components
└── package.json
```

## Key Features

### Project Management
- Create and manage multiple projects
- AI-powered project requirements analysis
- Project status tracking

### Material Management
- Add and organize project materials
- AI-powered material suggestions
- Material status tracking and validation

### Wiring System
- Interactive wiring diagram editor
- Component management and validation
- Connection management with validation
- AI-assisted wiring suggestions

### AI Integration
- Chat-based project assistance
- Automated material suggestions
- Wiring optimization recommendations

## Troubleshooting

### Common Issues

1. **Database Connection Errors:**
   - Verify PostgreSQL is running
   - Check DATABASE_URL in `.env` file
   - Ensure database exists and user has proper permissions

2. **Missing Dependencies:**
   - Run `npm install` in both root and backend directories
   - Clear node_modules and reinstall if issues persist

3. **Port Conflicts:**
   - Backend runs on port 3001, frontend on 3000
   - Modify ports if conflicts occur

4. **AI Features Not Working:**
   - Verify OPENAI_API_KEY is set correctly in backend/.env
   - Check OpenAI API quota and billing status

## Getting Started

1. Install dependencies:
   ```