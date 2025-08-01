import express from "express";
import { getPin, getPins, createPin, interactionCheck, interact, fractionalizePin, getPinFractionalizationData } from "../controllers/pin.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", getPins);
// Đặt các routes cụ thể trước routes với tham số động
router.get("/:id/fractionalization", getPinFractionalizationData);
router.get("/interaction-check/:id", interactionCheck);
router.post("/:id/fractionalize", verifyToken, fractionalizePin);
router.post("/interact/:id", verifyToken, interact);
// Route tổng quát với :id phải đặt cuối
router.get("/:id", getPin);
router.post("/", verifyToken, createPin);

export default router;
