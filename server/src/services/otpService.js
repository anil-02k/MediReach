import crypto from 'crypto';
import db from '../config/db.js';

export const generateOTP = () => {
    return crypto.randomInt(1000, 9999).toString();
};

export const storeOTP = async (email, otp, type) => {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    try {
        console.log(`Storing OTP for ${email}: ${otp}, type: ${type}`);
        
        // Invalidate previous OTPs for this email and type
        const [updateResult] = await db.execute(
            'UPDATE otps SET is_used = TRUE WHERE email = ? AND type = ?',
            [email, type]
        );
        console.log('Previous OTPs invalidated:', updateResult.affectedRows);

        // Store new OTP
        const [insertResult] = await db.execute(
            'INSERT INTO otps (email, otp_code, type, expires_at) VALUES (?, ?, ?, ?)',
            [email, otp, type, expiresAt]
        );
        
        console.log('New OTP stored with ID:', insertResult.insertId);
        return true;
    } catch (error) {
        console.error('Error storing OTP:', error.message);
        console.error('Full error:', error);
        return false;
    }
};

export const verifyOTP = async (email, otp, type) => {
    try {
        const [rows] = await db.execute(
            `SELECT * FROM otps 
             WHERE email = ? AND otp_code = ? AND type = ? 
             AND is_used = FALSE AND expires_at > NOW()`,
            [email, otp, type]
        );

        if (rows.length === 0) {
            return { isValid: false, message: 'Invalid or expired OTP' };
        }

        // Mark OTP as used
        await db.execute(
            'UPDATE otps SET is_used = TRUE WHERE id = ?',
            [rows[0].id]
        );

        return { isValid: true, message: 'OTP verified successfully' };
    } catch (error) {
        console.error('Error verifying OTP:', error);
        return { isValid: false, message: 'Error verifying OTP' };
    }
};