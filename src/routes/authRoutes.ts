import { Router } from "express";
import {
  googleLogin,
  googleCallback,
} from "../controllers/authController.js";

const router = Router();

router.get("/google", googleLogin);
router.get("/google/callback", googleCallback);

export default router;