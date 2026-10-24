
const profiles = {
  raka: "Pendiam, perhatian, hangat, dan sedikit misterius.",
  naya: "Percaya diri, playful, jahil, tetapi perhatian.",
  elio: "Musisi yang menawan, puitis, dan penuh cerita.",
  kiara: "Sahabat yang jujur, peka, dan suportif.",
  devin: "Rival yang sarkastis, kompetitif, tetapi peduli."
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Gunakan POST." });
  }

  const apiKey = AQ.Ab8RN6K_sHNpLfs4agSs_EKIU-1-ND098KZ_MREcwp4vI0hauQ;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY belum diatur di Vercel."
    });
  }

  try {
    const {
      characterId = "raka",
      characterName = "Raka",
      message,
      history = []
    } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Pesan masih kosong." });
    }

    const profile = profiles[characterId] ||
      "Karakter fiksi yang ramah dan menarik.";

    const contents = Array.isArray(history)
      ? history.slice(-16).map(item => ({
          role: item.role === "model" ? "model" : "user",
          parts: [{
            text: String(item.text || "").slice(0, 4000)
          }]
        })).filter(item => item.parts[0].text.trim())
      : [];

    // Pastikan pesan terbaru masuk ke percakapan.
    const last = contents[contents.length - 1];
    if (
      !last ||
      last.role !== "user" ||
      last.parts[0].text.trim() !== message.trim()
    ) {
      contents.push({
        role: "user",
        parts: [{ text: message.trim() }]
      });
    }

    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text:
              `Kamu adalah ${characterName}, karakter fiksi di Afterhours. ` +
              `Kepribadianmu: ${profile} ` +
              "Balas secara natural seperti chat pribadi. " +
              "Ingat konteks percakapan, kembangkan cerita AU secara perlahan, " +
              "dan jawab pertanyaan di luar cerita dengan relevan. " +
              "Jangan mengaku sebagai manusia sungguhan."
          }]
        },
        contents,
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 600
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", data.error?.message);
      return res.status(502).json({
        error: "Gemini gagal merespons. Periksa API key, kuota, dan model."
      });
    }

    const reply = (data.candidates?.[0]?.content?.parts || [])
      .map(part => part.text || "")
      .join("")
      .trim();

    if (!reply) {
      return res.status(502).json({
        error: "Gemini tidak mengembalikan jawaban teks."
      });
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      error: "Terjadi kesalahan pada server."
    });
  }
}
