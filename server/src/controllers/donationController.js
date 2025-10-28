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

// Create NGO drive (medicine request)
export const createDrive = async (req, res) => {
    console.log("=== Create Drive Request ===");
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

        const { medicine_name, quantity_needed, urgency, location, description, proof_document } = req.body;

        // Validate required fields
        if (!medicine_name || !quantity_needed || !location) {
            return res.status(400).json({
                success: false,
                message: 'Medicine name, quantity needed, and location are required'
            });
        }

        // Insert NGO drive
        const [result] = await db.execute(
            `INSERT INTO ngo_drives (ngo_id, medicine_name, quantity_needed, urgency, location, description, proof_document) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [user.userId, medicine_name, quantity_needed, urgency || 'medium', location, description, proof_document]
        );

        res.json({
            success: true,
            message: 'Medicine drive created successfully',
            data: { driveId: result.insertId }
        });

    } catch (error) {
        console.error('Create drive error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get NGO drives
export const getDrives = async (req, res) => {
    try {
        const user = getUserFromToken(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        const { status, search } = req.query;
        let query = `
            SELECT nd.*, u.name as ngo_name 
            FROM ngo_drives nd 
            JOIN users u ON nd.ngo_id = u.id 
            WHERE 1=1
        `;
        let params = [];

        if (status && status !== 'all') {
            query += ' AND nd.status = ?';
            params.push(status);
        }

        if (search) {
            query += ' AND (nd.medicine_name LIKE ? OR nd.location LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY nd.created_at DESC';

        const [drives] = await db.execute(query, params);

        res.json({
            success: true,
            data: drives
        });

    } catch (error) {
        console.error('Get drives error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get drives for specific NGO
export const getMyDrives = async (req, res) => {
    try {
        const user = getUserFromToken(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        const { status } = req.query;
        let query = 'SELECT * FROM ngo_drives WHERE ngo_id = ?';
        let params = [user.userId];

        if (status && status !== 'all') {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC';

        const [drives] = await db.execute(query, params);

        res.json({
            success: true,
            data: drives
        });

    } catch (error) {
        console.error('Get my drives error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Update drive status
export const updateDriveStatus = async (req, res) => {
    console.log("=== Update Drive Status Request ===");
    console.log("Method:", req.method);
    console.log("Headers:", req.headers);
    console.log("Content-Type:", req.headers['content-type']);
    console.log("Raw body:", req.body);
    console.log("Body type:", typeof req.body);
    console.log("Body keys:", req.body ? Object.keys(req.body) : 'undefined');
    console.log("Params:", req.params);
    
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

        const { id } = req.params;
        const { status } = req.body;

        // Check if drive belongs to NGO
        const [drives] = await db.execute(
            'SELECT id FROM ngo_drives WHERE id = ? AND ngo_id = ?',
            [id, user.userId]
        );

        if (drives.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Drive not found'
            });
        }

        // Update drive status
        await db.execute(
            'UPDATE ngo_drives SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND ngo_id = ?',
            [status, id, user.userId]
        );

        res.json({
            success: true,
            message: 'Drive status updated successfully'
        });

    } catch (error) {
        console.error('Update drive status error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Create donation
export const createDonation = async (req, res) => {
    console.log("=== Create Donation Request ===");
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

        const { ngo_id, medicine_id, drive_id, quantity_donated, notes } = req.body;

        // Validate required fields
        if (!ngo_id || !medicine_id || !quantity_donated) {
            return res.status(400).json({
                success: false,
                message: 'NGO ID, medicine ID, and quantity are required'
            });
        }

        // Check if medicine belongs to donor
        const [medicines] = await db.execute(
            'SELECT id, name FROM medicines WHERE id = ? AND user_id = ? AND status = "active"',
            [medicine_id, user.userId]
        );

        if (medicines.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Medicine not found or not available for donation'
            });
        }

        // Check if NGO exists
        const [ngos] = await db.execute(
            'SELECT id, name FROM users WHERE id = ? AND user_type = "organization"',
            [ngo_id]
        );

        if (ngos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'NGO not found'
            });
        }

        // Create donation
        const [result] = await db.execute(
            `INSERT INTO donations (donor_id, ngo_id, medicine_id, drive_id, quantity_donated, notes) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [user.userId, ngo_id, medicine_id, drive_id, quantity_donated, notes]
        );

        // Create notification for NGO
        await db.execute(
            `INSERT INTO notifications (user_id, title, message, type, related_id) 
             VALUES (?, ?, ?, ?, ?)`,
            [ngo_id, 'New Donation Request', `${medicines[0].name} donation request from ${user.email}`, 'donation_request', result.insertId]
        );

        res.json({
            success: true,
            message: 'Donation request created successfully',
            data: { donationId: result.insertId }
        });

    } catch (error) {
        console.error('Create donation error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get donations for NGO
export const getDonations = async (req, res) => {
    try {
        const user = getUserFromToken(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        const { status } = req.query;
        let query = `
            SELECT d.*, m.name as medicine_name, m.batch_number, m.expiry_date, m.manufacturer,
                   u.name as donor_name, u.email as donor_email, nd.medicine_name as drive_medicine
            FROM donations d
            JOIN medicines m ON d.medicine_id = m.id
            JOIN users u ON d.donor_id = u.id
            LEFT JOIN ngo_drives nd ON d.drive_id = nd.id
            WHERE d.ngo_id = ?
        `;
        let params = [user.userId];

        if (status && status !== 'all') {
            query += ' AND d.status = ?';
            params.push(status);
        }

        query += ' ORDER BY d.created_at DESC';

        const [donations] = await db.execute(query, params);

        res.json({
            success: true,
            data: donations
        });

    } catch (error) {
        console.error('Get donations error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Update donation status
export const updateDonationStatus = async (req, res) => {
    console.log("=== Update Donation Status Request ===");
    console.log("Method:", req.method);
    console.log("Headers:", req.headers);
    console.log("Content-Type:", req.headers['content-type']);
    console.log("Raw body:", req.body);
    console.log("Body type:", typeof req.body);
    console.log("Body keys:", req.body ? Object.keys(req.body) : 'undefined');
    console.log("Params:", req.params);
    
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

        const { id } = req.params;
        const { status } = req.body;

        // Check if donation belongs to NGO
        const [donations] = await db.execute(
            'SELECT id, donor_id, medicine_id FROM donations WHERE id = ? AND ngo_id = ?',
            [id, user.userId]
        );

        if (donations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Donation not found'
            });
        }

        // Update donation status
        await db.execute(
            'UPDATE donations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND ngo_id = ?',
            [status, id, user.userId]
        );

        // If approved, update medicine status to donated
        if (status === 'approved') {
            await db.execute(
                'UPDATE medicines SET status = "donated" WHERE id = ?',
                [donations[0].medicine_id]
            );

            // Create notification for donor
            await db.execute(
                `INSERT INTO notifications (user_id, title, message, type, related_id) 
                 VALUES (?, ?, ?, ?, ?)`,
                [donations[0].donor_id, 'Donation Approved', 'Your donation has been approved by the NGO', 'donation_approved', id]
            );

            // Create notification for NGO
            await db.execute(
                `INSERT INTO notifications (user_id, title, message, type, related_id) 
                 VALUES (?, ?, ?, ?, ?)`,
                [user.userId, 'Donation Approved', 'You have approved a donation request', 'donation_approved', id]
            );
        } else if (status === 'rejected') {
            // Create notification for donor
            await db.execute(
                `INSERT INTO notifications (user_id, title, message, type, related_id) 
                 VALUES (?, ?, ?, ?, ?)`,
                [donations[0].donor_id, 'Donation Rejected', 'Your donation request was not approved', 'donation_rejected', id]
            );

            // Create notification for NGO
            await db.execute(
                `INSERT INTO notifications (user_id, title, message, type, related_id) 
                 VALUES (?, ?, ?, ?, ?)`,
                [user.userId, 'Donation Rejected', 'You have rejected a donation request', 'donation_rejected', id]
            );
        }

        res.json({
            success: true,
            message: 'Donation status updated successfully'
        });

    } catch (error) {
        console.error('Update donation status error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get my donations (for individual users)
export const getMyDonations = async (req, res) => {
    try {
        const user = getUserFromToken(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        const { status } = req.query;
        let query = `
            SELECT d.*, m.name as medicine_name, m.batch_number, m.expiry_date,
                   u.name as ngo_name, nd.medicine_name as drive_medicine
            FROM donations d
            JOIN medicines m ON d.medicine_id = m.id
            JOIN users u ON d.ngo_id = u.id
            LEFT JOIN ngo_drives nd ON d.drive_id = nd.id
            WHERE d.donor_id = ?
        `;
        let params = [user.userId];

        if (status && status !== 'all') {
            query += ' AND d.status = ?';
            params.push(status);
        }

        query += ' ORDER BY d.created_at DESC';

        const [donations] = await db.execute(query, params);

        res.json({
            success: true,
            data: donations
        });

    } catch (error) {
        console.error('Get my donations error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

