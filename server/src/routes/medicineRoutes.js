import express from 'express';
import {
    addMedicine,
    getMedicines,
    updateMedicine,
    deleteMedicine,
    getExpiringMedicines
} from '../controllers/medicineController.js';

const router = express.Router();

// Medicine routes
router.post('/add', addMedicine);
router.get('/', getMedicines);
router.put('/:id', updateMedicine);
router.delete('/:id', deleteMedicine);
router.get('/expiring', getExpiringMedicines);

export default router;

