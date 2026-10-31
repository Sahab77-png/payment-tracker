exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { base64Data, mimeType, language, category } = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) return { statusCode: 500, body: JSON.stringify({ error: "API Key missing" }) };

    const langMap = { en: "English", as: "Assamese", hi: "Hindi", bn: "Bengali" };
    const selectedLang = langMap[language] || "English";

    const prompt = `
      You are an elite fact-checker, cyber-security analyst, and plagiarism detector. 
      I am providing you with content (Image, Video, Audio, or Document Text). 
      
      YOUR MISSION: Analyze the ENTIRE content meticulously. Do not miss a single detail.
      
      1. Misinformation / Disinformation: Find false claims, fake news, or manipulated facts.
      2. Fraud / Scams: Detect phishing, fake offers, financial scams, or deceptive language.
      3. Content Theft / Plagiarism: Detect stolen content, re-uploads with false claims, or copied text without credit.
      
      The user suspects this category: ${category || "General Information"}.
      
      CRITICAL INSTRUCTIONS FOR DEEP ANALYSIS:
      - IF IT IS A TEXT/DOCUMENT: Read it thoroughly. If you find an issue, you MUST state the specific PARAGRAPH, and provide the EXACT QUOTE of the false claim.
      - IF IT IS A VIDEO/AUDIO: State the exact TIMESTAMP (e.g., "At 00:45...") and quote exactly what was said.
      - IF IT IS AN IMAGE: Point out the specific visual element or text that is misleading.
      - DO NOT give a generic answer. Be highly specific.
      
      Respond STRICTLY in ${selectedLang} language.
      
      Your response MUST be a valid JSON object with this exact structure:
      {
        "status": "Verified" or "Flagged",
        "title": "Short verdict (e.g., Flagged: Scam Detected / Verified: Genuine Content)",
        "origin": "Detected origin (e.g., AI-generated, Stolen from another creator, Scam message, Original)",
        "description": "Detailed explanation. Break it down into bullet points. Mention exact page numbers, timestamps, and quotes.",
        "confidence": "High" or "Medium" or "Low"
      }
    `;

    let contentParts = [{ text: prompt }];

    // 🚨 এখানে PDF এর টেক্সট এবং ফাইল আলাদা করে হ্যান্ডেল করা হয়েছে
    if (mimeType === "text/plain") {
      contentParts.push({ text: "Document Content to analyze:\n\n" + base64Data });
    } else {
      contentParts.push({ 
        inlineData: { mimeType: mimeType, data: base64Data } 
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: contentParts }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      return { statusCode: 200, body: JSON.stringify({ status: "Flagged", title: "API Error", origin: "Unknown", description: data.error.message }) };
    }
    if (!data.candidates || !data.candidates[0]) {
      return { statusCode: 200, body: JSON.stringify({ status: "Flagged", title: "Content Blocked", origin: "Unknown", description: "AI Safety Filter triggered." }) };
    }

    return {
      statusCode: 200,
      body: data.candidates[0].content.parts[0].text
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
