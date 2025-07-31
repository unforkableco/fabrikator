import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Box,
  CircularProgress,
  Alert,
  Typography,
} from '@mui/material';

import { ProjectHeader } from '../components/ProjectHeader';
import { ProjectTabs } from '../components/ProjectTabs';
import { TabPanel } from '../../../shared/components/ui/TabPanel';
import { useProject } from '../hooks/useProject';
import { useMaterials } from '../hooks/useMaterials';
import { useWiring } from '../hooks/useWiring';
import { MaterialsPanel, WiringPanel } from '../components';

const ProjectPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tabValue, setTabValue] = useState(0);

  // Custom hooks for business logic
  const { project, isLoading, error: projectError, updateProject } = useProject(id);
  const { 
    materials, 
    isLoading: materialsLoading,
    approveMaterial,
    rejectMaterial,
    addMaterial,
    deleteMaterial,
    refreshMaterials
  } = useMaterials(id);
  const { 
    wiringDiagram,
    isLoading: wiringLoading,
    refreshWiring
  } = useWiring(id);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Removed unused function

  const handleEditMaterial = async (material: any) => {
    // This will be implemented when we have edit functionality
    console.log('Edit material:', material);
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading project...
        </Typography>
      </Container>
    );
  }

  if (projectError) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{projectError}</Alert>
      </Container>
    );
  }

  if (!project) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">Project not found</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <ProjectHeader project={project} onProjectUpdate={updateProject} />
      <ProjectTabs value={tabValue} onChange={handleTabChange} />

      {/* Container avec largeur adaptée selon l'onglet */}
      <Container 
        maxWidth={tabValue === 2 ? "xl" : "lg"} // Plus large pour le wiring
        sx={{ 
          flexGrow: 1, 
          py: 3,
          ...(tabValue === 2 && {
            maxWidth: '95%', // Utilise presque toute la largeur pour le wiring
            px: 1 // Reduced padding for more space
          })
        }}
      >
        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0} id="project">
          <Typography variant="h6" gutterBottom>
            Project Overview
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            {project.description || 'No description available.'}
          </Typography>
          
          {/* TODO: Add project stats, recent activity, etc. */}
        </TabPanel>

        {/* Materials Tab */}
        <TabPanel value={tabValue} index={1} id="project">
          <Box sx={{ height: '80vh' }}>
            <MaterialsPanel
              materials={materials}
              isLoading={materialsLoading}
              projectId={id}
              onAddMaterial={addMaterial}
              onEditMaterial={handleEditMaterial}
              onDeleteMaterial={deleteMaterial}
              onApproveSelected={approveMaterial}
              onRejectSelected={rejectMaterial}
              onMaterialsUpdated={refreshMaterials}
            />
          </Box>
        </TabPanel>


        {/* Wiring Tab */}
        <TabPanel value={tabValue} index={2} id="project">
          <Box sx={{ height: '90vh' }}> {/* Hauteur augmentée pour le wiring */}
            <WiringPanel
              wiringDiagram={wiringDiagram}
              isLoading={wiringLoading}
              projectId={id}
              materials={materials}
              onWiringUpdated={refreshWiring}
            />
          </Box>
        </TabPanel>
      </Container>
    </Box>
  );
};

export default ProjectPage; 