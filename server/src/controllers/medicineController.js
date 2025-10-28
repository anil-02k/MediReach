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

// Add medicine to inventory
export const addMedicine = async (req, res) => {
    console.log("=== Add Medicine Request ===");
    console.log("Method:", req.method);
    console.log("Headers:", req.headers);
    console.log("Content-Type:", req.headers['content-type']);
    console.log("Raw body:", req.body);
    console.log("Body type:", typeof req.body);
    console.log("Body keys:", req.body ? Object.keys(req.body) : 'undefined');
    
    try {
        const user = getUserFromToken(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        // Check if req.body exists
        if (!req.body) {
            return res.status(400).json({
                success: false,
                message: 'Request body is missing'
            });
        }

        const { name, batch_number, expiry_date, manufacturer, quantity, qr_code } = req.body;

        // Validate required fields
        if (!name || !expiry_date || !manufacturer) {
            return res.status(400).json({
                success: false,
                message: 'Name, expiry date, and manufacturer are required'
            });
        }

        // Check if medicine with same batch already exists for this user
        const [existingMedicines] = await db.execute(
            'SELECT id FROM medicines WHERE user_id = ? AND batch_number = ? AND name = ?',
            [user.userId, batch_number, name]
        );

        if (existingMedicines.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Medicine with this batch number already exists in your inventory'
            });
        }

        // Insert medicine
        const [result] = await db.execute(
            `INSERT INTO medicines (user_id, name, batch_number, expiry_date, manufacturer, quantity, qr_code) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [user.userId, name, batch_number, expiry_date, manufacturer, quantity || '1', qr_code]
        );

        // Create notification for expiry alert if medicine expires within 30 days
        const expiryDate = new Date(expiry_date);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        if (expiryDate <= thirtyDaysFromNow) {
            const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
            let alertMessage;
            
            if (daysUntilExpiry <= 0) {
                alertMessage = `${name} has expired on ${expiry_date}. Please dispose safely or donate if still usable.`;
            } else if (daysUntilExpiry <= 7) {
                alertMessage = `${name} expires in ${daysUntilExpiry} days (${expiry_date}). Consider donating soon!`;
            } else {
                alertMessage = `${name} expires in ${daysUntilExpiry} days (${expiry_date}). Consider donating before expiry.`;
            }

            await db.execute(
                `INSERT INTO notifications (user_id, title, message, type, related_id) 
                 VALUES (?, ?, ?, ?, ?)`,
                [user.userId, 'Medicine Expiry Alert', alertMessage, 'expiry_alert', result.insertId]
            );
        }

        res.json({
            success: true,
            message: 'Medicine added successfully',
            data: { medicineId: result.insertId }
        });

    } catch (error) {
        console.error('Add medicine error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get user's medicine inventory
export const getMedicines = async (req, res) => {
    try {
        const user = getUserFromToken(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        const { status, search } = req.query;
        let query = 'SELECT * FROM medicines WHERE user_id = ?';
        let params = [user.userId];

        if (status && status !== 'all') {
            query += ' AND status = ?';
            params.push(status);
        }

        if (search) {
            query += ' AND (name LIKE ? OR manufacturer LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY expiry_date ASC';

        const [medicines] = await db.execute(query, params);

        // Add expiry status to each medicine
        const medicinesWithStatus = medicines.map(medicine => {
            const expiryDate = new Date(medicine.expiry_date);
            const today = new Date();
            const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

            let expiryStatus = 'safe';
            if (daysUntilExpiry < 0) {
                expiryStatus = 'expired';
            } else if (daysUntilExpiry <= 30) {
                expiryStatus = 'expiring';
            }

            return {
                ...medicine,
                expiryStatus,
                daysUntilExpiry
            };
        });

        res.json({
            success: true,
            data: medicinesWithStatus
        });

    } catch (error) {
        console.error('Get medicines error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Update medicine
export const updateMedicine = async (req, res) => {
    try {
        const user = getUserFromToken(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        const { id } = req.params;
        const { name, batch_number, expiry_date, manufacturer, quantity, status } = req.body;

        // Check if medicine belongs to user
        const [medicines] = await db.execute(
            'SELECT id FROM medicines WHERE id = ? AND user_id = ?',
            [id, user.userId]
        );

        if (medicines.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Medicine not found'
            });
        }

        // Update medicine
        await db.execute(
            `UPDATE medicines SET name = ?, batch_number = ?, expiry_date = ?, 
             manufacturer = ?, quantity = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND user_id = ?`,
            [name, batch_number, expiry_date, manufacturer, quantity, status, id, user.userId]
        );

        res.json({
            success: true,
            message: 'Medicine updated successfully'
        });

    } catch (error) {
        console.error('Update medicine error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Delete medicine
export const deleteMedicine = async (req, res) => {
    try {
        const user = getUserFromToken(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        const { id } = req.params;

        // Check if medicine belongs to user
        const [medicines] = await db.execute(
            'SELECT id FROM medicines WHERE id = ? AND user_id = ?',
            [id, user.userId]
        );

        if (medicines.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Medicine not found'
            });
        }

        // Delete medicine
        await db.execute(
            'DELETE FROM medicines WHERE id = ? AND user_id = ?',
            [id, user.userId]
        );

        res.json({
            success: true,
            message: 'Medicine deleted successfully'
        });

    } catch (error) {
        console.error('Delete medicine error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get expiring medicines
export const getExpiringMedicines = async (req, res) => {
    try {
        const user = getUserFromToken(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        const { days = 30 } = req.query;

        const [medicines] = await db.execute(
            `SELECT * FROM medicines 
             WHERE user_id = ? AND status = 'active' 
             AND expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
             ORDER BY expiry_date ASC`,
            [user.userId, days]
        );

        res.json({
            success: true,
            data: medicines
        });

    } catch (error) {
        console.error('Get expiring medicines error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

