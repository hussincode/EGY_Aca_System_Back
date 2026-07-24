import express from 'express';
import authRoutes from './auth.js';
import branchesRoutes from './branches.js';
import gamesRoutes from './games.js';
import playersRoutes from './players.js';
import subscriptionsRoutes from './subscriptions.js';
import leadsRoutes from './leads.js';
import staffRoutes from './staff.js';
import financeRoutes from './finance.js';
import attendanceRoutes from './attendance.js';
import ambassadorsRoutes from './ambassadors.js';
import usersRoutes from './users.js';
import landingSettingsRoutes from './landingSettings.js';

const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/branches', branchesRoutes);
apiRouter.use('/games', gamesRoutes);
apiRouter.use('/players', playersRoutes);
apiRouter.use('/subscriptions', subscriptionsRoutes);
apiRouter.use('/leads', leadsRoutes);
apiRouter.use('/staff', staffRoutes);
apiRouter.use('/finance', financeRoutes);
apiRouter.use('/attendance', attendanceRoutes);
apiRouter.use('/ambassadors', ambassadorsRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/landing-settings', landingSettingsRoutes);

export { apiRouter as routes };


