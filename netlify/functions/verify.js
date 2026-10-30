// netlify/functions/verify.js
export const handler = async (event) => {
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

    // ✅ মডেলের নাম আপডেট করা হয়েছে
    const model = "gemini-2.5-flash"; 
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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

    // ✅ নিরাপত্তা যাচাই: candidates অ্যারে আছে কিনা
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      const blockReason = data.promptFeedback?.blockReason || "Unknown reason";
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: "Flagged",
          title: "Content Blocked or Unreadable",
          description: "AI couldn't analyze this file. Reason: " + blockReason,
          origin: "Unknown"
        })
      };
    }

    const resultText = data.candidates[0].content.parts[0].text;

    return {
      statusCode: 200,
      body: resultText
    };

  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to analyze the file: " + error.message })
    };
  }
};
