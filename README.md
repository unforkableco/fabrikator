# Fabrikator

Fabrikator is a proof-of-concept application for developing objects with electronics and 3D printed parts. It helps users create projects that combine various components like RC planes, smart devices, and other electronic or 3D printed elements.

## Features

- Create and manage multiple projects
- AI-powered project requirements analysis
- Material management and part selection
- Wiring diagram generation
- Interactive project assistant
- (Coming soon) 3D editor integration
- (Coming soon) Code editor integration

## Project Structure

The application is built using React with TypeScript and Material-UI. It consists of several key components:

- **Home**: Displays the list of projects
- **NewProject**: Handles project creation and initial AI analysis
- **ProjectBoard**: Main workspace for project development
  - MaterialsPanel: Manages project materials and part selection
  - WiringEditor: Generates and displays wiring diagrams
  - UserPrompt: Provides project-wide AI assistance

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Open [http://localhost:3000](http://localhost:3000) to view the application.

## Configuration

The application requires configuration for several AI APIs:

1. Project Analysis API: Used to analyze project requirements
2. Materials Search API: Used to find and suggest parts
3. Wiring Generation API: Used to create wiring diagrams

Configuration files should be placed in the `src/config` directory.

## Development

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Building for Production

```bash
npm run build
```

## License

MIT 