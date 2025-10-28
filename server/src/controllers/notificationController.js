import db from '../config/db.js';
import jwt from 'jsonwebtoken';

// Helper function to get user from token
const getUserFromToken = (req) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return null;
    
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
};

// Get all notifications for a user
export const getNotifications = async (req, res) => {
    try {
        const user = getUserFromToken(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        const { type, is_read } = req.query;
        let query = 'SELECT * FROM notifications WHERE user_id = ?';
        let params = [user.userId];

        if (type && type !== 'all') {
            query += ' AND type = ?';
            params.push(type);
        }

        if (is_read !== undefined) {
            query += ' AND is_read = ?';
            params.push(is_read === 'true');
        }

        query += ' ORDER BY created_at DESC';

        const [notifications] = await db.execute(query, params);

        res.json({
            success: true,
            data: notifications
        });

    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Mark notification as read
export const markNotificationAsRead = async (req, res) => {
    try {
        const user = getUserFromToken(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        const { id } = req.params;

        // Check if notification belongs to user
        const [notifications] = await db.execute(
            'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
            [id, user.userId]
        );

        if (notifications.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        // Mark as read
        await db.execute(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [id, user.userId]
        );

        res.json({
            success: true,
            message: 'Notification marked as read'
        });

    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (req, res) => {
    try {
        const user = getUserFromToken(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        // Mark all as read
        await db.execute(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
            [user.userId]
        );

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });

    } catch (error) {
        console.error('Mark all notifications as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get notification count
export const getNotificationCount = async (req, res) => {
    try {
        const user = getUserFromToken(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        const [result] = await db.execute(
            'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE',
            [user.userId]
        );

        res.json({
            success: true,
            data: { unreadCount: result[0].unread_count }
        });

    } catch (error) {
        console.error('Get notification count error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Delete notification
export const deleteNotification = async (req, res) => {
    try {
        const user = getUserFromToken(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        const { id } = req.params;

        // Check if notification belongs to user
        const [notifications] = await db.execute(
            'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
            [id, user.userId]
        );

        if (notifications.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        // Delete notification
        await db.execute(
            'DELETE FROM notifications WHERE id = ? AND user_id = ?',
            [id, user.userId]
        );

        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });

    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get expiring medicines notifications
export const getExpiringMedicinesNotifications = async (req, res) => {
    try {
        const user = getUserFromToken(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        const { days = 30 } = req.query;

        // Get medicines expiring within specified days
        const [medicines] = await db.execute(
            `SELECT id, name, expiry_date, 
                    DATEDIFF(expiry_date, CURDATE()) as days_until_expiry
             FROM medicines 
             WHERE user_id = ? AND status = 'active' 
             AND expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
             ORDER BY expiry_date ASC`,
            [user.userId, days]
        );

        // Get expired medicines
        const [expiredMedicines] = await db.execute(
            `SELECT id, name, expiry_date, 
                    DATEDIFF(CURDATE(), expiry_date) as days_expired
             FROM medicines 
             WHERE user_id = ? AND status = 'active' 
             AND expiry_date < CURDATE()
             ORDER BY expiry_date ASC`,
            [user.userId]
        );

        res.json({
            success: true,
            data: {
                expiring: medicines,
                expired: expiredMedicines
            }
        });

    } catch (error) {
        console.error('Get expiring medicines notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

