import express from 'express';
import VaultController from '../controllers/VaultController';
import { checkOwnership } from '../middlewares';
import { extractFile } from '../constants';

const router = express.Router();

router.get('/access', VaultController.getAccessCertificate);
router.post('/sign', VaultController.sign)
router.post('/verify', VaultController.verify)
router.post('/validate', VaultController.validate)

router.post('/shapecollection', checkOwnership, VaultController.createShapeCollection);
router.post('/:shapeCollectionId/shape', extractFile.single('file'), checkOwnership,  VaultController.createShape);
router.post('/shape', extractFile.single('file'), checkOwnership,  VaultController.createShape);

router.post('/rulecollection', checkOwnership, VaultController.createRuleCollection)
router.post('/rule', checkOwnership, VaultController.createAccessRule)

router.post('/:ruleCollectionId/rule', checkOwnership, VaultController.addAccessRuleToCollection)
router.post('/authority', checkOwnership, VaultController.createAuthority)
router.post('/:requirementId/authority', checkOwnership, VaultController.addAuthorityToRequirement)

router.post('/requirement', checkOwnership, VaultController.createRequirement)

router.get('/pbac', VaultController.PBACInteraction) // get resource with PBAC
export default router; 
   