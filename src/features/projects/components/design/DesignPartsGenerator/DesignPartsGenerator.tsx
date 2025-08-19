import React, { Suspense, useMemo, useState } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  Grid, 
  Typography, 
  Alert, 
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { 
  AutoAwesome, 
  Settings, 
  CheckCircle, 
  Warning, 
  Error,
  Info,
  ExpandMore,
  Build,
  Assessment,
  Refresh,
  Visibility
} from '@mui/icons-material';
import { useDesignPreview } from '../../../hooks/useDesignPreview';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';

interface Props { projectId: string; }

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
  </div>
);

export const DesignPartsGenerator: React.FC<Props> = ({ projectId }) => {
  const { 
    designPreview, 
    isCadLoading, 
    error, 
    enhancedConfig,
    setEnhancedConfig,
    startEnhancedCad,
    enhancedStatus,
    validationResults,
    // Legacy fallback
    startCad,
    cadParts,
    latestCad
  } = useDesignPreview(projectId);

  const [activeTab, setActiveTab] = useState(0);
  const [activeIterTab, setActiveIterTab] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // Consider either selectedDesign or selectedDesignId as a valid selection
  const hasSelectedDesign = Boolean((designPreview as any)?.selectedDesign || (designPreview as any)?.selectedDesignId);

  const apiOrigin = useMemo(() => {
    const base = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    return base.replace(/\/?api\/?$/, '');
  }, []);

  const StlModel: React.FC<{ url: string }> = ({ url }) => {
    const geometry = useLoader(STLLoader, url);
    const centered = useMemo(() => {
      const g = geometry.clone();
      g.computeBoundingBox();
      g.center();
      return g;
    }, [geometry]);
    return (
      <mesh geometry={centered} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={new THREE.Color('#b0bec5')} metalness={0.1} roughness={0.8} />
      </mesh>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle color="success" />;
      case 'warning': return <Warning color="warning" />;
      case 'failed': return <Error color="error" />;
      default: return <Info color="info" />;
    }
  };

  const getStageDescription = (stage: string) => {
    const stageDescriptions: Record<string, string> = {
      'initializing': 'Setting up enhanced pipeline...',
      'hardware_analysis': 'Analyzing hardware components and specifications',
      'assembly_planning': 'Planning assembly strategy and part relationships',
      'manufacturing_constraints': 'Optimizing for 3D printing manufacturing',
      'enhanced_parts_design': 'Generating parts with full assembly context',
      'iteration_1': 'Generating CAD scripts and validating assembly',
      'iteration_2': 'Refining design based on validation feedback',
      'iteration_3': 'Final refinement and optimization',
      'validation': 'Validating assembly compatibility and quality',
      'refinement': 'Applying design improvements',
      'finalizing': 'Completing pipeline and generating final results',
      'completed': 'Enhanced pipeline completed successfully'
    };
    return stageDescriptions[stage] || stage;
  };

  // Prefer real CAD parts (with valid IDs). If not available, show placeholders from enhanced status
  const displayParts = (Array.isArray(cadParts) && cadParts.length > 0)
    ? cadParts
    : (enhancedStatus?.parts
      ? Array.from({ length: enhancedStatus.parts.total }, (_, i) => ({
          id: `enhanced_part_${i}`,
          name: `Enhanced Part ${i + 1}`,
          key: `part_${i}`,
          status: i < enhancedStatus.parts.successful ? 'success' :
                   i < enhancedStatus.parts.successful + enhancedStatus.parts.processing ? 'processing' : 'failed',
          placeholder: true
        }))
      : []);

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Enhanced 3D Parts Generation
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
            startIcon={<Settings />}
            onClick={() => setShowSettings(!showSettings)}
            size="small"
          >
            Settings
          </Button>
          <Button
            variant="contained"
          startIcon={<AutoAwesome />}
            onClick={startEnhancedCad}
            disabled={isCadLoading || !hasSelectedDesign}
        >
            {isCadLoading ? 'Generating…' : 'Generate Enhanced 3D Parts'}
        </Button>
        </Box>
      </Box>

      {/* Enhanced Configuration Panel */}
      {showSettings && (
        <Card sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="h6" gutterBottom>Enhanced Pipeline Configuration</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Material Type</InputLabel>
                <Select
                  value={enhancedConfig.materialType}
                  label="Material Type"
                  onChange={(e: SelectChangeEvent) => setEnhancedConfig({ materialType: e.target.value })}
                >
                  <MenuItem value="PLA">PLA (Recommended)</MenuItem>
                  <MenuItem value="PETG">PETG</MenuItem>
                  <MenuItem value="ABS">ABS</MenuItem>
                  <MenuItem value="TPU">TPU (Flexible)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Quality Target</InputLabel>
                <Select
                  value={enhancedConfig.qualityTarget}
                  label="Quality Target"
                  onChange={(e: SelectChangeEvent) => setEnhancedConfig({ qualityTarget: e.target.value as any })}
                >
                  <MenuItem value="draft">Draft (Fast)</MenuItem>
                  <MenuItem value="standard">Standard</MenuItem>
                  <MenuItem value="high">High Quality</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography gutterBottom>Max Refinement Iterations</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2">1</Typography>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={enhancedConfig.maxRefinementIterations}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setEnhancedConfig({ maxRefinementIterations: parseInt(e.target.value) })
                  }
                  style={{ flex: 1 }}
                />
                <Typography variant="body2">5</Typography>
                <Chip label={enhancedConfig.maxRefinementIterations} size="small" />
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <input
                  type="checkbox"
                  checked={enhancedConfig.enableValidation}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setEnhancedConfig({ enableValidation: e.target.checked })
                  }
                />
                <Typography>Enable Validation</Typography>
              </Box>
            </Grid>
          </Grid>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>{error}</Typography>
        </Alert>
      )}

      {/* Enhanced Progress Display */}
      {enhancedStatus && (
        <Card sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Pipeline Progress</Typography>
            <Chip 
              label={enhancedStatus.pipelineType} 
              color="primary" 
              variant="outlined"
            />
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">{getStageDescription(enhancedStatus.stage)}</Typography>
              <Typography variant="body2">{enhancedStatus.progress}%</Typography>
            </Box>
            <LinearProgress variant="determinate" value={enhancedStatus.progress} />
          </Box>

          {/* Pipeline Metrics */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary.main">
                  {enhancedStatus.parts.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">Total Parts</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {enhancedStatus.parts.successful}
                </Typography>
                <Typography variant="body2" color="text.secondary">Successful</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {enhancedStatus.parts.processing}
                </Typography>
                <Typography variant="body2" color="text.secondary">Processing</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="error.main">
                  {enhancedStatus.parts.failed}
                </Typography>
                <Typography variant="body2" color="text.secondary">Failed</Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Analysis Progress */}
          {enhancedStatus.analysis && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Analysis Progress</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getStatusIcon(enhancedStatus.analysis.hardwareSpecs ? 'success' : 'pending')}
                    <Typography variant="body2">
                      Hardware Analysis ({enhancedStatus.analysis.componentsAnalyzed} components)
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getStatusIcon(enhancedStatus.analysis.assemblyPlan ? 'success' : 'pending')}
                    <Typography variant="body2">
                      Assembly Planning ({enhancedStatus.analysis.interfacesDefined} interfaces)
          </Typography>
        </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getStatusIcon(enhancedStatus.analysis.manufacturingConstraints ? 'success' : 'pending')}
                    <Typography variant="body2">Manufacturing Optimization</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </Card>
      )}

      {/* Results Tabs */}
      {(enhancedStatus || displayParts.length > 0) && (
        <Card sx={{ p: 0 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={(_: React.SyntheticEvent, newValue: number) => setActiveTab(newValue)}>
              <Tab icon={<Build />} label="Parts" iconPosition="start" />
              <Tab icon={<Assessment />} label="Validation" iconPosition="start" />
              <Tab icon={<Visibility />} label="Analysis" iconPosition="start" />
            </Tabs>
          </Box>

          <TabPanel value={activeTab} index={0}>
            {/* Parts Display */}
            {enhancedStatus?.parts?.byIteration && Object.keys(enhancedStatus.parts.byIteration).length > 0 ? (
              <Box>
                <Tabs sx={{ mb: 2 }} value={activeIterTab} onChange={(e: React.SyntheticEvent, v: number) => setActiveIterTab(v)} variant="scrollable" scrollButtons allowScrollButtonsMobile>
                  {Object.keys(enhancedStatus.parts.byIteration).map((iterKey, idx) => (
                    <Tab key={iterKey} label={`Iteration ${iterKey}`} value={idx} />
                  ))}
                </Tabs>
                {Object.entries(enhancedStatus.parts.byIteration).map(([iterKey, parts], idx) => (
                  idx === activeIterTab ? (
                    <div key={iterKey}>
        <Grid container spacing={2}>
                        {parts.map((part: any) => (
                          <Grid item xs={12} md={6} key={part.id}>
              <Card sx={{ p: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle1">{part.name}</Typography>
                                <Chip 
                                  label={part.status} 
                                  color={part.status === 'success' ? 'success' : part.status === 'processing' ? 'warning' : 'error'}
                                  size="small"
                                />
                              </Box>
                              {part.status === 'success' && (
                                <Box sx={{ height: 200, mt: 1, borderRadius: 1, overflow: 'hidden', background: '#f0f0f0' }}>
                                  <Canvas camera={{ position: [120, 90, 120], fov: 50 }} shadows>
                                    <ambientLight intensity={0.6} />
                                    <directionalLight position={[100, 100, 50]} intensity={1} castShadow />
                                    <Suspense fallback={null}>
                                      <StlModel url={`${apiOrigin}/api/design-previews/cad/parts/${part.id}/stl`} />
                                    </Suspense>
                                    <OrbitControls enablePan enableZoom enableRotate />
                                  </Canvas>
                    </Box>
                )}
                              {part.status === 'processing' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                  <CircularProgress size={20} sx={{ mr: 1 }} />
                                  <Typography variant="body2">Generating enhanced part...</Typography>
                  </Box>
                )}
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </div>
                  ) : null
                ))}
              </Box>
            ) : displayParts.length > 0 ? (
              <Grid container spacing={2}>
                {displayParts.map((part: any) => (
                  <Grid item xs={12} md={6} key={part.id}>
                    <Card sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1">{part.name}</Typography>
                        <Chip 
                          label={part.status} 
                          color={part.status === 'success' ? 'success' : part.status === 'processing' ? 'warning' : 'error'}
                          size="small"
                        />
                      </Box>
                      {part.status === 'success' && !part.placeholder && (
                        <Box sx={{ height: 200, mt: 1, borderRadius: 1, overflow: 'hidden', background: '#f0f0f0' }}>
                    <Canvas camera={{ position: [120, 90, 120], fov: 50 }} shadows>
                      <ambientLight intensity={0.6} />
                      <directionalLight position={[100, 100, 50]} intensity={1} castShadow />
                      <Suspense fallback={null}>
                              <StlModel url={`${apiOrigin}/api/design-previews/cad/parts/${part.id}/stl`} />
                      </Suspense>
                      <OrbitControls enablePan enableZoom enableRotate />
                    </Canvas>
                  </Box>
                )}
                      {part.status === 'success' && part.placeholder && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          <Info color="info" sx={{ mr: 1 }} />
                          <Typography variant="body2">STL not available yet. Parts are still being generated.</Typography>
                        </Box>
                      )}
                      {part.status === 'processing' && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          <CircularProgress size={20} sx={{ mr: 1 }} />
                          <Typography variant="body2">Generating enhanced part...</Typography>
                  </Box>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Build sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Parts Generated Yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Click "Generate Enhanced 3D Parts" to start the multi-agent pipeline.
                </Typography>
              </Box>
            )}
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            {/* Validation Results */}
            {validationResults ? (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">Validation Results</Typography>
                  <Chip 
                    label={validationResults.overallStatus} 
                    color={
                      validationResults.overallStatus === 'passed' ? 'success' : 
                      validationResults.overallStatus === 'warning' ? 'warning' : 'error'
                    }
                  />
                </Box>

                {/* Validation Summary */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="success.main">
                        {validationResults.summary.passedChecks}
                      </Typography>
                      <Typography variant="body2">Passed</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="error.main">
                        {validationResults.summary.failedChecks}
                      </Typography>
                      <Typography variant="body2">Failed</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="warning.main">
                        {validationResults.summary.warnings}
                      </Typography>
                      <Typography variant="body2">Warnings</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="info.main">
                        {validationResults.summary.totalChecks}
                      </Typography>
                      <Typography variant="body2">Total</Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Critical Issues */}
                {validationResults.criticalIssues.length > 0 && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle1">
                        Critical Issues ({validationResults.criticalIssues.length})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List>
                        {validationResults.criticalIssues.map((issue: any, index: number) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <Error color="error" />
                            </ListItemIcon>
                            <ListItemText
                              primary={issue.description}
                              secondary={`Severity: ${issue.severity} | Affected parts: ${issue.affected_parts?.join(', ')}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                )}

                {/* Recommendations */}
                {validationResults.recommendations?.immediate_fixes?.length > 0 && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle1">
                        Recommended Fixes ({validationResults.recommendations.immediate_fixes.length})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List>
                        {validationResults.recommendations.immediate_fixes.map((fix: string, index: number) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <Build color="primary" />
                            </ListItemIcon>
                            <ListItemText primary={fix} />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                )}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Assessment sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Validation Results Yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Validation results will appear here after the enhanced pipeline completes.
                </Typography>
              </Box>
            )}
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            {/* Analysis Data */}
            {enhancedStatus ? (
              <Box>
                <Typography variant="h6" gutterBottom>Pipeline Analysis</Typography>
                
                {/* Quality Score */}
                <Card sx={{ p: 2, mb: 2, bgcolor: 'primary.50' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1">Overall Quality Score</Typography>
                    <Typography variant="h4" color="primary.main">
                      {Math.round(enhancedStatus.qualityScore * 100)}%
                    </Typography>
                  </Box>
                </Card>

                {/* Refinement History */}
                {enhancedStatus.refinement.iterationsCompleted > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Refinement Iterations: {enhancedStatus.refinement.iterationsCompleted}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      The pipeline automatically refined the design {enhancedStatus.refinement.iterationsCompleted} times 
                      to improve quality and address validation issues.
                    </Typography>
                  </Box>
                )}

                {/* Timing Information */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>Timing</Typography>
                  <Typography variant="body2">
                    Started: {new Date(enhancedStatus.startedAt).toLocaleString()}
                  </Typography>
                  {enhancedStatus.finishedAt && (
                    <Typography variant="body2">
                      Completed: {new Date(enhancedStatus.finishedAt).toLocaleString()}
                    </Typography>
                  )}
                </Box>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Visibility sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Analysis Data Yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Analysis data will appear here during and after pipeline execution.
                </Typography>
              </Box>
            )}
          </TabPanel>
        </Card>
      )}

      {!enhancedStatus && !isCadLoading && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <AutoAwesome sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" color="text.secondary" gutterBottom>
            Enhanced 3D Parts Generation
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
            Our enhanced multi-agent pipeline analyzes your hardware components, plans the assembly, 
            optimizes for manufacturing, and generates assembly-ready 3D models with proper mounting 
            features and port cutouts.
          </Typography>
          {!hasSelectedDesign && (
            <Alert severity="info" sx={{ maxWidth: 600, mx: 'auto' }}>
              Please select a design preview above before generating 3D parts.
            </Alert>
          )}
        </Box>
      )}
    </Paper>
  );
};



