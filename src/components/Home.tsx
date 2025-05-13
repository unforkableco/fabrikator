import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = React.useState<any[]>([]); // TODO: Replace with proper type

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Fabrikator Projects
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => navigate('/project/new')}
        sx={{ mb: 4 }}
      >
        New Project
      </Button>
      <Grid container spacing={3}>
        {projects.map((project) => (
          <Grid item xs={12} sm={6} md={4} key={project.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{project.name}</Typography>
                <Typography color="textSecondary">{project.description}</Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => navigate(`/project/${project.id}`)}>
                  Open Project
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default Home; 