export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { character, userMessage, history, currentMission } = req.body;

  const API_KEY = process.env.GEMINI_API_KEY || "AQ.Ab8RN6JOdNue2s2oSZgmnCuW-K51UviSFai7COKJgSI3athQnQ";

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

  const contents = [
    { role: 'user', parts: [{ text: systemInstruction }] },
    { role: 'model', parts: [{ text: "Siap, aku paham peran dan batasan ceritaku." }] }
  ];

  if (Array.isArray(history)) {
    history.forEach(msg => {
      contents.push({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      });
    });
  }

  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Google API Error:", data);
      return res.status(200).json({ 
        reply: `[Error ${response.status}]: ${data.error?.message || 'API Key ditolak Google'}` 
      });
    }

    let reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      reply = "Waduh sinyalku agak ngadat nih, bisa ulang lagi?";
    }

    reply = reply.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F7FF}\u{1F780}-\u{1F7FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

    return res.status(200).json({ reply: reply.trim() });
  } catch (error) {
    console.error("Vercel Server Error:", error);
    return res.status(500).json({ reply: `Server Error: ${error.message}` });
  }
}
