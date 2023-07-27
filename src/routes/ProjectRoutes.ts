import express from 'express';
import ProjectController from '../controllers/projectController';
import {checkOwnerShip} from '../middlewares';
import multer from 'multer';

const extractFile = multer();

const router = express.Router();

router.get('/project/', ProjectController.getConSolidProjects);

router.post('/project/create', checkOwnerShip, ProjectController.createConSolidProject);
router.get('/project/:projectId', ProjectController.getConSolidProject);
router.post('/project/:projectId/dataset', extractFile.single('file'), checkOwnerShip, ProjectController.addDataset);
router.post('/project/:projectId/addStakeholder', checkOwnerShip, ProjectController.addStakeholders);

export default router;
