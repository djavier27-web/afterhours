
const express = require("express");
const app = express();

// ===== KONFIGURASI GEMINI =====
const GEMINI_API_KEY = "AQ.Ab8RN6K_sHNpLfs4agSs_EKIU-1-ND098KZ_MREcwp4vI0hauQ"; // BARIS 5
const GEMINI_MODEL = "gemini-2.5-flash";
const PORT = 3000;
// ==============================

app.use(express.json());
app.use(express.static("public"));

app.post("/api/chat", async (req, res) => {
  try {
    const { message, characterName = "Raka" } = req.body;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: `Kamu adalah ${characterName}, karakter fiksi
dalam website Afterhours AU romance.
Jawab dengan natural seperti percakapan pribadi.
Pertahankan kepribadian karakter dan bantu cerita
berkembang secara alami. Kamu juga boleh menjawab
pertanyaan di luar cerita dengan relevan.`
            }]
          },
          contents: [{
            role: "user",
            parts: [{ text: message }]
          }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 500
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: data.error?.message || "Gemini API gagal"
      });
    }

    const reply = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("") || "Aku belum bisa menjawab sekarang.";

    res.json({ reply });

  } catch (error) {
    res.status(500).json({
      error: "Kesalahan server: " + error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Afterhours berjalan di http://localhost:${PORT}`);
});
