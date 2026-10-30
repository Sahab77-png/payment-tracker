// netlify/functions/verify.js
export const handler = async (event) => {
  // চিকিউৰিটি: কেৱল POST ৰিকুৱেষ্টহে অনুমতি দিয়া হ'ব
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body);
    const { base64Data, mimeType, language, category } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "API Key not configured" }) };
    }

    // ভাষা অনুসৰি প্ৰম্পট (Prompt) সাজু কৰা
    const langMap = { en: "English", as: "Assamese", hi: "Hindi", bn: "Bengali" };
    const selectedLang = langMap[language] || "English";

    
const prompt = `
  You are an expert fact-checker. Analyze the provided media file.
  Check for information, misinformation, disinformation, or general knowledge.
  The user has categorized this as: ${category || "General Information"}.
  
  CRITICAL: Identify the ORIGIN of this content (e.g., Original Photo, Social Media Screenshot, AI-Generated Image, Official Document, etc.).
  
  Respond STRICTLY in ${selectedLang}.
  
  Your response MUST be a JSON object with this exact structure:
  {
    "status": "Verified" or "Flagged",
    "title": "Short title (e.g., Verified as: Information)",
    "origin": "Detected origin of the content",
    "description": "Detailed explanation in ${selectedLang}.",
    "confidence": "High" or "Medium" or "Low"
  }
`;
    // Gemini API লৈ ৰিকুৱেষ্ট পঠিওৱা
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: mimeType, data: base64Data } }
            ]
          }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    );

    const data = await response.json();
    const resultText = data.candidates[0].content.parts[0].text;

    return {
      statusCode: 200,
      body: resultText
    };

  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to analyze the file. " + error.message })
    };
  }
};
