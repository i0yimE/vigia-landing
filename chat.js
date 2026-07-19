(function () {
  "use strict";

  function $(sel, scope) { return (scope || document).querySelector(sel); }
  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } }

  function initChat() {
    var toggle = $("[data-chat-toggle]");
    var widget = $("[data-chat-widget]");
    var closeBtn = $("[data-chat-close]");
    var body = $("[data-chat-body]");
    var form = $("[data-chat-form]");
    var input = $("[data-chat-input]");
    if (!toggle || !widget || !form || !input || !body) return;

    var history = [];
    var sending = false;

    function setOpen(open) {
      widget.classList.toggle("is-open", open);
      widget.setAttribute("aria-hidden", open ? "false" : "true");
      toggle.classList.toggle("is-active", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) setTimeout(function () { input.focus(); }, 260);
    }

    toggle.addEventListener("click", function () {
      setOpen(!widget.classList.contains("is-open"));
    });
    if (closeBtn) closeBtn.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && widget.classList.contains("is-open")) setOpen(false);
    });

    function addMessage(role, text) {
      var p = document.createElement("p");
      p.className = "chat-msg " + (role === "user" ? "chat-msg-user" : role === "error" ? "chat-msg-error" : "chat-msg-bot");
      p.textContent = text;
      body.appendChild(p);
      body.scrollTop = body.scrollHeight;
      return p;
    }

    function showTyping() {
      var el = document.createElement("div");
      el.className = "chat-typing";
      el.setAttribute("data-typing-indicator", "");
      el.innerHTML = "<span></span><span></span><span></span>";
      body.appendChild(el);
      body.scrollTop = body.scrollHeight;
      return el;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text || sending) return;

      addMessage("user", text);
      history.push({ role: "user", content: text });
      input.value = "";
      sending = true;
      var typingEl = showTyping();
      var sendBtn = $(".chat-send", form);
      if (sendBtn) sendBtn.disabled = true;

      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history })
      })
        .then(function (res) {
          return res.json().then(function (data) { return { ok: res.ok, data: data }; });
        })
        .then(function (result) {
          typingEl.remove();
          if (!result.ok) {
            addMessage("error", (result.data && result.data.error) || "No se pudo obtener respuesta.");
            return;
          }
          var reply = (result.data && result.data.reply) || "No obtuve respuesta.";
          addMessage("bot", reply);
          history.push({ role: "model", content: reply });
        })
        .catch(function () {
          typingEl.remove();
          addMessage("error", "No se pudo conectar con el asistente. Probá de nuevo.");
        })
        .finally(function () {
          sending = false;
          if (sendBtn) sendBtn.disabled = false;
        });
    });
  }

  function boot() { safe(initChat, "initChat"); }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
