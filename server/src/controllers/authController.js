import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import { generateOTP, storeOTP, verifyOTP } from '../services/otpService.js';
import { sendOTPEmail, sendWelcomeEmail } from '../services/emailService.js';
import { generateTokenAndSetCookies } from '../utils/tokenUtils.js';


// Test connection
export const testConnection = (req, res) => {
    res.json({ success: true, message: "Backend is working perfectly!" });
};

// Signup
export const signup = async (req, res) => {
    const { name, email, password } = req.body;

    console.log('Signup attempt for:', { name, email });

    try {
        // Check if user already exists
        const [existingUsers] = await db.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            console.log('User already exists:', email);
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password hashed successfully');

        // Create user (not verified yet)
        const [userResult] = await db.execute(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );
        
        console.log('User created with ID:', userResult.insertId);

        // Generate and send OTP
        const otp = generateOTP();
        console.log('Generated OTP:', otp);
        
        const stored = await storeOTP(email, otp, 'signup');
        console.log('OTP stored result:', stored);
        
        const emailSent = await sendOTPEmail(email, otp, 'signup');
        console.log('Email sent result:', emailSent);

        if (!stored || !emailSent) {
            console.log('Failed condition - stored:', stored, 'emailSent:', emailSent);
            return res.status(500).json({
                success: false,
                message: 'Failed to send verification email'
            });
        }

        console.log('Signup successful for:', email);
        res.json({
            success: true,
            message: 'User registered successfully. Please check your email for verification code.',
            data: { email }
        });

    } catch (error) {
        console.error('Signup error:', error.message);
        console.error('Full error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error: ' + error.message
        });
    }
};

// Resend OTP
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already verified
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'User is already verified'
      });
    }

    // Generate new OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete existing OTP for this email
    await OTP.deleteMany({ email });

    // Create new OTP
    const otp = new OTP({
      email,
      otp: otpCode,
      expiresAt,
      type: 'signup' // or 'reset' based on context
    });

    await otp.save();

    // Send OTP via email
    try {
      await sendEmail({
        to: email,
        subject: 'MediReach - New Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #006a64;">MediReach Verification Code</h2>
            <p>Your new verification code is:</p>
            <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; color: #006a64; letter-spacing: 5px; margin: 20px 0;">
              ${otpCode}
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">MediReach - Connecting medicine donors with those in need</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the request if email fails, but log it
    }

    res.status(200).json({
      success: true,
      message: 'New OTP sent successfully',
      data: {
        email,
        expiresAt
      }
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Verify OTP for signup
export const verifySignupOTP = async (req, res) => {
    const { email, otp } = req.body;

    try {
        const verification = await verifyOTP(email, otp, 'signup');

        if (!verification.isValid) {
            return res.status(400).json({
                success: false,
                message: verification.message
            });
        }

        // Mark user as verified
        await db.execute(
            'UPDATE users SET is_verified = TRUE WHERE email = ?',
            [email]
        );

        // Get user data
        const [users] = await db.execute(
            'SELECT id, name, email, user_type FROM users WHERE email = ?',
            [email]
        );

        const user = users[0];
        
        // Generate JWT token
        const token = generateTokenAndSetCookies(res, user.id);

        // Send welcome email
        await sendWelcomeEmail(email, user.name);

        res.json({
            success: true,
            message: 'Account verified successfully',
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    user_type: user.user_type
                },
                token
            }
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Login
export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const [users] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = users[0];

        // Check if user is verified
        if (!user.is_verified) {
            return res.status(400).json({
                success: false,
                message: 'Please verify your email first'
            });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    user_type: user.user_type
                },
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Logout - clear auth cookie (if used) and return success
export const logout = async (req, res) => {
    try {
        // Clear cookie if it exists
        if (res.clearCookie) {
            res.clearCookie('token');
        }
        return res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Forgot password - send OTP
// Forgot password - send OTP
export const forgotPassword = async (req, res) => {
    const { email } = req.body;

    console.log('🔐 Forgot password request for:', email);

    try {
        // Check if user exists
        const [users] = await db.execute(
            'SELECT id, name FROM users WHERE email = ?',
            [email]
        );

        console.log('📋 User check result:', users);

        if (users.length === 0) {
            console.log('❌ User not found:', email);
            return res.status(400).json({
                success: false,
                message: 'No account found with this email'
            });
        }

        console.log('✅ User found:', users[0]);

        // Generate and send OTP
        const otp = generateOTP();
        console.log('🔢 Generated OTP:', otp);
        
        // Store OTP
        console.log('💾 Storing OTP...');
        const stored = await storeOTP(email, otp, 'reset_password');
        console.log('📦 OTP storage result:', stored);
        
        // Send email
        console.log('📧 Sending OTP email...');
        const emailSent = await sendOTPEmail(email, otp, 'reset_password');
        console.log('✉️ Email sending result:', emailSent);

        if (!stored) {
            console.log('❌ OTP storage failed');
            return res.status(500).json({
                success: false,
                message: 'Failed to generate reset code'
            });
        }

        if (!emailSent) {
            console.log('❌ Email sending failed');
            return res.status(500).json({
                success: false,
                message: 'Failed to send reset email'
            });
        }

        console.log('✅ Forgot password process completed successfully for:', email);
        res.json({
            success: true,
            message: 'Reset code sent to your email'
        });

    } catch (error) {
        console.error('💥 Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error: ' + error.message
        });
    }
};

// Verify OTP for password reset
export const verifyResetOTP = async (req, res) => {
    const { email, otp } = req.body;

    try {
        const verification = await verifyOTP(email, otp, 'reset_password');

        if (!verification.isValid) {
            return res.status(400).json({
                success: false,
                message: verification.message
            });
        }

        res.json({
            success: true,
            message: 'OTP verified successfully'
        });

    } catch (error) {
        console.error('Reset OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Reset password
export const resetPassword = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update password
        await db.execute(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedPassword, email]
        );

        res.json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Update user type (Individual/Organization)
export const updateUserType = async (req, res) => {
    const { email, user_type } = req.body;

    console.log('Update user type request:', { email, user_type }); // Debug log

    // Validate input
    if (!email || !user_type) {
        return res.status(400).json({
            success: false,
            message: 'Email and user type are required'
        });
    }

    // Validate user_type value
    if (!['individual', 'organization'].includes(user_type)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid user type. Must be "individual" or "organization"'
        });
    }

    try {
        // Check if user exists
        const [users] = await db.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update user type
        await db.execute(
            'UPDATE users SET user_type = ? WHERE email = ?',
            [user_type, email]
        );

        console.log('User type updated successfully for:', email); // Debug log

        res.json({
            success: true,
            message: 'User type updated successfully'
        });

    } catch (error) {
        console.error('Update user type error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error: ' + error.message
        });
    }
};