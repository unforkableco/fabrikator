import React, { Suspense, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { BufferGeometry, Mesh } from 'three';
import { Typography } from '@mui/material';
import { SceneGraphNode } from '../../../hooks/useScene3D';

interface Viewport3DProps {
  sceneGraph: SceneGraphNode | null;
  selectedNodes: string[];
  onSelectNode: (nodeId: string, multiSelect?: boolean) => void;
  onUpdateNode: (nodeId: string, updates: Partial<SceneGraphNode>) => void;
  onClearSelection: () => void;
}

interface STLMeshProps {
  node: SceneGraphNode;
  isSelected: boolean;
  onSelect: (nodeId: string, multiSelect?: boolean) => void;
  onUpdate: (nodeId: string, updates: Partial<SceneGraphNode>) => void;
}

const STLMesh: React.FC<STLMeshProps> = ({ node, isSelected, onSelect, onUpdate }) => {
  const meshRef = useRef<Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Load STL file if componentId exists
  let geometry: BufferGeometry | null = null;
  // For now, skip STL loading to avoid hook rules issues
  // TODO: Implement proper STL loading with Suspense boundary

  // Use box geometry as fallback
  const fallbackGeometry = React.useMemo(() => {
    const size = node.metadata?.size || [1, 1, 1];
    return new THREE.BoxGeometry(size[0], size[1], size[2]);
  }, [node.metadata?.size]);

  const actualGeometry = geometry || fallbackGeometry;

  // Helper for selected objects (disabled due to type conflicts)
  // useHelper(isSelected ? meshRef : null, BoxHelper, 'yellow');

  const handleClick = (event: any) => {
    event.stopPropagation();
    onSelect(node.id, event.ctrlKey || event.metaKey);
  };

  const handlePointerDown = (event: any) => {
    event.stopPropagation();
    setIsDragging(true);
    onSelect(node.id, false);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handlePointerMove = (event: any) => {
    if (isDragging && isSelected) {
      // Simple drag to move (can be enhanced with proper transform controls)
      const newPosition: [number, number, number] = [
        node.transform.position[0] + event.movementX * 0.01,
        node.transform.position[1],
        node.transform.position[2] + event.movementY * 0.01
      ];
      
      onUpdate(node.id, {
        transform: {
          ...node.transform,
          position: newPosition
        }
      });
    }
  };

  return (
    <group
      position={node.transform.position}
      rotation={node.transform.rotation}
      scale={node.transform.scale}
    >
      <mesh
        ref={meshRef}
        geometry={actualGeometry}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
      >
        <meshStandardMaterial 
          color={isSelected ? '#ffff00' : getColorByType(node.type)}
          transparent={isSelected}
          opacity={isSelected ? 0.8 : 1.0}
        />
      </mesh>
      
      {/* Render children recursively */}
      {node.children.map(child => (
        <STLMesh
          key={child.id}
          node={child}
          isSelected={isSelected}
          onSelect={onSelect}
          onUpdate={onUpdate}
        />
      ))}
    </group>
  );
};

const getColorByType = (type: string): string => {
  switch (type) {
    case 'ELECTRONIC': return '#4caf50'; // Green for electronics
    case 'MECHANICAL': return '#9e9e9e'; // Gray for mechanical
    case 'FUNCTIONAL': return '#2196f3'; // Blue for functional
    case 'DESIGN': return '#e91e63'; // Pink for design
    default: return '#ffffff';
  }
};

const Scene: React.FC<{
  sceneGraph: SceneGraphNode | null;
  selectedNodes: string[];
  onSelectNode: (nodeId: string, multiSelect?: boolean) => void;
  onUpdateNode: (nodeId: string, updates: Partial<SceneGraphNode>) => void;
  onClearSelection: () => void;
}> = ({ sceneGraph, selectedNodes, onSelectNode, onUpdateNode, onClearSelection }) => {
  const { camera } = useThree();

  // Set up camera position
  React.useEffect(() => {
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  const handleBackgroundClick = () => {
    onClearSelection();
  };

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1} 
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      {/* Grid */}
      <Grid 
        args={[20, 20]} 
        cellSize={1} 
        cellThickness={0.5} 
        cellColor="#c0c0c0" 
        sectionSize={5} 
        sectionThickness={1} 
        sectionColor="#606060"
        fadeDistance={30}
        fadeStrength={1}
      />

      {/* Scene Objects */}
      {sceneGraph && sceneGraph.children.map(node => (
        <STLMesh
          key={node.id}
          node={node}
          isSelected={selectedNodes.includes(node.id)}
          onSelect={onSelectNode}
          onUpdate={onUpdateNode}
        />
      ))}

      {/* Background click handler */}
      <mesh 
        onClick={handleBackgroundClick}
        position={[0, 0, -10]}
        visible={false}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Controls */}
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxPolarAngle={Math.PI / 2}
        minDistance={1}
        maxDistance={50}
      />
    </>
  );
};

// LoadingFallback removed - not currently used

const ErrorFallback: React.FC<{ error: any }> = ({ error }) => (
  <div 
    style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
      backgroundColor: '#ffebee',
      padding: '16px'
    }}
  >
    <Typography color="error" gutterBottom>
      Failed to load 3D scene
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {error?.message || 'Unknown error'}
    </Typography>
  </div>
);

export const Viewport3D: React.FC<Viewport3DProps> = ({
  sceneGraph,
  selectedNodes,
  onSelectNode,
  onUpdateNode,
  onClearSelection
}) => {
  const [error, setError] = useState<any>(null);

  if (error) {
    return <ErrorFallback error={error} />;
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [5, 5, 5], fov: 75 }}
        style={{ background: '#f0f0f0' }}
        onError={setError}
      >
        <Suspense fallback={null}>
          <Scene
            sceneGraph={sceneGraph}
            selectedNodes={selectedNodes}
            onSelectNode={onSelectNode}
            onUpdateNode={onUpdateNode}
            onClearSelection={onClearSelection}
          />
        </Suspense>
      </Canvas>
      
      {/* Viewport Info Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '0.75rem'
        }}
      >
        <Typography variant="caption" display="block">
          Objects: {sceneGraph?.children.length || 0}
        </Typography>
        <Typography variant="caption" display="block">
          Selected: {selectedNodes.length}
        </Typography>
        <Typography variant="caption" display="block" color="rgba(255,255,255,0.7)">
          Click: Select | Ctrl+Click: Multi-select | Drag: Move
        </Typography>
      </div>
    </div>
  );
};