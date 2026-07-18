import express from 'express';
import { body } from 'express-validator';
import { protect, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getGames, createGame, updateGame, deleteGame } from '../controllers/gamesController.js';

const router = express.Router();

router.get('/', protect, getGames);
router.post(
  '/',
  protect,
  authorizeRoles('admin'),
  [body('name').isString().notEmpty(), body('description').optional().isString(), body('active').optional().isBoolean()],
  validate,
  createGame,
);
router.put(
  '/:id',
  protect,
  authorizeRoles('admin'),
  [body('name').isString().notEmpty(), body('description').optional().isString(), body('active').optional().isBoolean()],
  validate,
  updateGame,
);
router.delete('/:id', protect, authorizeRoles('admin'), deleteGame);

export default router;
