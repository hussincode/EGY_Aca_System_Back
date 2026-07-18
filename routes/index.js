import express from 'express';
import authRoutes from './auth.js';
import branchesRoutes from './branches.js';
import gamesRoutes from './games.js';
import playersRoutes from './players.js';

const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/branches', branchesRoutes);
apiRouter.use('/games', gamesRoutes);
apiRouter.use('/players', playersRoutes);

export { apiRouter as routes };


