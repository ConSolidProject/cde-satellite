import express from 'express';
import ProjectController from '../controllers/projectController';
import {checkOwnership} from '../middlewares';
import {extractFile} from '../constants'

const router = express.Router();

router.get('/project/', ProjectController.getConSolidProjects);
router.get('/project/:projectId', ProjectController.getConSolidProject);
router.post('/project/create', checkOwnership, ProjectController.createConSolidProject);
// router.patch('/project/:projectId', checkOwnership, ProjectController.updateConSolidProject);
router.delete('/project/:projectId', checkOwnership, ProjectController.deleteConSolidProject);


router.post('/project/:projectId/datasets', ProjectController.getConSolidDatasets);

router.post('/project/:projectId/dataset', extractFile.single('file'), checkOwnership, ProjectController.addDataset);

router.delete('/dataset/:id', checkOwnership, ProjectController.deleteDataset);

router.delete('/distribution/:id', checkOwnership, ProjectController.deleteDistribution);

router.post('/project/:projectId/aggregate', checkOwnership, ProjectController.addPartialProjects);
router.post('/project/:projectId/reference', checkOwnership, ProjectController.createReference);
router.get('/project/:projectId/referenceregistry', checkOwnership, ProjectController.getReferenceRegistry);


router.get('/project/:projectId/shape', ProjectController.getShapes);
router.post('/project/:projectId/shapecollection', checkOwnership, ProjectController.addShapeCollection);

// router.post('/project/:projectId/addStakeholder', checkOwnership, ProjectController.addStakeholders);

export default router; 
   