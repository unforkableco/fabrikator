import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

// Layout
import { AppLayout } from '../shared/components/layout';
import { AuthProvider } from '../shared/contexts/AuthContext';
import { RequireAuth } from '../shared/components/auth/RequireAuth';

// Pages
import HomePage from '../pages/HomePage';
import NewProjectPage from '../pages/NewProjectPage';
import ProjectPage from '../features/projects/pages/ProjectPage';
import LoginPage from '../pages/LoginPage';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/project/new" element={<NewProjectPage />} />
                <Route path="/project/:id" element={<ProjectPage />} />
              </Route>
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 
