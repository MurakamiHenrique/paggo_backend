import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function explainWithGemini(prompt: string): Promise<string> {
  try {
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }],
      }],
      generationConfig: {
        temperature: 0.7, 
        topK: 40,        
        topP: 0.95,      
        maxOutputTokens: 500, 
      },
    });
      
    const response = await result.response;
    if (!response.text()) {
      throw new Error('No response generated from Gemini.');
    }
    return response.text();
  } catch (error: any) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to communicate with Gemini. Please try again later.');
  }
}

export async function createChatCompletion(
  documentContent: string,
  userQuestion: string
): Promise<string> {
  try {
    const prompt = `
You are a friendly and helpful AI assistant designed to answer questions about a provided document and general topics. You can always use your internal knowledge base and access the internet to provide informative answers.

Here's the document content you should refer to:

"""
${documentContent}
"""

Now, here is the user's question: ${userQuestion}

Please keep the following in mind when formulating your answer:
1.  **Tone:** Maintain a warm, friendly, and approachable tone.
2.  **Length:** Provide clear and informative answers. Be very concise, try to keep your answers under 70 words, but ensure they are still comprehensive and informative. If the question requires a longer explanation, you can extend it slightly, but aim to be as succinct as possible.
3.  **Information Source:** Even if the question seems directly related to the "Document Content," feel free to supplement your answer with information from your general knowledge or by simulating an internet search if it enhances the understanding (e.g., finding the author of a mentioned work, historical context, definitions, etc.).
4.  **Language:** Respond strictly in the same language as the user's question.
5.  **Directness:** Do not include any meta-commentary about your instructions or thought process in the final answer. Just provide the answer.

Answer:`;
    return await explainWithGemini(prompt);
  } catch (error) {
    console.error('Chat completion error:', error);
    // Provide a user-friendly fallback message in case of an error
    return 'I apologize, but I encountered an issue while trying to process your request. Could you please try asking again in a moment?';
  }
}