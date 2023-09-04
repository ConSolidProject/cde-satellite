import express from 'express';
import ProjectController from '../controllers/projectController';
import {checkOwnership} from '../middlewares';
import multer from 'multer';

const extractFile = multer();

const router = express.Router();

router.get('/project/', ProjectController.getConSolidProjects);

router.post('/project/create', checkOwnership, ProjectController.createConSolidProject);
router.get('/project/:projectId', ProjectController.getConSolidProject);
router.post('/project/:projectId/dataset', extractFile.single('file'), checkOwnership, ProjectController.addDataset);
router.post('/project/:projectId/aggregate', checkOwnership, ProjectController.addPartialProjects);
// router.post('/project/:projectId/addStakeholder', checkOwnership, ProjectController.addStakeholders);

export default router;
