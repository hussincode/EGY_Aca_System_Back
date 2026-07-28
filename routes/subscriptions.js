import express from 'express';
import { protect, authorizeRoles } from '../middleware/auth.js';
import { getSubscriptions, createSubscription, updateSubscription, deleteSubscription } from '../controllers/subscriptionsController.js';

const router = express.Router();

router.get('/', protect, getSubscriptions);
router.post('/', protect, authorizeRoles('admin', 'manager', 'accountant'), createSubscription);
router.put('/:id', protect, authorizeRoles('admin', 'manager', 'accountant'), updateSubscription);
router.delete('/:id', protect, authorizeRoles('admin', 'manager', 'accountant'), deleteSubscription);

export default router;
