import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Box,
} from '@mui/material';
import {
  Home as HomeIcon,
  Add as AddIcon,
  Build as BuildIcon,
  HelpOutline as HelpIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [helpModalOpen, setHelpModalOpen] = React.useState(false);
  const [helpMessage, setHelpMessage] = React.useState('');
  const { account, logout } = useAuth();

  const handleOpenHelpModal = () => {
    setHelpModalOpen(true);
  };

  const handleCloseHelpModal = () => {
    setHelpModalOpen(false);
    setHelpMessage('');
  };

  const handleSendHelp = () => {
    // Create mailto link
    const subject = encodeURIComponent('!Forge - Help Request');
    const body = encodeURIComponent(helpMessage);
    const mailtoLink = `mailto:help@unforkable.co?subject=${subject}&body=${body}`;
    
    // Open email client
    window.location.href = mailtoLink;
    
    // Close modal
    handleCloseHelpModal();
  };

  const navigationItems = [
    { label: 'Projects', path: '/', icon: <HomeIcon /> },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname.startsWith('/project');
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Navigation principale */}
      <AppBar 
        position="static" 
        elevation={1}
        sx={{ 
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Toolbar>
          {/* Logo */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              marginRight: '32px' 
            }}
            onClick={() => navigate('/')}
          >
            <BuildIcon sx={{ mr: 1, color: 'primary.main', fontSize: 32 }} />
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 700, 
                color: 'primary.main',
                letterSpacing: '-0.5px'
              }}
            >
              !Forge
            </Typography>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '8px', flexGrow: 1 }}>
            {navigationItems.map((item) => (
              <Button
                key={item.path}
                startIcon={item.icon}
                onClick={() => navigate(item.path)}
                sx={{
                  textTransform: 'none',
                  color: isActive(item.path) ? 'white' : 'text.primary',
                  bgcolor: isActive(item.path) ? 'primary.main' : 'transparent',
                  fontWeight: isActive(item.path) ? 600 : 400,
                  '&:hover': {
                    bgcolor: isActive(item.path) ? 'primary.dark' : 'action.hover',
                  },
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  '& .MuiButton-startIcon': {
                    color: isActive(item.path) ? 'white' : 'inherit',
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>

          {/* Actions droite */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/project/new')}
              sx={{ textTransform: 'none' }}
              disabled={Boolean(account && (account.projectsRemaining <= 0 || account.credits <= 0))}
            >
              New Project
            </Button>

            {account && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip
                  label={`Projects ${account.projectsUsed}/${account.maxProjects}`}
                  color={account.projectsRemaining > 0 ? 'default' : 'warning'}
                  size="small"
                />
                <Chip
                  label={`Credits ${account.credits}`}
                  color={account.credits > 0 ? 'default' : 'warning'}
                  size="small"
                />
              </Box>
            )}

            <IconButton 
              color="inherit"
              onClick={handleOpenHelpModal}
              title="Help"
            >
              <HelpIcon />
            </IconButton>

            <IconButton
              color="inherit"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="Logout"
            >
              <LogoutIcon />
            </IconButton>
          </div>
        </Toolbar>
      </AppBar>

      {/* Help Modal */}
      <Dialog 
        open={helpModalOpen} 
        onClose={handleCloseHelpModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Help Request
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Describe your problem or question. Your message will be sent to our support team.
          </Typography>
          <TextField
            autoFocus
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            placeholder="Describe your problem or question..."
            value={helpMessage}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHelpMessage(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseHelpModal}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendHelp}
            variant="contained"
            disabled={!helpMessage.trim()}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>

      {/* Contenu principal */}
      <div style={{ flexGrow: 1, backgroundColor: '#fafafa' }}>
        <Outlet />
      </div>
    </div>
  );
};
