# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Backend Development
- **Start development server**: `cd backend && npm run dev` (with hot reload)
- **Build TypeScript**: `cd backend && npm run build`
- **Run tests**: `cd backend && npm test`
- **Database operations**:
  - Generate Prisma client: `npm run db:generate`
  - Run migrations: `npm run db:migrate`
  - Reset database: `npm run db:reset`
  - Open Prisma Studio: `npm run db:studio`

### Frontend Development
- **Start development server**: `npm start` (from root directory)
- **Build for production**: `npm run build`
- **Run tests**: `npm test`

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
- **Chat**: AI-powered project assistance (`/backend/src/modules/chat/`)

Each module contains its own router, controller, and service files.

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