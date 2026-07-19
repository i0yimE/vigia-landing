(function () {
  "use strict";
  window.__BRAND__ = {
    name: "Vigía",
    tagline: "Observabilidad para equipos que despliegan a diario",

    // Pool de eventos para el feed de actividad del hero
    feedEvents: [
      { ico: "dep",  cls: "dep",  title: "Deploy v2.14.1", meta: "sofi@ · pagos-worker" },
      { ico: "ok",   cls: "ok",   title: "Chequeo de salud OK", meta: "api-gateway · 200" },
      { ico: "warn", cls: "warn", title: "Pico de latencia", meta: "search-svc · p95 380 ms" },
      { ico: "ok",   cls: "ok",   title: "Alerta resuelta", meta: "auto · reintentos pasarela" },
      { ico: "dep",  cls: "dep",  title: "Rollback v2.13.9", meta: "caro@ · checkout-api" },
      { ico: "ok",   cls: "ok",   title: "SLO al día", meta: "auth · 99,99 %" },
      { ico: "warn", cls: "warn", title: "Cola creciendo", meta: "emails · 1.2k pendientes" },
      { ico: "ok",   cls: "ok",   title: "Backup verificado", meta: "db-primaria · 02:00" }
    ],
    feedIcons: { ok: "✓", warn: "!", err: "×", dep: "▲" },

    // Pool de líneas para el stream de logs del demo
    logLines: [
      { level: "info",  msg: "pago procesado", meta: "orden=ord_2c81 monto=12900" },
      { level: "info",  msg: "sesión iniciada", meta: "usuario=u_8812" },
      { level: "info",  msg: "webhook entregado", meta: "evento=pago.confirmado" },
      { level: "warn",  msg: "reintento de pasarela", meta: "intento=2 espera=400ms" },
      { level: "info",  msg: "cache actualizada", meta: "clave=precios ttl=300s" },
      { level: "error", msg: "timeout en pasarela", meta: "orden=ord_11f0 tras=3000ms" },
      { level: "info",  msg: "orden creada", meta: "orden=ord_2c9a items=3" },
      { level: "warn",  msg: "respuesta lenta de db", meta: "query=ordenes 240ms" },
      { level: "info",  msg: "email enviado", meta: "plantilla=confirmacion" },
      { level: "error", msg: "validación fallida", meta: "campo=cupon codigo=EXPIRADO" }
    ]
  };
})();
