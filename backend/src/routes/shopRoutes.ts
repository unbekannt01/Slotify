import { Router } from 'express';
import {
  getPublicShops,
  getPublicShopStatus,
  bookShopSlot,
  cancelShopBooking,
  updateShopSettings,
  updateShopSlots,
  handleVoiceAssistantCommand,
} from '../controllers/shopController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// Public routes (for customer web discovery & instant walk-in booking)
router.get('/', getPublicShops);
router.get('/:id/status', getPublicShopStatus);
router.post('/:id/book', bookShopSlot);
router.patch('/:id/book', bookShopSlot);
router.post('/:id/cancel-booking', cancelShopBooking);

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

// Voice Assistant route for shop owners
router.post(
  '/:id/voice-assistant',
  authMiddleware,
  requireRole('owner', 'admin'),
  handleVoiceAssistantCommand
);

export default router;
