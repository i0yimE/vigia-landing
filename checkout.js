(function () {
  "use strict";

  function $(sel, scope) { return (scope || document).querySelector(sel); }
  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } }

  function currentCycle() {
    var active = $(".toggle-opt.is-active");
    return active ? active.getAttribute("data-cycle") : "mensual";
  }

  function planSummaryText(cycle) {
    return cycle === "anual"
      ? "Plan Pro · US$23/usuario/mes, facturado anualmente · 14 días gratis"
      : "Plan Pro · US$29/usuario/mes · 14 días gratis";
  }

  function initCheckoutModal() {
    var trigger = $('[data-checkout="pro"]');
    var modal = $("[data-checkout-modal]");
    if (!trigger || !modal || typeof modal.showModal !== "function") return;

    var form = $("[data-checkout-form]", modal);
    var successView = $("[data-checkout-success]", modal);
    var summary = $("[data-checkout-summary]", modal);
    var submitBtn = $("[data-checkout-submit]", modal);
    var closeBtn = $("[data-checkout-close]", modal);
    var doneBtn = $("[data-checkout-done]", modal);
    var cardInput = $("[data-cc-number]", modal);

    function resetModal() {
      form.hidden = false;
      successView.hidden = true;
      form.reset();
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirmar prueba gratuita";
    }

    trigger.addEventListener("click", function () {
      if (summary) summary.textContent = planSummaryText(currentCycle());
      resetModal();
      modal.showModal();
    });

    if (closeBtn) closeBtn.addEventListener("click", function () { modal.close(); });
    if (doneBtn) doneBtn.addEventListener("click", function () { modal.close(); });
    modal.addEventListener("click", function (e) {
      if (e.target === modal) modal.close();
    });
    modal.addEventListener("close", resetModal);

    if (cardInput) {
      cardInput.addEventListener("input", function () {
        var digits = cardInput.value.replace(/\D/g, "").slice(0, 16);
        cardInput.value = digits.replace(/(.{4})/g, "$1 ").trim();
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      submitBtn.disabled = true;
      submitBtn.textContent = "Procesando…";
      setTimeout(function () {
        form.hidden = true;
        successView.hidden = false;
      }, 1100);
    });
  }

  function boot() { safe(initCheckoutModal, "initCheckoutModal"); }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
