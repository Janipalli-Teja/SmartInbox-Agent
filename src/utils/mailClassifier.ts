import { ai } from "../index.js";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
async function analyzeMailwithRetry(mailData: any, retries = 3, delayMs = 2000) {
    for (let i = 0; i < retries; i++) {
        try {

            return await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `analyze this email ${mailData}`,
                config: {
                    responseMimeType: "application/json",
                    systemInstruction: `You are an AI email classifier.
                    
                    ONLY return valid JSON.
                    
                    Extract:
                    - category
                    - urgency
                    - sender_name
                    
                    Example:
                    {
                        "category": "shipping_issue",
                        "urgency": "high",
                        "sender_name": "John Doe"
                        }`
                    }
                    
                })
            }catch (error: any) {
            // Check if it's a 503 error and we have retries left
            if (error.status === 503 && i < retries - 1) {
                console.warn(`Google API busy (503). Retrying in ${delayMs / 1000}s... (Attempt ${i + 1}/${retries})`);
                await delay(delayMs);
                delayMs *= 2; // Double the wait time for the next try
                continue;
            }
            // If it's a different error (like 400 or 403), crash immediately
            throw error;
        }
        }
}

export default analyzeMailwithRetry;