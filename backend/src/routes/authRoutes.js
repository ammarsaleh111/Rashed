import express from 'express';
import { getCurrentUserProfile, loginUser, registerUser } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', requireAuth, getCurrentUserProfile);

export default router;
