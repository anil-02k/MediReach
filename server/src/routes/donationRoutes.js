import express from 'express';
import {
    createDrive,
    getDrives,
    getMyDrives,
    updateDriveStatus,
    createDonation,
    getDonations,
    updateDonationStatus,
    getMyDonations
} from '../controllers/donationController.js';

const router = express.Router();

// NGO Drive routes
router.post('/drives', createDrive);
router.get('/drives', getDrives);
router.get('/drives/my', getMyDrives);
router.put('/drives/:id/status', updateDriveStatus);

// Donation routes
router.post('/create', createDonation);
router.get('/requests', getDonations);
router.put('/requests/:id/status', updateDonationStatus);
router.get('/my', getMyDonations);

export default router;




