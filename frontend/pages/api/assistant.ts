import { NextApiRequest, NextApiResponse } from "next"

// Use Google's Generative AI SDK instead of OpenAI SDK for Gemini
async function callGeminiAPI(messages: any[]) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured")

  // Extract system message and conversation
  const systemMsg = messages.find((m: any) => m.role === 'system')
  const conversationMsgs = messages.filter((m: any) => m.role !== 'system')

  // Format for Gemini API
  const contents = conversationMsgs.map((msg: any) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }))

  // Prepend system instructions to first user message if exists
  if (systemMsg && contents.length > 0 && contents[0].role === 'user') {
    contents[0].parts[0].text = `${systemMsg.content}\n\n---\n\nUser: ${contents[0].parts[0].text}`
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated"
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { messages } = req.body

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format" })
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set in environment variables")
      return res.status(500).json({ error: "API key not configured" })
    }

    console.log("Sending request to Gemini API with", messages.length, "messages")

    const reply = await callGeminiAPI(messages)

    res.status(200).json({ reply })
  } catch (error: any) {
    console.error("AI Assistant API Error:", {
      message: error.message,
      stack: error.stack
    })
    res.status(500).json({ 
      error: "AI request failed",
      details: error.message || "Unknown error"
    })
  }
}