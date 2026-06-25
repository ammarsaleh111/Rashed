import { Router } from 'express';

import { getAdminDashboard } from '../controllers/adminController.js';
import {
	createAdminProduct,
	deleteAdminProduct,
	getAdminProducts,
	uploadAdminProductImage,
	updateAdminProduct,
} from '../controllers/adminProductController.js';
import {
	getAdminOrderById,
	getAdminOrders,
	updateAdminOrderStatus,
} from '../controllers/adminOrderController.js';
import {
	deleteAdminMessage,
	getAdminMessages,
	updateAdminMessage,
} from '../controllers/adminMessageController.js';
import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/dashboard', getAdminDashboard);
router.get('/products', getAdminProducts);
router.post('/products/upload', uploadAdminProductImage);
router.post('/products', createAdminProduct);
router.put('/products/:id', updateAdminProduct);
router.delete('/products/:id', deleteAdminProduct);
router.get('/orders', getAdminOrders);
router.get('/orders/:id', getAdminOrderById);
router.patch('/orders/:id/status', updateAdminOrderStatus);
router.get('/messages', getAdminMessages);
router.patch('/messages/:id', updateAdminMessage);
router.delete('/messages/:id', deleteAdminMessage);

export default router;


