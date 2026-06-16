import { Router } from 'express';
import { getProducts, getProductBySlug } from '../controllers/productController.js';

const router = Router();

router.get('/', getProducts);
router.get('/:slug', getProductBySlug);

export default router;