import express from 'express';
import {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getNotificationCount,
    deleteNotification,
    getExpiringMedicinesNotifications
} from '../controllers/notificationController.js';

const router = express.Router();

// Notification routes
router.get('/', getNotifications);
router.get('/count', getNotificationCount);
router.get('/expiring-medicines', getExpiringMedicinesNotifications);
router.put('/:id/read', markNotificationAsRead);
router.put('/mark-all-read', markAllNotificationsAsRead);
router.delete('/:id', deleteNotification);

export default router;

