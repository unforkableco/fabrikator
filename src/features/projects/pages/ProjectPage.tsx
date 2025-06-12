import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Box,
  CircularProgress,
  Alert,
  Typography,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';

import { ProjectHeader } from '../components/ProjectHeader';
import { ProjectTabs } from '../components/ProjectTabs';
import { TabPanel } from '../../../shared/components/ui/TabPanel';
import { useProject } from '../hooks/useProject';
import { useMaterials } from '../hooks/useMaterials';
import { MaterialsPanel } from '../components';

const ProjectPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tabValue, setTabValue] = useState(0);

  // Hooks personnalisés pour la logique métier
  const { project, isLoading, error: projectError, updateProject } = useProject(id);
  const { 
    materials, 
    isGeneratingInsights,
    isLoading: materialsLoading,
    error: materialsError, 
    generateInsights,
    approveMaterial,
    rejectMaterial,
    addMaterial,
    deleteMaterial,
    updateMaterial,
    refreshMaterials
  } = useMaterials(id);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleGenerateInsights = async () => {
    if (project?.description) {
      await generateInsights(project.description);
    }
  };

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
      <ProjectHeader project={project} />
      <ProjectTabs value={tabValue} onChange={handleTabChange} />

      <Container maxWidth="lg" sx={{ flexGrow: 1, py: 3 }}>
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

        {/* Components Tab */}
        <TabPanel value={tabValue} index={2} id="project">
          <Typography variant="h6" gutterBottom>
            Components
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Components interface will be here.
          </Typography>
        </TabPanel>

        {/* Wiring Tab */}
        <TabPanel value={tabValue} index={3} id="project">
          <Typography variant="h6" gutterBottom>
            Wiring & Schemas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Wiring interface will be here.
          </Typography>
        </TabPanel>
      </Container>
    </Box>
  );
};

export default ProjectPage; 