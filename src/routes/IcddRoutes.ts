import express from 'express';
import IcddController from '../controllers/IcddController';

const router = express.Router();

router.get('/project/:projectId/icdd', IcddController.createIcddContainer);

export default router;
