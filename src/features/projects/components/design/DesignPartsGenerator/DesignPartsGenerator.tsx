import React, { Suspense, useMemo } from 'react';
import { Box, Button, Card, Grid, Typography, Alert, CircularProgress } from '@mui/material';
import { AutoAwesome } from '@mui/icons-material';
import { useDesignPreview } from '../../../hooks/useDesignPreview';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { api } from '../../../../../shared/services/api';

interface Props { projectId: string; }

export const DesignPartsGenerator: React.FC<Props> = ({ projectId }) => {
  const { designPreview, isLoading, error, startCad, cadParts, latestCad, retryPart, retryingPartIds, retryErrors } = useDesignPreview(projectId) as any;
  const apiOrigin = useMemo(() => {
    const base = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    return base.replace(/\/?api\/?$/, '');
  }, []);

  const StlModel: React.FC<{ url: string }> = ({ url }) => {
    const geometry = useLoader(STLLoader, url);
    // Center geometry for better framing
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

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">3D Parts Generation</Typography>
        <Button
          variant="outlined"
          startIcon={<AutoAwesome />}
          onClick={startCad}
          disabled={isLoading || latestCad?.status === 'pending' || !designPreview?.selectedDesign}
        >
          {latestCad?.status === 'pending' ? 'Generating…' : 'Generate 3D Parts'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {(isLoading || latestCad?.status === 'pending') && (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CircularProgress size={22} sx={{ mr: 1 }} />
          <Typography>
            Generating parts{typeof latestCad?.progress === 'number' ? ` ${latestCad.progress}%` : '...'}
            {typeof latestCad?.completedParts === 'number' && typeof latestCad?.totalParts === 'number'
              ? ` (${latestCad.completedParts}/${latestCad.totalParts})` : ''}
          </Typography>
        </Box>
      )}

      {Array.isArray(cadParts) && cadParts.length > 0 && (
        <Grid container spacing={2}>
          {cadParts.map((p: any) => (
            <Grid item xs={12} md={6} key={p.id}>
              <Card sx={{ p: 2 }}>
                <Typography variant="subtitle1">{p.name} ({p.key})</Typography>
                {p.description && (
                  <Typography variant="body2" color="text.secondary">{p.description}</Typography>
                )}
                <Typography variant="body2" sx={{ mt: 1 }}>Status: {p.status}</Typography>
                {p.status === 'failed' && (
                  <>
                    {p.errorLog && (
                      <Typography variant="body2" color="error">{p.errorLog}</Typography>
                    )}
                    <Box sx={{ mt: 1 }}>
                      <Button size="small" variant="outlined" onClick={() => retryPart(p.id)} disabled={retryingPartIds?.has(p.id)}>
                        {retryingPartIds?.has(p.id) ? 'Retrying…' : 'Retry this part'}
                      </Button>
                      {retryErrors?.[p.id] && (
                        <Typography variant="body2" color="error" sx={{ mt: 1 }}>{retryErrors[p.id]}</Typography>
                      )}
                    </Box>
                  </>
                )}
                {retryingPartIds?.has(p.id) && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <CircularProgress size={18} sx={{ mr: 1 }} />
                    <Typography variant="body2">Retry in progress…</Typography>
                  </Box>
                )}
                {p.status === 'success' && (
                  <Box sx={{ height: 240, mt: 1, borderRadius: 1, overflow: 'hidden', background: '#f0f0f0' }}>
                    <Canvas camera={{ position: [120, 90, 120], fov: 50 }} shadows>
                      <ambientLight intensity={0.6} />
                      <directionalLight position={[100, 100, 50]} intensity={1} castShadow />
                      <Suspense fallback={null}>
                        <StlModel url={`${apiOrigin}/api/design-previews/cad/parts/${p.id}/stl`} />
                      </Suspense>
                      <OrbitControls enablePan enableZoom enableRotate />
                    </Canvas>
                  </Box>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Debug: show analysis and parts JSON used for generation */}
      {latestCad && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>Analysis JSON</Typography>
          <Box component="pre" sx={{ p: 2, bgcolor: '#0f172a', color: '#e2e8f0', borderRadius: 1, overflow: 'auto', maxHeight: 300 }}>
            {JSON.stringify(latestCad.analysisJson ?? {}, null, 2)}
          </Box>
          <Typography variant="subtitle1" sx={{ mt: 2 }} gutterBottom>Parts JSON</Typography>
          <Box component="pre" sx={{ p: 2, bgcolor: '#0f172a', color: '#e2e8f0', borderRadius: 1, overflow: 'auto', maxHeight: 300 }}>
            {JSON.stringify(latestCad.partsJson ?? {}, null, 2)}
          </Box>
        </Box>
      )}
    </Box>
  );
};



