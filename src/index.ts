import express from 'express';
import type { Request, Response } from 'express';
import emails from './mails.js';
import { GoogleGenAI } from '@google/genai';
import analyzeMailwithRetry from './utils/mailClassifier.js';
import dotenv from "dotenv";
const app = express();
app.use(express.json());
dotenv.config();

export const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
});


// Notice the 'async' keyword added here
app.get('/mails/:emailID', async (req: Request, res: Response) => {
    const emailid = req.params.emailID;
    const userMail = emails.find(u => u.id === emailid);

    if (userMail) {
        try {
            // 1. Await the response from Gemini
            const aiResponse = await analyzeMailwithRetry(userMail.body);

            // 2. Return the AI text output back to your API client
            return res.status(200).json({ 
                id: userMail.id,
                analysis: JSON.parse(aiResponse?.text || "{}") 
            });
        } catch (apiError) {
            return res.status(500).json({ error: "Failed to analyze mail" });
        }
    }
    return res.status(404).json({ msg: "user not found" });
});



    app.listen(3000, () => {
        console.log("server is running");
    })