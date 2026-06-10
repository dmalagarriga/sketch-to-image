export default async function handler(req, res) {
  const { prompt, image: scribbleDataUri } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ detail: "GEMINI_API_KEY not configured" });
  }

  // Extract base64 from data URI (e.g. "data:image/png;base64,...")
  const imageBase64 = scribbleDataUri.includes(",")
    ? scribbleDataUri.split(",")[1]
    : scribbleDataUri;

  let geminiResponse;
  try {
    geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Generate a photorealistic image of: ${prompt}. Use the provided sketch as a reference for composition and structure.`,
                },
                {
                  inline_data: {
                    mime_type: "image/png",
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
        }),
      }
    );
  } catch (err) {
    console.error("Gemini fetch error:", err.cause ?? err);
    return res.status(500).json({ detail: String(err.cause ?? err) });
  }

  if (!geminiResponse.ok) {
    const errText = await geminiResponse.text();
    return res.status(geminiResponse.status).json({ detail: errText });
  }

  const data = await geminiResponse.json();
  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData ?? p.inline_data
  );

  if (!imagePart) {
    return res.status(500).json({ detail: "Gemini no devolvió ninguna imagen." });
  }

  const imageData = imagePart.inlineData ?? imagePart.inline_data;
  const outputDataUrl = `data:${imageData.mimeType ?? imageData.mime_type};base64,${imageData.data}`;

  const prediction = {
    id: crypto.randomUUID(),
    status: "succeeded",
    output: [outputDataUrl],
    input: { prompt, image: scribbleDataUri },
  };

  return res.status(201).json(prediction);
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
