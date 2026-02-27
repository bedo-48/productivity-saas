import express from "express";
import { register } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);

export default router;
import { login } from "../controllers/authController.js";

router.post("/login", login);