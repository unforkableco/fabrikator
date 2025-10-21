import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Visibility,
  VisibilityOff,
  MoreVert,
  Memory,
  Settings,
  Palette,
  Build,
  Delete,
  Edit,
  ContentCopy
} from '@mui/icons-material';
import { SceneGraphNode } from '../../../hooks/useScene3D';

interface SceneGraphProps {
  sceneGraph: SceneGraphNode | null;
  selectedNodes: string[];
  onSelectNode: (nodeId: string, multiSelect?: boolean) => void;
  onUpdateNode: (nodeId: string, updates: Partial<SceneGraphNode>) => void;
  onRemoveNode: (nodeId: string) => void;
}

interface SceneNodeItemProps {
  node: SceneGraphNode;
  level: number;
  isSelected: boolean;
  onSelect: (nodeId: string, multiSelect?: boolean) => void;
  onUpdate: (nodeId: string, updates: Partial<SceneGraphNode>) => void;
  onRemove: (nodeId: string) => void;
}

const getNodeIcon = (type: string) => {
  switch (type) {
    case 'ELECTRONIC':
      return <Memory fontSize="small" />;
    case 'MECHANICAL':
      return <Settings fontSize="small" />;
    case 'DESIGN':
      return <Palette fontSize="small" />;
    case 'FUNCTIONAL':
      return <Build fontSize="small" />;
    default:
      return <Settings fontSize="small" />;
  }
};

const getNodeColor = (type: string): string => {
  switch (type) {
    case 'ELECTRONIC':
      return '#4caf50';
    case 'MECHANICAL':
      return '#9e9e9e';
    case 'DESIGN':
      return '#e91e63';
    case 'FUNCTIONAL':
      return '#2196f3';
    default:
      return '#757575';
  }
};

const SceneNodeItem: React.FC<SceneNodeItemProps> = ({
  node,
  level,
  isSelected,
  onSelect,
  onUpdate,
  onRemove
}) => {
  const [expanded, setExpanded] = useState(true);
  const [visible, setVisible] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editName, setEditName] = useState(node.name);

  const hasChildren = node.children && node.children.length > 0;

  const handleClick = (event: React.MouseEvent) => {
    onSelect(node.id, event.ctrlKey || event.metaKey);
  };

  const handleToggleExpanded = (event: React.MouseEvent) => {
    event.stopPropagation();
    setExpanded(!expanded);
  };

  const handleToggleVisibility = (event: React.MouseEvent) => {
    event.stopPropagation();
    setVisible(!visible);
    // TODO: Update node metadata with visibility state
    onUpdate(node.id, {
      metadata: {
        ...node.metadata,
        visible: !visible
      }
    });
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setAnchorEl(event.currentTarget as HTMLElement);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleRename = () => {
    setEditDialog(true);
    handleCloseMenu();
  };

  const handleDelete = () => {
    onRemove(node.id);
    handleCloseMenu();
  };

  const handleDuplicate = () => {
    // TODO: Implement duplication logic
    console.log('Duplicate node:', node.id);
    handleCloseMenu();
  };

  const handleSaveRename = () => {
    if (editName.trim() && editName !== node.name) {
      onUpdate(node.id, { name: editName.trim() });
    }
    setEditDialog(false);
  };

  const handleCancelRename = () => {
    setEditName(node.name);
    setEditDialog(false);
  };

  return (
    <>
      <ListItem 
        disablePadding 
        sx={{ 
          pl: level * 2,
          bgcolor: isSelected ? 'action.selected' : 'transparent',
          '&:hover': {
            bgcolor: isSelected ? 'action.selected' : 'action.hover'
          }
        }}
      >
        <ListItemButton
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          sx={{ py: 0.5 }}
        >
          {/* Expand/Collapse Button */}
          <Box sx={{ width: 24, display: 'flex', justifyContent: 'center' }}>
            {hasChildren ? (
              <IconButton
                size="small"
                onClick={handleToggleExpanded}
                sx={{ p: 0.25 }}
              >
                {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
              </IconButton>
            ) : null}
          </Box>

          {/* Node Icon */}
          <ListItemIcon sx={{ minWidth: 32 }}>
            {getNodeIcon(node.type)}
          </ListItemIcon>

          {/* Node Name and Type */}
          <ListItemText
            primary={node.name}
            secondary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <Chip
                  label={node.type.toLowerCase()}
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: '0.6rem',
                    bgcolor: getNodeColor(node.type),
                    color: 'white'
                  }}
                />
                {node.componentId && (
                  <Typography variant="caption" color="text.secondary">
                    • STL
                  </Typography>
                )}
              </Box>
            }
            sx={{ 
              '& .MuiListItemText-primary': { 
                fontSize: '0.875rem',
                fontWeight: isSelected ? 600 : 400
              }
            }}
          />

          {/* Visibility Toggle */}
          <IconButton
            size="small"
            onClick={handleToggleVisibility}
            sx={{ 
              p: 0.5,
              opacity: visible ? 1 : 0.5
            }}
          >
            {visible ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
          </IconButton>

          {/* More Options */}
          <IconButton
            size="small"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              setAnchorEl(e.currentTarget);
            }}
            sx={{ p: 0.5 }}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </ListItemButton>
      </ListItem>

      {/* Children */}
      {hasChildren && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          {node.children.map(child => (
            <SceneNodeItem
              key={child.id}
              node={child}
              level={level + 1}
              isSelected={isSelected}
              onSelect={onSelect}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))}
        </Collapse>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        PaperProps={{
          sx: { minWidth: 150 }
        }}
      >
        <MenuItem onClick={handleRename}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Rename
        </MenuItem>
        <MenuItem onClick={handleDuplicate}>
          <ContentCopy fontSize="small" sx={{ mr: 1 }} />
          Duplicate
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Rename Dialog */}
      <Dialog open={editDialog} onClose={handleCancelRename} maxWidth="sm" fullWidth>
        <DialogTitle>Rename Node</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Node Name"
            value={editName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
            onKeyPress={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter') {
                handleSaveRename();
              }
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelRename}>Cancel</Button>
          <Button onClick={handleSaveRename} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export const SceneGraph: React.FC<SceneGraphProps> = ({
  sceneGraph,
  selectedNodes,
  onSelectNode,
  onUpdateNode,
  onRemoveNode
}) => {
  if (!sceneGraph) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No scene loaded
        </Typography>
      </Box>
    );
  }

  if (!sceneGraph.children || sceneGraph.children.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Scene is empty
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          Add components from the Library tab
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" color="text.secondary">
          Scene Hierarchy ({sceneGraph.children.length} objects)
        </Typography>
      </Box>

      {/* Scene Tree */}
      <List dense sx={{ py: 0 }}>
        {sceneGraph.children.map(node => (
          <SceneNodeItem
            key={node.id}
            node={node}
            level={0}
            isSelected={selectedNodes.includes(node.id)}
            onSelect={onSelectNode}
            onUpdate={onUpdateNode}
            onRemove={onRemoveNode}
          />
        ))}
      </List>

      {/* Scene Stats */}
      <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
        <Typography variant="caption" color="text.secondary">
          Selected: {selectedNodes.length} / {sceneGraph.children.length}
        </Typography>
      </Box>
    </Box>
  );
};