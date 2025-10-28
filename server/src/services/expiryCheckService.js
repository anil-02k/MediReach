import db from '../config/db.js';

// Function to check for expiring medicines and create notifications
export const checkExpiringMedicines = async () => {
    try {
        console.log('🔍 Checking for expiring medicines...');
        
        // Get medicines expiring in the next 7 days
        const [expiringMedicines] = await db.execute(
            `SELECT m.id, m.name, m.expiry_date, m.user_id, u.name as user_name
             FROM medicines m
             JOIN users u ON m.user_id = u.id
             WHERE m.status = 'active' 
             AND m.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
             AND m.id NOT IN (
                 SELECT related_id FROM notifications 
                 WHERE type = 'expiry_alert' 
                 AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
             )`,
            []
        );

        // Get expired medicines (expired in the last 7 days)
        const [expiredMedicines] = await db.execute(
            `SELECT m.id, m.name, m.expiry_date, m.user_id, u.name as user_name
             FROM medicines m
             JOIN users u ON m.user_id = u.id
             WHERE m.status = 'active' 
             AND m.expiry_date < CURDATE()
             AND m.expiry_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
             AND m.id NOT IN (
                 SELECT related_id FROM notifications 
                 WHERE type = 'expiry_alert' 
                 AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
             )`,
            []
        );

        let notificationsCreated = 0;

        // Create notifications for expiring medicines
        for (const medicine of expiringMedicines) {
            const expiryDate = new Date(medicine.expiry_date);
            const today = new Date();
            const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            
            let title, message;
            
            if (daysUntilExpiry <= 0) {
                title = 'Medicine Expired';
                message = `${medicine.name} has expired on ${medicine.expiry_date}. Please dispose safely or donate if still usable.`;
            } else if (daysUntilExpiry <= 1) {
                title = 'Medicine Expires Tomorrow';
                message = `${medicine.name} expires tomorrow (${medicine.expiry_date}). Consider donating immediately!`;
            } else if (daysUntilExpiry <= 3) {
                title = 'Medicine Expires Soon';
                message = `${medicine.name} expires in ${daysUntilExpiry} days (${medicine.expiry_date}). Consider donating soon!`;
            } else {
                title = 'Medicine Expiry Alert';
                message = `${medicine.name} expires in ${daysUntilExpiry} days (${medicine.expiry_date}). Consider donating before expiry.`;
            }

            await db.execute(
                `INSERT INTO notifications (user_id, title, message, type, related_id) 
                 VALUES (?, ?, ?, ?, ?)`,
                [medicine.user_id, title, message, 'expiry_alert', medicine.id]
            );
            
            notificationsCreated++;
        }

        // Create notifications for expired medicines
        for (const medicine of expiredMedicines) {
            const title = 'Medicine Expired';
            const message = `${medicine.name} has expired on ${medicine.expiry_date}. Please dispose safely or donate if still usable.`;

            await db.execute(
                `INSERT INTO notifications (user_id, title, message, type, related_id) 
                 VALUES (?, ?, ?, ?, ?)`,
                [medicine.user_id, title, message, 'expiry_alert', medicine.id]
            );
            
            notificationsCreated++;
        }

        console.log(`✅ Created ${notificationsCreated} expiry notifications`);
        return notificationsCreated;

    } catch (error) {
        console.error('❌ Error checking expiring medicines:', error);
        return 0;
    }
};

// Function to update medicine status for expired medicines
export const updateExpiredMedicineStatus = async () => {
    try {
        console.log('🔄 Updating expired medicine statuses...');
        
        const [result] = await db.execute(
            `UPDATE medicines 
             SET status = 'expired' 
             WHERE status = 'active' 
             AND expiry_date < CURDATE()`,
            []
        );

        console.log(`✅ Updated ${result.affectedRows} expired medicines`);
        return result.affectedRows;

    } catch (error) {
        console.error('❌ Error updating expired medicine status:', error);
        return 0;
    }
};

// Function to run daily expiry checks
export const runDailyExpiryChecks = async () => {
    try {
        console.log('🕐 Running daily expiry checks...');
        
        const [expiryCount, statusCount] = await Promise.all([
            checkExpiringMedicines(),
            updateExpiredMedicineStatus()
        ]);

        console.log(`✅ Daily expiry checks completed: ${expiryCount} notifications created, ${statusCount} medicines updated`);
        
        return {
            notificationsCreated: expiryCount,
            medicinesUpdated: statusCount
        };

    } catch (error) {
        console.error('❌ Error running daily expiry checks:', error);
        return {
            notificationsCreated: 0,
            medicinesUpdated: 0
        };
    }
};


