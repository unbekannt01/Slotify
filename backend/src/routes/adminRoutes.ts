import { Router } from 'express';
import {
  getAdminShops,
  createOwnerAndShop,
  updateAdminShop,
  getAdminStats,
  deleteShop,
} from '../controllers/adminController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// Guard all admin routes with auth and admin role
router.use(authMiddleware, requireRole('admin'));

router.get('/shops', getAdminShops);
router.post('/shops', createOwnerAndShop);
router.post('/owners', createOwnerAndShop); // alias per brief
router.patch('/shops/:id', updateAdminShop);
router.delete('/shops/:id', deleteShop);
router.get('/stats', getAdminStats);

export default router;
