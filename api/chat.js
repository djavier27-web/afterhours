
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.GROQ_API_KEY; "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"

  if (!apiKey) {
    return res.status(500).json({
      error: "GROQ_API_KEY belum diatur di Vercel."
    });
  }

  const {
    character,
    userMessage,
    history,
    currentMission
  } = req.body || {};

  const personas = {
    rian: `Kamu adalah Rian Pratama, desainer grafis berusia 23 tahun.
Ramah, sopan, sedikit pemalu tetapi perhatian.
Berbicara santai dalam bahasa Indonesia dengan gaya chat
WhatsApp, menggunakan aku, kamu, kak, dan wkwk sewajarnya.
Jangan mengaku sebagai AI.`,

    dimas: `Kamu adalah Dimas, sahabat Rian.
Ceplas-ceplos, humoris, suka menggoda Rian dan memanggilnya
"si Rian". Kamu bukan Rian. Jangan mengambil identitas Rian.`,

    siti: `Kamu adalah Siti, sahabat dekat pemeran utama.
Heboh, suportif, penasaran, dan suka membicarakan kejadian baru.`,

    maya: `Kamu adalah Maya, rekan kerja Rian.
Profesional, sopan, tenang, dan tidak mudah salah paham.`,

    ibu: `Kamu adalah Ibu, sosok yang hangat dan perhatian.
Kamu suka mengingatkan untuk makan dan beristirahat.`
  };

  const missions = {
    1: `Rian salah mengirim boba Earl Grey karena Kirana
salah memberikan nomor. Rian sedang berada di depan pagar.
Mereka belum pernah bertemu sebelumnya dan belum berpacaran.`,

    2: `Rian dan pemeran utama sudah mengetahui nama masing-masing
dan mengobrol di WhatsApp mengenai boba dan postingan X.`,

    3: `Rian mengirimkan martabak manis melalui ojek online
sebagai kejutan kecil.`,

    4: `Rian dan pemeran utama melakukan panggilan telepon
untuk pertama kalinya.`,

    5: `Rian dan pemeran utama memiliki janji kencan pertama
di kedai Kopi Nanti.`,

    6: `Rian dan pemeran utama sudah melewati kencan pertama
dan kini melanjutkan komunikasi mereka.`,

    7: `Kesalahpahaman mengenai Maya sudah diselesaikan.
Jangan membuat konflik lama muncul tanpa alasan.`,

    8: `Rian dan pemeran utama menghabiskan waktu bersama
di Pantai Senja. Percakapan dapat berkembang secara alami.`
  };

  const id = personas[character] ? character : "rian";
  const mission = Math.max(
    1,
    Math.min(8, Number(currentMission) || 1)
  );

  if (
    typeof userMessage !== "string" ||
    !userMessage.trim() ||
    userMessage.length > 1500
  ) {
    return res.status(400).json({
      error: "Pesan kosong atau terlalu panjang."
    });
  }

  const systemInstruction = `
${personas[id]}

KONTEKS CERITA:
${missions[mission]}

ATURAN:
- Cerita berlangsung dalam AU fiksi interaktif.
- Jangan membocorkan kejadian pada misi berikutnya.
- Ketahui hanya peristiwa yang sudah terjadi sampai misi aktif.
- Jangan mengarang bahwa karakter sudah bertemu jika belum.
- Pertahankan kepribadian dan hubungan antarkarakter.
- Balas secara alami seperti pesan WhatsApp.
- Umumnya cukup 1–3 kalimat.
- Jangan menulis dialog atau menentukan tindakan pemain.
- Jangan mengulang pesan pemain sebagai balasan.
`;

  const safeHistory = Array.isArray(history)
    ? history.slice(-20).filter(msg =>
        msg &&
        ["user", "ai"].includes(msg.sender) &&
        typeof msg.text === "string"
    )
    : [];

  const messages = [
    { role: "system", content: systemInstruction },
    ...safeHistory.map(msg => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.text.slice(0, 2000)
    })),
    { role: "user", content: userMessage.trim() }
  ];

  // Hilangkan duplikasi pesan terakhir bila sudah terdapat di history.
  if (
    safeHistory.length &&
    safeHistory[safeHistory.length - 1].sender === "user" &&
    safeHistory[safeHistory.length - 1].text === userMessage.trim()
  ) {
    messages.pop();
  }

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "qwen/qwen3.8-27b",
          messages,
          temperature: 0.7,
          max_tokens: 180
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", response.status);

      return res.status(502).json({
        error: "Layanan AI sedang bermasalah. Coba lagi nanti."
      });
    }

    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(502).json({
        error: "AI tidak memberikan balasan."
      });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Chat backend error:", error.message);

    return res.status(500).json({
      error: "Terjadi kesalahan pada server."
    });
  }
}
