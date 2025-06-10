import { GoogleGenerativeAI, Part, Content } from '@google/generative-ai'; // Import Content
import * as dotenv from 'dotenv';

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function generateGeminiResponse(contents: Content[]): Promise<string> {
  try {
    const result = await model.generateContent({
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 500, 
      },
    });

    const response = await result.response;
    const responseText = response.text();

    if (!responseText) {
      throw new Error('No response generated from Gemini.');
    }
    return responseText;
  } catch (error: any) {
    console.error('Gemini API error:', error);
    if (error.message.includes('SAFETY')) {
        return "I'm sorry, I cannot provide a response to that due to safety guidelines.";
    }
    if (error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('rate limit')) {
        return "I'm a bit busy right now. Please try again in a moment.";
    }
    throw new Error('Failed to communicate with Gemini. Please try again later.');
  }
}


export async function createChatCompletion(
  documentContent: string,
  userQuestion: string,
  history: { role: 'user' | 'model'; parts: Part[] }[] = []
): Promise<string> {
  try {
    const contents: Content[] = [
      {
        role: 'user',
        parts: [{
          text: `You are a friendly and helpful AI assistant. You will answer questions based on the following document content, the conversation history and your knowledge base.
Document Content:
"""
${documentContent}
"""
Instructions for responding:
1. Tone: Warm, friendly, approachable.
2. Length: Concise (under 70 words ideally, but comprehensive).
3. Information Source: Use document, general knowledge and document history.
4. Language: Same as the user's current question.
5. Directness: Provide only the answer, no meta-commentary.
Please adhere to these instructions.
---
`}]
      },
      ...history,
      { role: 'user', parts: [{ text: userQuestion }] }
    ];

    return await generateGeminiResponse(contents);

  } catch (error) {
    console.error('Chat completion error:', error);
    return 'I apologize, but I encountered an issue while trying to process your request. Could you please try asking again in a moment?';
  }
}