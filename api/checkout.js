const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;

// Precio del plan Pro en centavos de USD. "anual" es un cargo único por año
// (23 USD/mes equivalente), no un cargo mensual con descuento recurrente.
const PLANS = {
  pro: {
    mensual: { unit_amount: 2900, interval: "month", label: "Vigía Pro — mensual" },
    anual: { unit_amount: 27600, interval: "year", label: "Vigía Pro — anual" },
  },
};

// Rate limit en memoria por IP — mismo criterio que /api/chat: best-effort,
// alcanza para frenar abuso trivial de creación de sesiones de Checkout.
const hits = new Map();
const WINDOW_MS = 60_000;
const MAX_REQ_PER_WINDOW = 6;

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

  if (!STRIPE_SECRET) {
    res.status(500).json({ error: "El checkout no está configurado todavía (falta STRIPE_SECRET_KEY en el proyecto de Vercel)." });
    return;
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    res.status(429).json({ error: "Demasiados intentos seguidos. Probá de nuevo en un minuto." });
    return;
  }

  const body = req.body || {};
  const planInfo = PLANS[body.plan];
  const priceInfo = planInfo && planInfo[body.cycle];
  if (!priceInfo) {
    res.status(400).json({ error: "Plan o ciclo de facturación inválido" });
    return;
  }

  const origin = req.headers.origin || ("https://" + req.headers.host);

  const params = new URLSearchParams();
  params.append("mode", "subscription");
  params.append("success_url", origin + "/?checkout=success");
  params.append("cancel_url", origin + "/?checkout=cancelado");
  params.append("line_items[0][quantity]", "1");
  params.append("line_items[0][price_data][currency]", "usd");
  params.append("line_items[0][price_data][unit_amount]", String(priceInfo.unit_amount));
  params.append("line_items[0][price_data][recurring][interval]", priceInfo.interval);
  params.append("line_items[0][price_data][product_data][name]", priceInfo.label);
  params.append("subscription_data[trial_period_days]", "14");
  params.append("payment_method_collection", "if_required");

  try {
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + STRIPE_SECRET,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error("[api/checkout]", data);
      res.status(502).json({ error: (data.error && data.error.message) || "No se pudo iniciar el pago." });
      return;
    }
    res.status(200).json({ url: data.url });
  } catch (err) {
    console.error("[api/checkout]", err);
    res.status(502).json({ error: "No se pudo conectar con Stripe. Probá de nuevo en un momento." });
  }
};
