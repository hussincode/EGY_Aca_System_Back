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
  authorizeRoles('admin', 'manager'),
  [
    body('name').isString().notEmpty(),
    body('playerSerial').optional({ nullable: true }).isString(),
    body('age').optional({ nullable: true }).isInt(),
    body('phone').optional({ nullable: true }).isString(),
    body('game_id').optional({ nullable: true }).isUUID(),
    body('branch_id').optional({ nullable: true }).isUUID(),
    body('status').optional({ nullable: true }).isString(),
    body('photo').optional({ nullable: true }).isString(),
    body('schedule').optional({ nullable: true }).isString(),
    body('member_type').optional({ nullable: true }).isString(),
    body('member_id').optional({ nullable: true }).isString(),
    body('member_expiry').optional({ nullable: true }).isString(),
    body('member_value').optional({ nullable: true }).isFloat(),
    body('amb_ref_code').optional({ nullable: true }).isString(),
    body('joined').optional({ nullable: true }).isBoolean(),
    body('join_date').optional({ nullable: true }).isString(),
  ],
  validate,
  createPlayer,
);
router.put('/:id', protect, authorizeRoles('admin', 'manager'), updatePlayer);
router.delete('/:id', protect, authorizeRoles('admin', 'manager'), deletePlayer);

export default router;
