import express from 'express';
import { body } from 'express-validator';
import { protect, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getPlayers, createPlayer, updatePlayer, deletePlayer } from '../controllers/playersController.js';

const router = express.Router();

router.get('/', protect, getPlayers);
router.post(
  '/',
  protect,
  authorizeRoles('admin', 'manager', 'coach', 'accountant'),
  [body('name').isString().notEmpty(), body('playerSerial').optional().isString(), body('age').optional().isInt(), body('phone').optional().isString(), body('game_id').optional().isUUID(), body('branch_id').optional().isUUID(), body('status').optional().isString(), body('member_type').optional().isString(), body('joined').optional().isBoolean()],
  validate,
  createPlayer,
);
router.put('/:id', protect, authorizeRoles('admin', 'manager', 'coach', 'accountant'), updatePlayer);
router.delete('/:id', protect, authorizeRoles('admin', 'manager', 'coach', 'accountant'), deletePlayer);

export default router;
