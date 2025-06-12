import React from 'react';
import { Tabs, Tab, Box } from '@mui/material';

interface ProjectTabsProps {
  value: number;
  onChange: (event: React.SyntheticEvent, newValue: number) => void;
}

const tabs = [
  { label: 'Overview', id: 'overview' },
  { label: 'Materials', id: 'materials' },
  { label: 'Components', id: 'components' },
  { label: 'Wiring', id: 'wiring' },
];

export const ProjectTabs: React.FC<ProjectTabsProps> = ({ value, onChange }) => {
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Tabs 
        value={value} 
        onChange={onChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            minHeight: 48,
          },
        }}
      >
        {tabs.map((tab, index) => (
          <Tab
            key={tab.id}
            label={tab.label}
            id={`project-tab-${index}`}
            aria-controls={`project-tabpanel-${index}`}
          />
        ))}
      </Tabs>
    </Box>
  );
}; 