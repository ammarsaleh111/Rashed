import { Router } from 'express';

import { submitContactMessage } from '../controllers/contactController.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/messages', optionalAuth, submitContactMessage);

export default router;
