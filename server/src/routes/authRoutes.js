import express from 'express';
import {
    testConnection,
    signup,
    verifySignupOTP,
    login,
    forgotPassword,
    verifyResetOTP,
    resetPassword,
    updateUserType, 
    resendOTP,
    logout
} from '../controllers/authController.js';

const router = express.Router();

router.get('/test', testConnection);
router.post('/signup', signup);
router.post('/resend-otp',resendOTP)
router.post('/verify-signup-otp', verifySignupOTP);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOTP);
router.post('/reset-password', resetPassword);
router.post('/update-user-type', updateUserType);
router.post('/logout', logout);

export default router;