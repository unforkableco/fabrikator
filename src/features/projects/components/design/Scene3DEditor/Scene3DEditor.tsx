import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, Tabs, Tab } from '@mui/material';
import { useScene3D } from '../../../hooks/useScene3D';
import { Viewport3D } from './Viewport3D';
import { SceneGraph } from './SceneGraph';
import { ComponentLibrary } from '../ComponentLibrary/ComponentLibrary';

interface Scene3DEditorProps {
  projectId: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ height: '100%' }}>
    {value === index && children}
  </div>
);

export const Scene3DEditor: React.FC<Scene3DEditorProps> = ({ projectId }) => {
  const [activeTab, setActiveTab] = useState(0);
  const scene3D = useScene3D(projectId);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (scene3D.isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <Typography>Loading 3D scene...</Typography>
      </Box>
    );
  }

  if (scene3D.error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <Typography color="error">{scene3D.error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          3D Scene Editor
          {scene3D.scene && (
            <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 2 }}>
              {scene3D.scene.name}
            </Typography>
          )}
        </Typography>
      </Box>

      {/* Main Editor Layout */}
      <Grid container spacing={2} sx={{ flexGrow: 1, height: 'calc(100% - 80px)' }}>
        {/* Left Panel - Scene Graph & Library */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
              <Tab label="Scene" />
              <Tab label="Library" />
            </Tabs>
            
            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
              <TabPanel value={activeTab} index={0}>
                <SceneGraph
                  sceneGraph={scene3D.sceneGraph}
                  selectedNodes={scene3D.selectedNodes}
                  onSelectNode={scene3D.selectNode}
                  onUpdateNode={scene3D.updateNode}
                  onRemoveNode={scene3D.removeNode}
                />
              </TabPanel>
              <TabPanel value={activeTab} index={1}>
                <ComponentLibrary
                  onAddComponent={(component) => {
                    scene3D.addNodeToScene({
                      name: component.name,
                      type: component.type,
                      transform: {
                        position: [0, 0, 0],
                        rotation: [0, 0, 0],
                        scale: [1, 1, 1]
                      },
                      componentId: component.id,
                      children: [],
                      metadata: component.metadata
                    });
                  }}
                />
              </TabPanel>
            </Box>
          </Paper>
        </Grid>

        {/* Center Panel - 3D Viewport */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ height: '100%' }}>
            <Viewport3D
              sceneGraph={scene3D.sceneGraph}
              selectedNodes={scene3D.selectedNodes}
              onSelectNode={scene3D.selectNode}
              onUpdateNode={scene3D.updateNode}
              onClearSelection={scene3D.clearSelection}
            />
          </Paper>
        </Grid>

        {/* Right Panel - Properties & Tools */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ height: '100%', p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Properties
            </Typography>
            
            {scene3D.selectedNodes.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Select an object to edit its properties
              </Typography>
            ) : (
              <Box>
                <Typography variant="body2" gutterBottom>
                  Selected: {scene3D.selectedNodes.length} object(s)
                </Typography>
                
                {/* TODO: Add transform controls, material settings, etc. */}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Property editor coming in next phase...
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};