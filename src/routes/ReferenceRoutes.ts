import express from 'express';
import ReferenceController from '../controllers/ReferenceController';
import { checkOwnership } from '../middlewares';
import { extractFile } from '../constants';

const router = express.Router();


router.post('/:registryId/annotation', checkOwnership, ReferenceController.createAnnotation);
router.patch('/:registryId/annotation/:annotationId', checkOwnership, ReferenceController.updateAnnotation);

router.post('/:registryId/referencecollection', checkOwnership, ReferenceController.createReferenceCollection);
router.post('/:registryId/reference', checkOwnership, ReferenceController.createReference);
router.post('/:registryId/alias', checkOwnership, ReferenceController.createAlias);

export default router; 
   