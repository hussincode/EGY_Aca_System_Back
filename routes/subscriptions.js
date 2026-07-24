import express from 'express';
import { body } from 'express-validator';
import { protect, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getSubscriptions, createSubscription, updateSubscription, deleteSubscription } from '../controllers/subscriptionsController.js';

const router = express.Router();

router.get('/', protect, getSubscriptions);
router.post(
  '/',
  protect,
  authorizeRoles('admin', 'manager', 'accountant'),
  [
    body('player_id').isUUID(),
    body('subscription_value').isNumeric(),
    body('start_date').isISO8601(),
    body('end_date').isISO8601(),
    body('sessions').optional().isInt({ min: 0 }),
    body('paid_amount').optional().isNumeric(),
    body('status').optional().isString(),
    body('invoice_number').optional().isString(),
  ],
  validate,
  createSubscription,
);
router.put('/:id', protect, authorizeRoles('admin', 'manager', 'accountant'), updateSubscription);
router.delete('/:id', protect, authorizeRoles('admin', 'manager', 'accountant'), deleteSubscription);

export default router;
