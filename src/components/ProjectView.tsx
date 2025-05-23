import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  CircularProgress,
  Button,
  Tabs,
  Tab,
  Alert,
  Grid,
} from '@mui/material';
import { Project, Material } from '../types';
import { api } from '../config/api';
import ComponentsPanel from './panels/ComponentsPanel';
import WiringEditor from './panels/WiringEditor';
import UserPrompt from './panels/UserPrompt';
import { AIResponsesPanel } from './AIResponsesPanel';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`project-tabpanel-${index}`}
      aria-labelledby={`project-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3, height: 'calc(100vh - 200px)', overflow: 'auto' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ProjectView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchProject = async () => {
      if (!id) return;
      
      try {
        const data = await api.projects.get(id);
        setProject(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [id]);

  const handleUpdateProject = async (updatedProject: Project) => {
    if (!id) return;
    
    try {
      const data = await api.projects.update(id, updatedProject);
      setProject(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
    }
  };

  const handleUpdateMaterials = (updatedMaterials: Material[]) => {
    if (!project) return;
    
    const updatedProject: Project = {
      ...project,
      materials: updatedMaterials,
      updatedAt: new Date().toISOString()
    };
    handleUpdateProject(updatedProject);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !project) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography color="error" gutterBottom>
            {error || 'Project not found'}
          </Typography>
          <Button variant="contained" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              {project.name}
            </Typography>
            <Typography color="textSecondary" paragraph>
              {project.description}
            </Typography>
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab label="Materials" />
                <Tab label="Wiring" />
                <Tab label="User Prompt" />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <ComponentsPanel project={project} onUpdateProject={handleUpdateProject} />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <WiringEditor project={project} onUpdateProject={handleUpdateProject} />
            </TabPanel>
            <TabPanel value={tabValue} index={2}>
              <UserPrompt project={project} onUpdateProject={handleUpdateProject} />
            </TabPanel>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 4, height: 'calc(100vh - 100px)', position: 'sticky', top: 20 }}>
            <AIResponsesPanel 
              messages={project.messages} 
              materials={project.materials}
              onUpdateMaterials={handleUpdateMaterials}
            />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProjectView; 