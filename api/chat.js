export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { character, userMessage, history, currentMission } = req.body;

  // API Key Groq
  const GROQ_API_KEY = process.env.GROQ_API_KEY || "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";

  const PERSONAS = {
    rian: `Kamu adalah Rian Pratama, desainer grafis 23 tahun. Ramah, sopan, sedikit pemalu tapi perhatian. Bicara santai khas anak muda Indonesia (pake wkwk, kak, kamu, aku). JANGAN mengaku sebagai AI.`,
    dimas: `Kamu adalah Dimas, sahabat konyol Rian. Ceplas-ceplos, suka menggoda Rian. Kamu panggil Rian "si Rian". JANGAN berpura-pura jadi Rian!`,
    siti: `Kamu adalah Siti, sahabat terdekat pemeran utama. Heboh, supportive, dan penasaran.`,
    maya: `Kamu adalah Maya, rekan kerja Rian. Profesional dan sopan.`,
    ibu: `Kamu adalah Ibu. Warm, perhatian, dan selalu ingatkan makan & istirahat.`
  };

  const MISSION_CONTEXTS = {
    1: "SITUASI: Kamu (Rian) baru saja salah kirim boba Earl Grey ke rumah pemeran utama karena Kirana salah kasih nomor. Kamu di luar pagar. BELUM PERNAH bertemu/pacaran.",
    2: "SITUASI: Sudah tahu nama dan ngobrol di WhatsApp tentang boba dan postingan X.",
    3: "SITUASI: Mengirimkan martabak manis lewat ojol.",
    4: "SITUASI: Panggilan telepon pertama.",
    5: "SITUASI: Janjian kencan pertama di Kopi Nanti.",
    6: "SITUASI: Sudah melewati kencan pertama.",
    7: "SITUASI: Kesalahpahaman dengan Maya sudah selesai.",
    8: "SITUASI: Kencan di Pantai Senja."
  };

  const systemInstruction = `
${PERSONAS[character] || PERSONAS.rian}

ATURAN BATASAN CERITA:
- ${MISSION_CONTEXTS[currentMission] || MISSION_CONTEXTS[1]}
- DILARANG membocorkan alur cerita misi masa depan! HANYA tahu sampai Misi ${currentMission}.
- Balas singkat dan alami seperti pesan WhatsApp (1-3 kalimat).
`;

  const messages = [
    { role: "system", content: systemInstruction }
  ];

  if (Array.isArray(history)) {
    history.forEach(msg => {
      messages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      });
    });
  }

  messages.push({ role: "user", content: userMessage });

  try {
    // Deteksi otomatis model Groq yang tersedia di akun kamu
    let selectedModel = "llama-3.1-8b-instant";
    
    try {
      const modelsRes = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { "Authorization": `Bearer ${GROQ_API_KEY}` }
      });
      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        const modelList = modelsData.data.map(m => m.id);
        
        const preferred = ["llama-3.1-8b-instant", "llama3-8b-8192", "llama3-70b-8192", "llama-3.3-70b-versatile"];
        const matched = preferred.find(p => modelList.includes(p));
        if (matched) {
          selectedModel = matched;
        } else if (modelList.length > 0) {
          selectedModel = modelList[0];
        }
      }
    } catch (e) {
      console.error("Gagal mendeteksi model:", e);
    }

    // Kirim request ke Groq API
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: messages,
        temperature: 0.7,
        max_tokens: 150
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(200).json({ 
        reply: `[Error Groq ${response.status}]: ${data.error?.message || JSON.stringify(data)}` 
      });
    }

    let reply = data.choices?.[0]?.message?.content || "Maaf, pesan kosong dari server.";
    reply = reply.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F7FF}\u{1F780}-\u{1F7FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

    return res.status(200).json({ reply: reply.trim() });
  } catch (error) {
    return res.status(200).json({ reply: `[Server Error]: ${error.message}` });
  }
}
