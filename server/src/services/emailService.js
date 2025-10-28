import { transporter } from '../config/email.config.js';
import { Verification_Email_Template, Welcome_Email_Template } from '../config/emailTempletes.js';

export const sendOTPEmail = async (email, otp, type = 'signup') => {
    try {
        const subject = type === 'signup' ? 'Verify Your Email' : 'Reset Your Password';
        const text = type === 'signup' ? 'Verify your Email' : 'Reset your Password';
        
        const response = await transporter.sendMail({
            from: '"MediReach" <medi-reach@gmail.com>',
            to: email,
            subject: subject,
            text: text,
            html: Verification_Email_Template.replace("{verificationCode}", otp)
        });
        
        console.log('Email sent successfully:', response);
        return true;
    } catch (error) {
        console.log('Email error:', error);
        return false;
    }
};

export const sendWelcomeEmail = async (email, name) => {
    try {
        const response = await transporter.sendMail({
            from: '"MediReach" <medi-reach@gmail.com>',
            to: email,
            subject: 'Welcome to Our App',
            text: 'Welcome Email',
            html: Welcome_Email_Template.replace("{name}", name)
        });
        
        console.log('Welcome email sent successfully:', response);
        return true;
    } catch (error) {
        console.log('Welcome email error:', error);
        return false;
    }
};