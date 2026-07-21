(function () {
  "use strict";

  function $(sel, scope) { return (scope || document).querySelector(sel); }
  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } }

  function currentCycle() {
    var active = $(".toggle-opt.is-active");
    return active ? active.getAttribute("data-cycle") : "mensual";
  }

  function initCheckoutButtons() {
    var buttons = document.querySelectorAll("[data-checkout]");
    if (!buttons.length) return;

    buttons.forEach(function (btn) {
      var errorEl = btn.parentElement ? btn.parentElement.querySelector("[data-checkout-error]") : null;
      var originalText = btn.textContent;

      btn.addEventListener("click", function () {
        if (btn.disabled) return;
        var plan = btn.getAttribute("data-checkout");
        var cycle = currentCycle();

        btn.disabled = true;
        btn.textContent = "Redirigiendo…";
        if (errorEl) { errorEl.hidden = true; errorEl.textContent = ""; }

        fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: plan, cycle: cycle })
        })
          .then(function (res) {
            return res.json().then(function (data) { return { ok: res.ok, data: data }; });
          })
          .then(function (result) {
            if (!result.ok || !result.data || !result.data.url) {
              throw new Error((result.data && result.data.error) || "No se pudo iniciar el pago.");
            }
            window.location.href = result.data.url;
          })
          .catch(function (err) {
            btn.disabled = false;
            btn.textContent = originalText;
            if (errorEl) {
              errorEl.hidden = false;
              errorEl.textContent = err.message || "No se pudo conectar con Stripe. Probá de nuevo.";
            }
          });
      });
    });
  }

  function initCheckoutBanner() {
    var params = new URLSearchParams(window.location.search);
    var status = params.get("checkout");
    if (!status) return;

    var banner = document.createElement("div");
    banner.className = "checkout-banner " + (status === "success" ? "is-success" : "is-cancelled");
    banner.setAttribute("role", "status");
    banner.textContent = status === "success"
      ? "Listo (modo prueba): tu suscripción de prueba se creó correctamente. No se realizó ningún cobro real."
      : "Pago cancelado. No se realizó ningún cargo.";

    var closeBtn = document.createElement("button");
    closeBtn.className = "checkout-banner-close";
    closeBtn.setAttribute("aria-label", "Cerrar aviso");
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", function () { banner.remove(); });
    banner.appendChild(closeBtn);

    document.body.appendChild(banner);
    setTimeout(function () { banner.classList.add("is-visible"); }, 20);
    setTimeout(function () { if (banner.parentElement) banner.remove(); }, 9000);

    params.delete("checkout");
    var newUrl = window.location.pathname + (params.toString() ? "?" + params.toString() : "") + window.location.hash;
    window.history.replaceState({}, "", newUrl);
  }

  function boot() {
    safe(initCheckoutButtons, "initCheckoutButtons");
    safe(initCheckoutBanner, "initCheckoutBanner");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
