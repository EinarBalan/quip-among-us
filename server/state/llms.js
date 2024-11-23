import axios from "axios";

require('dotenv').config();

import OpenAI from "openai";
const openai = new OpenAI();

import Anthropic from "@anthropic-ai/sdk";
const anthropic = new Anthropic();

export const models = ["gpt", "gemini", "claude"];

const systemMessage = "You're playing a game called Quiplash. You will be given prompts and your goal is to produce the funniest response possible. Stay concise, ideally less than 7 words. If there are blanks in the prompt, fill in the blanks. Don't end your sentences in periods and don't always capitalize the first word in every sentence.";

export async function generateAIAnswer(prompt, model) {  
    if (model === 0) { // OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: prompt },
            ],
        });
        return completion.choices[0].message.content;
    }
    else if (model === 1) { // Google Gemini
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`;

        const data = {
            contents: [
                {
                    parts: [
                        { text: systemMessage + "\n" + prompt }
                    ]
                }
            ]
        };

        try {
            const response = await axios.post(url, data, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return response.data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }
    else if (model === 2) { // Anthropic
        const completion = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1000,
            temperature: 0,
            system: systemMessage,
            messages: [
                {
                "role": "user",
                "content": [
                    {
                    "type": "text",
                    "text": prompt
                    }
                ]
                }
            ]
            });
        return completion.content[0].text;
    }
    

}

