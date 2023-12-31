import express from 'express';
import InboxController from '../controllers/InboxController';
import { checkOwnership } from '../middlewares';
const router = express.Router();

router.post('/inbox', InboxController.postMessage);
router.get('/inbox', checkOwnership, InboxController.getMessages);

router.post('/send', checkOwnership, InboxController.sendMessage)

export default router; 
  