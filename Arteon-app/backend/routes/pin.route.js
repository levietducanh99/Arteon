import express from "express";
import { getPin, getPins, createPin, interactionCheck, interact, fractionalizePin } from "../controllers/pin.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", getPins);
router.get("/:id", getPin);
router.post("/", verifyToken, createPin);
router.get("/interaction-check/:id", interactionCheck);
router.post("/interact/:id",verifyToken, interact);
router.post("/:id/fractionalize", verifyToken, fractionalizePin);

export default router;
