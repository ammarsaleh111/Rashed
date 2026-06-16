import { Router } from 'express';

import { checkoutCart, getMyOrders } from '../controllers/orderController.js';
import { optionalAuth, requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', optionalAuth, checkoutCart);
router.post('/checkout', optionalAuth, checkoutCart);
router.get('/my', requireAuth, getMyOrders);

export default router;
