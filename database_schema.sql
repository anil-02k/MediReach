-- MediReach Database Schema
-- Run this in your MySQL Workbench
-- Create database
CREATE DATABASE medireach;
USE medireach;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    user_type ENUM('individual', 'organization') DEFAULT 'individual',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- OTP table for verification
CREATE TABLE otps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(4) NOT NULL,
    type ENUM('signup', 'reset_password') NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
);

USE medireach;

-- Medicines table for individual users
CREATE TABLE medicines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    batch_number VARCHAR(100),
    expiry_date DATE NOT NULL,
    manufacturer VARCHAR(255),
    quantity VARCHAR(100) DEFAULT '1',
    qr_code TEXT,
    status ENUM('active', 'donated', 'expired', 'disposed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_expiry_date (expiry_date),
    INDEX idx_status (status)
);

-- NGO Drives table for organizations to request medicines
CREATE TABLE ngo_drives (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ngo_id INT NOT NULL,
    medicine_name VARCHAR(255) NOT NULL,
    quantity_needed VARCHAR(100) NOT NULL,
    urgency ENUM('low', 'medium', 'high') DEFAULT 'medium',
    location VARCHAR(255),
    description TEXT,
    status ENUM('active', 'fulfilled', 'cancelled') DEFAULT 'active',
    proof_document VARCHAR(500), -- File path or URL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ngo_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_ngo_id (ngo_id),
    INDEX idx_status (status),
    INDEX idx_urgency (urgency)
);

-- Donations table to track medicine donations
CREATE TABLE donations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donor_id INT NOT NULL,
    ngo_id INT NOT NULL,
    medicine_id INT NOT NULL,
    drive_id INT,
    quantity_donated VARCHAR(100) NOT NULL,
    donation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (ngo_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
    FOREIGN KEY (drive_id) REFERENCES ngo_drives(id) ON DELETE SET NULL,
    INDEX idx_donor_id (donor_id),
    INDEX idx_ngo_id (ngo_id),
    INDEX idx_medicine_id (medicine_id),
    INDEX idx_status (status)
);

-- Notifications table for user alerts
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('expiry_alert', 'donation_request', 'donation_approved', 'donation_rejected', 'general') DEFAULT 'general',
    is_read BOOLEAN DEFAULT FALSE,
    related_id INT, -- Can reference medicine_id, donation_id, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_type (type)
);

-- Insert some sample data for testing
INSERT INTO users (name, email, password, user_type, is_verified) VALUES
('John Doe', 'john@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'individual', TRUE),
('Health Foundation', 'health@ngo.org', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'organization', TRUE),
('Care Clinic', 'care@clinic.org', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'organization', TRUE);

INSERT INTO medicines (user_id, name, batch_number, expiry_date, manufacturer, quantity, qr_code, status) VALUES
(1, 'Paracetamol 500mg', 'PAR2024001', '2024-12-31', 'ABC Pharma', '50 tablets', 'PAR500MG2024001', 'active'),
(1, 'Amoxicillin 250mg', 'AMX2024002', '2024-11-15', 'XYZ Labs', '30 capsules', 'AMX250MG2024002', 'active'),
(1, 'Vitamin C', 'VIT2024003', '2025-06-30', 'Health Plus', '100 tablets', 'VITC2024003', 'active');

INSERT INTO ngo_drives (ngo_id, medicine_name, quantity_needed, urgency, location, description, status) VALUES
(2, 'Insulin Vials', '20 vials', 'high', 'New Delhi', 'Urgent need for diabetic patients', 'active'),
(2, 'Antibiotics', '100 tablets', 'medium', 'New Delhi', 'General antibiotics for community health', 'active'),
(3, 'Pain Relief Medicine', '50 tablets', 'low', 'Mumbai', 'Basic pain relief for elderly patients', 'active');

