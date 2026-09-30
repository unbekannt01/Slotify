import { Router } from 'express';
import {
  getPublicShops,
  getPublicShopStatus,
  updateShopSettings,
  updateShopSlots,
} from '../controllers/shopController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// Public routes (for future customer site & app public discovery)
router.get('/', getPublicShops);
router.get('/:id/status', getPublicShopStatus);

// Protected routes (Owner or Admin)
router.patch(
  '/:id/settings',
  authMiddleware,
  requireRole('owner', 'admin'),
  updateShopSettings
);

router.patch(
  '/:id/slots',
  authMiddleware,
  requireRole('owner', 'admin'),
  updateShopSlots
);

export default router;
