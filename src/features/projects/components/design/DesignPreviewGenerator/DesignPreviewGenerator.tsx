import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import { AutoAwesome, Refresh, CheckCircle } from '@mui/icons-material';
import { useDesignPreview } from '../../../hooks/useDesignPreview';
import { DesignOption } from '../../../../../shared/types';

interface DesignPreviewGeneratorProps {
  projectId: string;
}

export const DesignPreviewGenerator: React.FC<DesignPreviewGeneratorProps> = ({ projectId }) => {
  const {
    designPreview,
    isLoading,
    error,
    generateDesigns,
    selectDesign,
    tryAgain,
    iterate,
  } = useDesignPreview(projectId);

  const handleGenerateDesigns = async () => {
    try {
      await generateDesigns();
    } catch (err) {
      console.error('Failed to generate designs:', err);
    }
  };

  const handleSelectDesign = async (designOptionId: string) => {
    try {
      await selectDesign(designOptionId);
    } catch (err) {
      console.error('Failed to select design:', err);
    }
  };

  const handleTryAgain = async () => {
    try {
      await tryAgain();
    } catch (err) {
      console.error('Failed to regenerate designs:', err);
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      default: return 'default';
    }
  };

  // Removed printability color – printability concept no longer shown

  // Separate history vs current proposals
  const selectedId = designPreview?.selectedDesignId;
  const selected = designPreview?.designs.find(d => d.id === selectedId);

  // Determine proposals:
  // - If nothing selected yet → show all as proposals
  // - If iterating → show children of the selected design
  // - If a selection exists and siblings were deleted → show none until next iterate
  let proposals: DesignOption[] = [] as any;
  if (!selectedId) {
    proposals = (designPreview?.designs || []) as any;
  } else {
    const children = (designPreview?.designs || []).filter(d => d.parentDesignOptionId === selectedId);
    if (children.length > 0) {
      proposals = children as any;
    } else {
      proposals = [] as any;
    }
  }

  // Build ordered chain from earliest pick to latest by following parent links

  const buildChain = () => {
    if (!selected) return [] as DesignOption[];
    const byId: Record<string, DesignOption> = {} as any;
    (designPreview?.designs || []).forEach(d => { byId[d.id] = d; });
    const chain: DesignOption[] = [selected];
    let cur = selected;
    while (cur.parentDesignOptionId && byId[cur.parentDesignOptionId]) {
      chain.unshift(byId[cur.parentDesignOptionId]);
      cur = byId[cur.parentDesignOptionId];
    }
    return chain;
  };
  const chain = buildChain();

  // Shared concept/description/specs for all images
  const shared = designPreview?.designs?.[0];

  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ mb: 2 }}
        action={
          <Button 
            color="inherit" 
            size="small" 
            onClick={handleGenerateDesigns}
            disabled={isLoading}
          >
            Retry
          </Button>
        }
      >
        <Typography variant="body2" gutterBottom>
          {error}
        </Typography>
        {error.includes('rate limit') || error.includes('busy') ? (
          <Typography variant="caption" display="block">
            This usually resolves within a few minutes. You can try again or wait a bit longer.
          </Typography>
        ) : null}
      </Alert>
    );
  }

  // Initial generation loading (no data yet) or backend pending state
  if ((!designPreview && isLoading) || (designPreview as any)?.status === 'pending') {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress size={40} />
          <Typography sx={{ ml: 2 }}>Generating designs with AI...</Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          AI Design Preview Generator
        </Typography>
        {designPreview && designPreview.selectedDesign ? (
          <Box>
            <Button
              variant="contained"
              startIcon={<AutoAwesome />}
              onClick={() => iterate(designPreview.selectedDesign!.id)}
              disabled={isLoading}
            >
              Iterate upon this design
            </Button>
          </Box>
        ) : designPreview ? (
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleTryAgain}
            disabled={isLoading}
          >
            Try Again
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={<AutoAwesome />}
            onClick={handleGenerateDesigns}
            disabled={isLoading || (designPreview as any)?.status === 'pending'}
          >
            {(designPreview as any)?.status === 'pending' ? 'Generating…' : 'Generate Designs'}
          </Button>
        )}
      </Box>

      {designPreview && designPreview.designs.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            {designPreview.selectedDesign ? 'Variations' : 'Choose Your Preview Image'}
          </Typography>

          {/* Shared concept and description shown once */}
          {shared && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                {shared.concept}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {shared.description}
              </Typography>

              {/* Shared key features */}
              {shared.keyFeatures?.length > 0 && (
                <Box sx={{ mb: 1.5 }}>
                  {shared.keyFeatures.map((feature: string, index: number) => (
                    <Chip key={index} label={feature} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                  ))}
                </Box>
              )}

              {/* Shared complexity */}
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                {shared.complexity && (
                  <Chip
                    label={`Complexity: ${shared.complexity}`}
                    size="small"
                    color={getComplexityColor(shared.complexity)}
                    variant="outlined"
                  />
                )}
              </Box>

              {/* Technical specs removed */}
            </Box>
          )}
 
          <Grid container spacing={3}>
            {/* Left column: history (vertical) */}
            {chain.length > 0 && (
              <Grid item xs={12} md={4}>
                {chain.map((d) => (
                  <Card key={d.id} sx={{ mb: 2, border: d.id === selectedId ? 2 : 1, borderColor: d.id === selectedId ? 'primary.main' : 'divider' }}>
                    <Box component="img" src={`http://localhost:3001/${d.imageUrl}`} alt={d.concept} sx={{ width: '100%', height: 200, objectFit: 'cover' }}/>
                    <CardContent>
                      <Typography variant="subtitle2">{d.concept}</Typography>
                      {d.id !== selectedId && (
                        <Button size="small" sx={{ mt: 1 }} onClick={() => handleSelectDesign(d.id)}>Set as current</Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Grid>
            )}

            {/* Right column: current proposals */}
            <Grid item xs={12} md={chain.length > 0 ? 8 : 12}>
              <Grid container spacing={3}>
                {proposals.filter(d => d.id !== selectedId).map((design: DesignOption) => (
                  <Grid item xs={12} sm={6} md={4} key={design.id}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        border: designPreview.selectedDesignId === design.id ? 2 : 1,
                        borderColor: designPreview.selectedDesignId === design.id ? 'primary.main' : 'divider',
                        '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                      }}
                      onClick={() => handleSelectDesign(design.id)}
                    >
                      <Box component="img" src={`http://localhost:3001/${design.imageUrl}`} alt={design.concept} sx={{ width: '100%', height: 200, objectFit: 'cover' }} />
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">Option</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}

                {/* Loading placeholders during iteration */}
                {isLoading && selectedId && proposals.length === 0 && (
                  [0,1,2].map((i) => (
                    <Grid item xs={12} sm={6} md={4} key={`loading-${i}`}>
                      <Card sx={{ height: '100%' }}>
                        <Box sx={{ width: '100%', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CircularProgress />
                        </Box>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary">Generating...</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))
                )}
              </Grid>
            </Grid>
          </Grid>

          {designPreview.selectedDesign && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Selected Design:</strong> {designPreview.selectedDesign.concept}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                This design will be used as a reference for your 3D modeling workspace below.
              </Typography>
            </Alert>
          )}

          {/* Parts list moved to DesignPartsGenerator component */}
        </Box>
      )}

      {!designPreview && !isLoading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <AutoAwesome sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Design Preview Generated Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Click "Generate Designs" to create 3 preview images for the same concept. Choose the one you prefer.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};
