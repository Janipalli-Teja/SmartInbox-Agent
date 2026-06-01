import express from 'express';
import { GoogleGenAI } from '@google/genai';
import authRoutes from './routes/authRoutes.js';
import emailRoutes from "./routes/emailRoutes.js";
import dotenv from "dotenv";
const app = express();
app.use(express.json());
dotenv.config();

export const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
});

app.use("/auth", authRoutes);
app.use("/api", emailRoutes);


app.listen(3000, () => {
    console.log("server is running");
})