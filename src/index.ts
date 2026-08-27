import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import authRoutes from './routes/authRoutes.js';
import emailRoutes from "./routes/emailRoutes.js";
import { runSetupDatabase } from "./scripts/setupDatabase.js";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();
runSetupDatabase().catch(err => {
    console.error('Database setup failed:', err);
});

const app = express();

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

export const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
});

app.use("/auth", authRoutes);
app.use("/api", emailRoutes);


app.listen(3000, () => {
    console.log("server is running");
})