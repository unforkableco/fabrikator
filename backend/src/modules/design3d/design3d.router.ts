import { Router } from 'express';
import multer from 'multer';
import { Design3DController } from './design3d.controller';

const router = Router();
const design3dController = new Design3DController();

// Configure multer for STL file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept STL files
    if (file.mimetype === 'application/octet-stream' || 
        file.originalname.toLowerCase().endsWith('.stl')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// Component CRUD routes
router.post('/', design3dController.createComponent);
router.get('/stats', design3dController.getStats);
router.get('/:componentId', design3dController.getComponent);
router.put('/:componentId', design3dController.updateComponent);
router.delete('/:componentId', design3dController.deleteComponent);

// STL file management
router.post('/:componentId/upload', upload.single('stl'), design3dController.uploadSTL);
router.get('/:componentId/download', design3dController.downloadSTL);

// Search and filtering
router.get('/', design3dController.getComponents);

export default router;