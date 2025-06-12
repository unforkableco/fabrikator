import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

// Layout
import { AppLayout } from '../shared/components/layout';

// Pages
import HomePage from '../pages/HomePage';
import NewProjectPage from '../pages/NewProjectPage';
import ProjectPage from '../features/projects/pages/ProjectPage';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/project/new" element={<NewProjectPage />} />
            <Route path="/project/:id" element={<ProjectPage />} />
          </Routes>
        </AppLayout>
      </Router>
    </ThemeProvider>
  );
}

export default App; 