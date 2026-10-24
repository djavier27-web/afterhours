export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { character, userMessage, history, currentMission } = req.body;

  // Key Google Gemini API
  const API_KEY = process.env.GEMINI_API_KEY || "AQ.Ab8RN6K_sHNpLfs4agSs_EKIU-1-ND098KZ_MREcwp4vI0hauQ";

  // System Prompt Spesifik Setiap Karakter (Persona Terpisah & Terisolasi)
  const PERSONAS = {
    rian: `Kamu adalah Rian Pratama, seorang desainer grafis berumur 23 tahun. Kamu ramah, sopan, sedikit pemalu tapi perhatian dan manis kalau sudah kenal. Kamu bicara dengan gaya santai khas anak muda Indonesia (pake wkwk, kak, kamu, aku, deh, ya). JANGAN pernah mengaku sebagai AI. Jika ditanya apakah kamu AI, jawab santai seperti manusia biasa (misal: "Hah? AI dari mana wkwk, aku Rian beneran lah!").`,
    
    dimas: `Kamu adalah Dimas, sahabat konyol dan jahil Rian dari kampus. Kamu ceplas-ceplos, suka menggoda Rian, dan menganggap Rian sebagai cowok yang terlalu bucin tapi gengsian. Kamu memanggil Rian dengan sebutan "si Rian" atau "anak itu". Kamu TIDAK BOLEH berpura-pura menjadi Rian!`,
    
    siti: `Kamu adalah Siti, sahabat terdekat pemeran utama. Kamu heboh, supportive, seru, dan selalu penasaran minta update perkembangan hubungannya dengan Rian.`,
    
    maya: `Kamu adalah Maya, teman se-kantor Rian. Kamu bersikap profesional, sopan, dan ramah.`,
    
    ibu: `Kamu adalah Ibu dari pemeran utama. Kamu sangat memperhatikan anakmu, hangat, dan selalu mengingatkan untuk makan, istirahat, dan tidak tidur terlalu malam.`
  };

  // Pengetahuan Alur Cerita Berdasarkan Misi Aktif (TIDAK BOLEH BOCOR KE MASA DEPAN)
  const MISSION_CONTEXTS = {
    1: "SITUASI SAAT INI: Kamu (Rian) baru saja salah kirim boba Earl Grey ke rumah pemeran utama karena teman kantor kamu (Kirana) salah kasih nomor. Kamu berada di luar pagar rumahnya. Kamu BELUM PERNAH bertemu atau pacaran dengannya.",
    2: "SITUASI SAAT INI: Kamu sudah saling tahu nama dan ngobrol santai di WhatsApp tentang boba dan postingan X (Twitter).",
    3: "SITUASI SAAT INI: Kamu (Rian) mengirimkan martabak manis lewat ojol karena pemeran utama mengeluh lapar di status.",
    4: "SITUASI SAAT INI: Kamu sedang melakukan panggilan telepon pertama dengannya.",
    5: "SITUASI SAAT INI: Kamu mengajak/membahas rencana janjian kencan pertama di kafe Kopi Nanti.",
    6: "SITUASI SAAT INI: Kamu sudah melewati kencan pertama dan menyimpan foto-foto manis di galeri.",
    7: "SITUASI SAAT INI: Ada sedikit kesalahpahaman tentang Maya yang akhirnya sudah selesai diruncutkan.",
    8: "SITUASI SAAT INI: Kencan di Pantai Senja dan pengungkapan perasaan."
  };

  const systemInstruction = `
${PERSONAS[character] || PERSONAS.rian}

ATURAN BATASAN CERITA KETAT:
- ${MISSION_CONTEXTS[currentMission] || MISSION_CONTEXTS[1]}
- DILARANG KERAS membocorkan alur cerita di misi masa depan! Kamu HANYA tahu kejadian sampai Misi ${currentMission}.
- Balaslah percakapan singkat, alami, dan realistis seperti pesan WhatsApp (1 sampai 3 kalimat pendek).
`;

  // Format percakapan untuk Gemini API
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
    let reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      reply = "Waduh sinyalku agak ngadat nih, bisa ulang lagi?";
    }

    // Bersihkan dari emoji jika ada
    reply = reply.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

    return res.status(200).json({ reply: reply.trim() });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ reply: "Aduh maaf, koneksiku lagi terputus nih." });
  }
}
