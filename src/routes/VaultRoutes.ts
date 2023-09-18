import express from 'express';
import VaultController from '../controllers/VaultController';
const router = express.Router();

router.get('/access', VaultController.getAccessCertificate);
router.post('/verify', VaultController.verify)
router.post('/validate', VaultController.validate)

export default router; 
  