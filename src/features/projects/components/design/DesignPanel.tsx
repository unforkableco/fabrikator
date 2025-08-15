import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import { ViewInAr, Chat } from '@mui/icons-material';
import { Scene3DEditor } from './Scene3DEditor';
import { Design3DChat } from './Chat3D/Design3DChat';
import { DesignPreviewGenerator } from './DesignPreviewGenerator';
import { DesignPartsGenerator } from './DesignPartsGenerator';

interface DesignPanelProps {
  projectId: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ height: '100%' }}>
    {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
  </div>
);

const DesignPanel: React.FC<DesignPanelProps> = ({ projectId }) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (!projectId) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="error">Project ID is required</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* AI Design Preview Generator */}
      <DesignPreviewGenerator projectId={projectId} />
      {/* AI CAD Parts Generator */}
      <DesignPartsGenerator projectId={projectId} />
      
      {/* Tab Header */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab 
            icon={<ViewInAr />} 
            label="3D Editor" 
            iconPosition="start"
            sx={{ textTransform: 'none' }}
          />
          <Tab 
            icon={<Chat />} 
            label="AI Assistant" 
            iconPosition="start"
            sx={{ textTransform: 'none' }}
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <TabPanel value={activeTab} index={0}>
          <Scene3DEditor projectId={projectId} />
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          <Design3DChat projectId={projectId} />
        </TabPanel>
      </Box>
    </Box>
  );
};

export default DesignPanel;