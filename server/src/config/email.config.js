import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Verify transporter configuration with better error handling
transporter.verify(function (error, success) {
    if (error) {
        console.log('Email transporter error:', error.message);
    } else {
        console.log('Email server is ready to take our messages');
    }
});