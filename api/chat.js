const { GoogleGenerativeAI } = require("@google/generative-ai");

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const SYSTEM_INSTRUCTION = `Sos el asistente virtual de Vigía, un producto de demostración: una plataforma de observabilidad (logs, trazas, alertas y SLOs) para equipos de desarrollo que despliegan seguido.

Respondé solo sobre Vigía, con estos datos reales del sitio:
- Planes: Free (US$0, 1M eventos/mes, 3 usuarios, retención 7 días), Pro (US$29/usuario/mes o US$23 anual, eventos y usuarios ilimitados, retención 30 días, SSO Google/GitHub, alertas como código), Enterprise (a medida, SSO/SAML+SCIM, SLA 99,99%, residencia de datos UE/EE.UU., self-hosted).
- Trial: 14 días gratis en Pro, sin tarjeta de crédito.
- Seguridad y compliance: SOC 2 Type II, ISO 27001, cumple GDPR, DPA estándar, cifrado en tránsito y reposo.
- Compatible con OpenTelemetry (migración simple desde Datadog/Grafana).
- Métricas públicas: 2.400 equipos en producción, 99,99% uptime de la plataforma, MTTR mediano de 9 minutos, 4,8/5 en G2 (210 reseñas), 4,7/5 en Capterra.

Si te preguntan algo fuera de este contexto (no relacionado con Vigía, con software, o con estas categorías), respondé amablemente que solo podés ayudar con consultas sobre Vigía. Sé breve, concreto y en español rioplatense neutro. No inventes funcionalidades o cifras que no estén en esta lista.`;

// Rate limit en memoria por IP — best-effort: se reinicia en cada cold start
// de la función serverless, no es un límite exacto entre instancias, pero
// alcanza para frenar abuso trivial de la cuota gratuita de Gemini.
const hits = new Map();
const WINDOW_MS = 60_000;
const MAX_REQ_PER_WINDOW = 8;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip) || { count: 0, start: now };
  if (now - entry.start > WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  hits.set(ip, entry);
  return entry.count > MAX_REQ_PER_WINDOW;
}

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "unknown";
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({ error: "El chat no está configurado todavía (falta GEMINI_API_KEY en el proyecto de Vercel)." });
    return;
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    res.status(429).json({ error: "Demasiadas consultas seguidas. Probá de nuevo en un minuto." });
    return;
  }

  const body = req.body || {};
  const messages = Array.isArray(body.messages) ? body.messages : null;
  if (!messages || messages.length === 0) {
    res.status(400).json({ error: "Formato de mensaje inválido" });
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: SYSTEM_INSTRUCTION });

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: String(m.content || "").slice(0, 4000) }],
    }));

    const lastContent = String(messages[messages.length - 1].content || "").slice(0, 4000);
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastContent);
    const text = result.response.text();

    res.status(200).json({ reply: text });
  } catch (err) {
    console.error("[api/chat]", err);
    res.status(502).json({ error: "No se pudo generar la respuesta. Intentá de nuevo en un momento." });
  }
};
