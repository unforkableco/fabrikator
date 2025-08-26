# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Backend Development
- **Start development server**: `cd backend && npm run dev` (with hot reload)
- **Build TypeScript**: `cd backend && npm run build`
- **Run tests**: `cd backend && npm test`
- **Start worker process**: `cd backend && npm run worker` (for async job processing)
- **Database operations**:
  - Generate Prisma client: `npm run db:generate`
  - Run migrations: `npm run db:migrate`
  - Reset database: `npm run db:reset`
  - Open Prisma Studio: `npm run db:studio`
- **Utility commands**:
  - Describe image: `npm run describe:image` (AI image analysis)
  - Generate STL files: `npm run stl:gen` (requires Python environment)

### Frontend Development
- **Start development server**: `npm start` (from root directory)
- **Build for production**: `npm run build`
- **Run tests**: `npm test`

### Docker Development
- **Start all services**: `./docker-start.sh` or `docker-compose up -d`
- **View logs**: `docker-compose logs -f [service_name]`
- **Stop services**: `docker-compose down`
- **Rebuild**: `docker-compose up -d --build`

### Environment Setup
Required environment variables in `.env`:
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection for job queue (optional, defaults to localhost)

## Architecture Overview

### Project Structure
- **Frontend**: React + TypeScript application in `/src` with Material-UI components
- **Backend**: Node.js + Express + TypeScript server in `/backend/src`
- **Database**: PostgreSQL with Prisma ORM, schema in `/backend/prisma/schema.prisma`

### Core Modules (Backend)
The backend follows a modular architecture with these main modules:
- **Project**: Core project management (`/backend/src/modules/project/`)
- **Material**: Component and material management (`/backend/src/modules/material/`)
- **Wiring**: Electrical wiring diagrams and validation (`/backend/src/modules/wiring/`)
- **Scene**: 3D scene management (`/backend/src/modules/scene/`)
- **Design3D**: 3D component library (`/backend/src/modules/design3d/`)
- **Design-Preview**: AI-powered design generation (`/backend/src/modules/design-preview/`)
- **Chat**: AI-powered project assistance (`/backend/src/modules/chat/`)

Each module contains its own router, controller, and service files.

### Enhanced CAD Pipeline Services
Advanced services for 3D model generation and validation:
- **Hardware Analysis**: Extracts component specifications and constraints
- **Assembly Planning**: Plans part interfaces and assembly sequences
- **Manufacturing Constraints**: Optimizes for 3D printing and manufacturing
- **Parts Specification**: Generates detailed part requirements
- **Assembly Validation**: Validates fitment and assembly feasibility
- **Refinement**: Iteratively improves designs based on validation results

### Frontend Feature Structure
- **Projects**: Main workspace at `/src/features/projects/`
- **Components**: Organized by functionality (materials, wiring, design, chat)
- **Shared**: Common types, services, and utilities in `/src/shared/`

### Database Schema
Key entities with versioning system:
- **Project**: Root entity containing all project data
- **Component**: Materials/parts with versioned specifications
- **WiringSchema**: Electrical diagrams with versioned wiring data
- **Scene3D**: 3D scenes with versioned scene graphs
- **Message**: Chat messages with context-based organization
- **DesignPreview**: AI-generated design options and iterations
- **ProjectCadGeneration**: CAD pipeline execution tracking
- **Component3D**: 3D component library with metadata
- **Enhanced Pipeline Models**: Assembly validation, part interfaces, and refinement tracking

### Job Queue System
- **BullMQ + Redis**: Handles async processing for CAD generation, image processing, and AI operations
- Background workers process long-running tasks like STL generation and design refinement
- Progress tracking through database for real-time status updates

### Key Technologies
- **Canvas Rendering**: Konva.js for 2D wiring diagrams
- **3D Rendering**: Three.js with React Three Fiber
- **UI Library**: Material-UI with custom theming
- **API Integration**: OpenAI API for AI-powered features
- **Styling**: Emotion CSS-in-JS

### Context-Based Features
The application uses context-based organization for different project aspects:
- `general`: Overall project discussion
- `materials`: Component and part management
- `wiring`: Electrical system design
- `3d`: 3D modeling and scene design

### AI Integration
AI features are integrated throughout the application:
- Project requirement analysis
- Material suggestions and alternatives
- Wiring diagram generation and validation
- 3D component design assistance