// Temporary fix for Material-UI type complexity issues
declare module '@mui/material' {
  import { ComponentType } from 'react';
  export const Box: ComponentType<any>;
  export const Grid: ComponentType<any>;
  export const Typography: ComponentType<any>;
  export const Card: ComponentType<any>;
  export const CardContent: ComponentType<any>;
  export const CardActions: ComponentType<any>;
  export const Button: ComponentType<any>;
  export const TextField: ComponentType<any>;
  export const InputAdornment: ComponentType<any>;
  export const Chip: ComponentType<any>;
  export const IconButton: ComponentType<any>;
  export const Dialog: ComponentType<any>;
  export const DialogTitle: ComponentType<any>;
  export const DialogContent: ComponentType<any>;
  export const DialogContentText: ComponentType<any>;
  export const DialogActions: ComponentType<any>;
  export const FormControl: ComponentType<any>;
  export const InputLabel: ComponentType<any>;
  export const Select: ComponentType<any>;
  export const Menu: ComponentType<any>;
  export const MenuItem: ComponentType<any>;
  export const Fab: ComponentType<any>;
  export const Paper: ComponentType<any>;
  export const Avatar: ComponentType<any>;
  export const ToggleButton: ComponentType<any>;
  export const ToggleButtonGroup: ComponentType<any>;
  export const Divider: ComponentType<any>;
  export const List: ComponentType<any>;
  export const ListItem: ComponentType<any>;
  export const ListItemButton: ComponentType<any>;
  export const ListItemIcon: ComponentType<any>;
  export const ListItemText: ComponentType<any>;
  export const ListItemSecondaryAction: ComponentType<any>;
  export const Collapse: ComponentType<any>;
  export const Accordion: ComponentType<any>;
  export const AccordionSummary: ComponentType<any>;
  export const AccordionDetails: ComponentType<any>;
  export const LinearProgress: ComponentType<any>;
  export const CircularProgress: ComponentType<any>;
  export const Tabs: ComponentType<any>;
  export const Tab: ComponentType<any>;
  export const Link: ComponentType<any>;
  export const AppBar: ComponentType<any>;
  export const Toolbar: ComponentType<any>;
  export const Snackbar: ComponentType<any>;
  export const Alert: ComponentType<any>;
  export const Tooltip: ComponentType<any>;
  export const Container: ComponentType<any>;
}

declare module '@mui/system' {
  interface Theme {
    [key: string]: any;
  }
}