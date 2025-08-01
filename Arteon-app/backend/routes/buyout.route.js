import express from 'express';
import buyoutController from '../controllers/buyout.controller.js';

const router = express.Router();

// POST /buyout/initiate - Create a new buyout offer
router.post('/initiate', buyoutController.initiateBuyout);

// GET /buyout/offers/:vaultAddress - Get all buyout offers for a vault
router.get('/offers/:vaultAddress', buyoutController.getBuyoutOffers);

// POST /buyout/accept - Accept a buyout offer (vault authority only)
router.post('/accept', buyoutController.acceptBuyout);

// POST /buyout/reject - Reject a buyout offer (vault authority only)
router.post('/reject', buyoutController.rejectBuyout);

export default router;
