import { Router } from 'express';

import { checkoutCart, getMyOrders } from '../controllers/orderController.js';
import { optionalAuth, requireAuth } from '../middleware/authMiddleware.js';
import { validateCreateOrderRequest } from '../validators/orderValidator.js';

const router = Router();

router.post('/', optionalAuth, validateCreateOrderRequest, checkoutCart);
router.post('/checkout', optionalAuth, validateCreateOrderRequest, checkoutCart);
router.get('/my', requireAuth, getMyOrders);

export default router;
