import express from "express";
import { register, login } from "../controllers/authController.js";

const router = express.Router();

// Route pour s'enregistrer
router.post("/register", register);

// Route pour se connecter
router.post("/login", login);

export default router;