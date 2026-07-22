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

  function planAmountText(cycle) {
    return cycle === "anual" ? "US$23/mes (facturado anualmente)" : "US$29/mes";
  }

  function cardBrand(digits) {
    if (/^4/.test(digits)) return "visa";
    if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
    if (/^3[47]/.test(digits)) return "amex";
    if (/^(6011|65)/.test(digits)) return "discover";
    return "generic";
  }

  var BRAND_LABEL = { visa: "Visa", mastercard: "Mastercard", amex: "American Express", discover: "Discover", generic: "Tarjeta" };

  function luhnValid(digits) {
    if (!/^\d{13,19}$/.test(digits)) return false;
    var sum = 0, alt = false;
    for (var i = digits.length - 1; i >= 0; i--) {
      var n = parseInt(digits.charAt(i), 10);
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
      alt = !alt;
    }
    return sum % 10 === 0;
  }

  function groupCardNumber(digits, brand) {
    if (brand === "amex") {
      return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)].filter(Boolean).join(" ");
    }
    return digits.replace(/(.{4})/g, "$1 ").trim();
  }

  function initCheckoutModal() {
    var trigger = $('[data-checkout="pro"]');
    var modal = $("[data-checkout-modal]");
    if (!trigger || !modal || typeof modal.showModal !== "function") return;

    var form = $("[data-checkout-form]", modal);
    var successView = $("[data-checkout-success]", modal);
    var summary = $("[data-checkout-summary]", modal);
    var submitBtn = $("[data-checkout-submit]", modal);
    var submitLabel = $("[data-submit-label]", modal);
    var closeBtn = $("[data-checkout-close]", modal);
    var doneBtn = $("[data-checkout-done]", modal);

    var nameInput = $("[data-cc-name]", modal);
    var numberInput = $("[data-cc-number]", modal);
    var expInput = $("[data-cc-exp]", modal);
    var cvcInput = $("[data-cc-cvc]", modal);

    var preview = $("[data-cc-preview]", modal);
    var previewNumber = $("[data-cc-preview-number]", modal);
    var previewName = $("[data-cc-preview-name]", modal);
    var previewExp = $("[data-cc-preview-exp]", modal);
    var previewCvc = $("[data-cc-preview-cvc]", modal);
    var brandLabelEl = $("[data-cc-brand-label]", modal);

    function fieldError(name, msg) {
      var el = $("[data-error-" + name + "]", modal);
      if (!el) return;
      if (msg) { el.textContent = msg; el.hidden = false; }
      else { el.textContent = ""; el.hidden = true; }
    }

    function updatePreview() {
      var digits = numberInput.value.replace(/\D/g, "");
      var brand = cardBrand(digits);
      var display = digits.length
        ? groupCardNumber((digits + "••••••••••••••••").slice(0, brand === "amex" ? 15 : 16), brand)
        : "•••• •••• •••• ••••";
      previewNumber.textContent = display;
      previewName.textContent = nameInput.value.trim() ? nameInput.value.trim().toUpperCase() : "NOMBRE APELLIDO";
      previewExp.textContent = expInput.value || "MM/AA";
      previewCvc.textContent = cvcInput.value ? cvcInput.value.replace(/\d/g, "•") : "•••";
      brandLabelEl.textContent = BRAND_LABEL[brand];
      preview.setAttribute("data-brand", brand);
    }

    function resetModal() {
      form.hidden = false;
      successView.hidden = true;
      form.reset();
      ["name", "number", "exp", "cvc"].forEach(function (f) { fieldError(f, ""); });
      submitBtn.disabled = false;
      submitLabel.textContent = "Confirmar prueba gratuita";
      preview.classList.remove("is-flipped");
      updatePreview();
    }

    trigger.addEventListener("click", function () {
      if (summary) summary.textContent = planSummaryText(currentCycle());
      resetModal();
      modal.showModal();
      nameInput.focus();
    });

    if (closeBtn) closeBtn.addEventListener("click", function () { modal.close(); });
    if (doneBtn) doneBtn.addEventListener("click", function () { modal.close(); });
    modal.addEventListener("click", function (e) {
      if (e.target === modal) modal.close();
    });
    modal.addEventListener("close", resetModal);

    nameInput.addEventListener("input", updatePreview);

    numberInput.addEventListener("input", function () {
      var digits = numberInput.value.replace(/\D/g, "");
      var brand = cardBrand(digits);
      var max = brand === "amex" ? 15 : 16;
      digits = digits.slice(0, max);
      numberInput.value = groupCardNumber(digits, brand);
      cvcInput.maxLength = brand === "amex" ? 4 : 3;
      fieldError("number", "");
      updatePreview();
    });

    expInput.addEventListener("input", function () {
      var digits = expInput.value.replace(/\D/g, "").slice(0, 4);
      if (digits.length >= 3) digits = digits.slice(0, 2) + "/" + digits.slice(2);
      expInput.value = digits;
      fieldError("exp", "");
      updatePreview();
    });

    cvcInput.addEventListener("input", function () {
      cvcInput.value = cvcInput.value.replace(/\D/g, "").slice(0, cvcInput.maxLength || 3);
      fieldError("cvc", "");
      updatePreview();
    });
    cvcInput.addEventListener("focus", function () { preview.classList.add("is-flipped"); });
    cvcInput.addEventListener("blur", function () { preview.classList.remove("is-flipped"); });

    function validate() {
      var ok = true;

      if (!nameInput.value.trim()) {
        fieldError("name", "Ingresá el nombre como figura en la tarjeta.");
        ok = false;
      } else fieldError("name", "");

      var digits = numberInput.value.replace(/\D/g, "");
      if (!luhnValid(digits)) {
        fieldError("number", "Número de tarjeta inválido. Probá con 4242 4242 4242 4242.");
        ok = false;
      } else fieldError("number", "");

      var expMatch = /^(\d{2})\/(\d{2})$/.exec(expInput.value);
      if (!expMatch || Number(expMatch[1]) < 1 || Number(expMatch[1]) > 12) {
        fieldError("exp", "Vencimiento inválido (MM/AA).");
        ok = false;
      } else fieldError("exp", "");

      var cvcLen = cvcInput.maxLength === 4 ? 4 : 3;
      if (cvcInput.value.length !== cvcLen) {
        fieldError("cvc", "CVC de " + cvcLen + " dígitos.");
        ok = false;
      } else fieldError("cvc", "");

      return ok;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate()) return;

      submitBtn.disabled = true;
      submitLabel.textContent = "Procesando…";

      setTimeout(function () {
        var digits = numberInput.value.replace(/\D/g, "");
        var cycle = currentCycle();
        $("[data-receipt-cycle]", modal).textContent = cycle === "anual" ? "Anual" : "Mensual";
        $("[data-receipt-amount]", modal).textContent = planAmountText(cycle);
        $("[data-receipt-card]", modal).textContent = "···· " + digits.slice(-4);

        form.hidden = true;
        successView.hidden = false;
      }, 1200);
    });

    updatePreview();
  }

  function boot() { safe(initCheckoutModal, "initCheckoutModal"); }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
