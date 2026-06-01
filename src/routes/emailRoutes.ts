import { Router } from "express";
import { getEmails } from "../controllers/emailController.js";

const router = Router();

router.get("/emails", getEmails);

export default router;