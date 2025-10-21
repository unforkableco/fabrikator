import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Divider,
  Paper,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { useAuth } from '../shared/contexts/AuthContext';
import { api } from '../shared/services/api';

const ProfilePage: React.FC = () => {
  const { account, refreshAccount, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!account) {
    return null;
  }

  const handlePasswordUpdate = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!currentPassword || !newPassword) {
      setFeedback({ type: 'error', text: 'Please fill out all password fields.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (newPassword.length < 8) {
      setFeedback({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await api.accounts.updatePassword({ currentPassword, newPassword });
      await refreshAccount();
      setFeedback({ type: 'success', text: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      const message = error?.response?.data?.error || 'Failed to update password.';
      setFeedback({ type: 'error', text: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 6 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
          Account Settings
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Email
          </Typography>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {account.email}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary">
            Credits Remaining
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            {account.credits}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary">
            Projects Used / Limit
          </Typography>
          <Typography variant="body1">
            {account.projectsUsed} / {account.maxProjects}
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Update Password
        </Typography>

        {feedback && (
          <Alert severity={feedback.type} sx={{ mb: 2 }}>
            {feedback.text}
          </Alert>
        )}

        <Box component="form" onSubmit={handlePasswordUpdate} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(event.target.value)}
            required
            fullWidth
          />
          <TextField
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setNewPassword(event.target.value)}
            required
            fullWidth
            helperText="Minimum 8 characters."
          />
          <TextField
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(event.target.value)}
            required
            fullWidth
          />
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </Button>
            <Button variant="outlined" color="secondary" onClick={logout}>
              Log out
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default ProfilePage;
