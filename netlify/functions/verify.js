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
        "title": "Short title",
        "origin": "Detected origin",
        "description": "Detailed explanation",
        "confidence": "High"
      }
    `;

    // 💡 ছেম প্ৰম্পট (Stable Model) ব্যৱহাৰ কৰা হ'ল
    const model = "gemini-1.5-flash"; 
    
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
    console.log("Gemini API Response:", JSON.stringify(data)); // নেটলিফাই লগত চাবলৈ

    // 🚨 যদি এপিআইৰ পৰা ভুল আহে, তেন্তে আচল কাৰণটো দেখুওৱা হ'ব
    if (data.error) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: "Flagged",
          title: "API Error",
          origin: "Unknown",
          description: "Gemini API Error: " + data.error.message
        })
      };
    }

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      const blockReason = data.promptFeedback?.blockReason || "Safety Filter or Unknown issue";
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: "Flagged",
          title: "Content Blocked",
          origin: "Unknown",
          description: "Reason: " + blockReason
        })
      };
    }

    const resultText = data.candidates[0].content.parts[0].text;

    return {
      statusCode: 200,
      body: resultText
    };

  } catch (error) {
    console.error("Server Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to analyze: " + error.message })
    };
  }
};
