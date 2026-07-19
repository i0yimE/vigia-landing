(function () {
  "use strict";

  var data = window.__BRAND__ || {};
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

  function $(sel, scope) { return (scope || document).querySelector(sel); }
  function $$(sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); }
  function escHTML(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "]", e); }
  }

  /* ---------------- Nav ---------------- */
  function initNav() {
    var nav = $("[data-nav]");
    if (!nav) return;
    var onScroll = function () {
      nav.classList.toggle("is-scrolled", window.scrollY > 24);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    var burger = $("[data-burger]");
    if (burger) {
      burger.addEventListener("click", function () {
        var open = nav.classList.toggle("is-open");
        burger.setAttribute("aria-expanded", open ? "true" : "false");
        burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
      });
      // cerrar al elegir un link
      $$("[data-nav-links] a").forEach(function (a) {
        a.addEventListener("click", function () {
          nav.classList.remove("is-open");
          burger.setAttribute("aria-expanded", "false");
        });
      });
    }
  }

  /* ---------------- Smooth anchors (nativo) ---------------- */
  function initSmoothScroll() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var id = a.getAttribute("href");
      if (!id || id === "#") return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - 80,
        behavior: reduced ? "auto" : "smooth"
      });
    });
  }

  /* ---------------- Mouse-reactive gradient ---------------- */
  function initMouseGradient() {
    if (!fineHover) return;
    var el = $("[data-mouse-gradient]");
    if (!el) return;
    var mx = 60, my = 25, tx = 60, ty = 25, raf = null;
    function tick() {
      mx += (tx - mx) * 0.08;
      my += (ty - my) * 0.08;
      el.style.setProperty("--mx", mx.toFixed(2) + "%");
      el.style.setProperty("--my", my.toFixed(2) + "%");
      if (Math.abs(tx - mx) > 0.1 || Math.abs(ty - my) > 0.1) {
        raf = requestAnimationFrame(tick);
      } else { raf = null; }
    }
    window.addEventListener("mousemove", function (e) {
      tx = (e.clientX / window.innerWidth) * 100;
      ty = (e.clientY / window.innerHeight) * 100;
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
  }

  /* ---------------- Reveals ---------------- */
  function initReveals() {
    var targets = $$(".reveal");
    if (!targets.length) return;
    if (typeof IntersectionObserver === "undefined") {
      targets.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.04, rootMargin: "0px 0px -4% 0px" });
    targets.forEach(function (el) { io.observe(el); });

    // Red de seguridad: a los 6 s, revelar lo que quedó en viewport
    setTimeout(function () {
      $$(".reveal:not(.is-visible)").forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add("is-visible");
        }
      });
    }, 6000);
  }

  /* ---------------- Count-up ---------------- */
  function initCountUp() {
    var els = $$("[data-count-to]");
    if (!els.length || typeof IntersectionObserver === "undefined") return;

    function animate(el) {
      var to = parseFloat(el.getAttribute("data-count-to"));
      if (isNaN(to)) return;
      var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
      var useMiles = el.getAttribute("data-format") === "miles";
      var dur = reduced ? 500 : 1500;
      var start = null;
      function fmt(v) {
        var s = v.toFixed(decimals).replace(".", ",");
        if (useMiles) s = Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        return s;
      }
      function step(t) {
        if (!start) start = t;
        var p = Math.min((t - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(to * eased);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = fmt(to);
      }
      requestAnimationFrame(step);
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.04 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- Feed de actividad (hero) ---------------- */
  function initLiveFeed() {
    var feed = $("[data-feed]");
    var pool = data.feedEvents;
    var icons = data.feedIcons || {};
    if (!feed || !pool || !pool.length) return;
    var i = 0;

    function push() {
      var ev = pool[i % pool.length];
      i++;
      var row = document.createElement("div");
      row.className = "feed-row is-new";
      row.innerHTML =
        '<span class="feed-ico ' + escHTML(ev.cls) + '">' + escHTML(icons[ev.ico] || "•") + "</span>" +
        "<div><strong>" + escHTML(ev.title) + "</strong><span>" + escHTML(ev.meta) + "</span></div>";
      feed.insertBefore(row, feed.firstChild);
      while (feed.children.length > 5) feed.removeChild(feed.lastChild);
    }

    var interval = reduced ? 8000 : 4200;
    setInterval(function () {
      if (document.hidden) return;
      var rect = feed.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      push();
    }, interval);
  }

  /* ---------------- Demo: tabs ---------------- */
  function initDemoTabs() {
    var tabs = $$(".demo-tab");
    var panels = $$(".demo-panel");
    if (!tabs.length) return;
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var key = tab.getAttribute("data-tab");
        tabs.forEach(function (t) {
          var active = t === tab;
          t.classList.toggle("is-active", active);
          t.setAttribute("aria-selected", active ? "true" : "false");
        });
        panels.forEach(function (p) {
          var show = p.getAttribute("data-panel") === key;
          p.classList.toggle("is-active", show);
          if (show) {
            p.hidden = false;
            // reflow para que la transición de las barras arranque
            void p.offsetWidth;
            p.classList.add("is-shown");
          } else {
            p.hidden = true;
            p.classList.remove("is-shown");
          }
        });
      });
    });
  }

  /* ---------------- Demo: stream de logs + filtros ---------------- */
  function initLogDemo() {
    var list = $("[data-logstream]");
    var pool = data.logLines;
    if (!list || !pool || !pool.length) return;

    var currentFilter = "todos";
    var chips = $$(".chip[data-filter]");

    function applyFilter() {
      $$(".log-row", list).forEach(function (row) {
        var lvl = row.getAttribute("data-level");
        row.classList.toggle("is-hidden", currentFilter !== "todos" && lvl !== currentFilter);
      });
    }

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        currentFilter = chip.getAttribute("data-filter");
        chips.forEach(function (c) { c.classList.toggle("is-active", c === chip); });
        applyFilter();
      });
    });

    var i = 0;
    function two(n) { return n < 10 ? "0" + n : "" + n; }
    function push() {
      var line = pool[i % pool.length];
      i++;
      var d = new Date();
      var row = document.createElement("div");
      row.className = "log-row is-new";
      row.setAttribute("data-level", line.level);
      row.innerHTML =
        '<span class="log-time">' + two(d.getHours()) + ":" + two(d.getMinutes()) + ":" + two(d.getSeconds()) + "</span>" +
        '<span class="log-level lv-' + escHTML(line.level) + '">' + escHTML(line.level.toUpperCase()) + "</span>" +
        '<span class="log-msg">' + escHTML(line.msg) + " <em>" + escHTML(line.meta) + "</em></span>";
      list.appendChild(row);
      if (currentFilter !== "todos" && line.level !== currentFilter) row.classList.add("is-hidden");
      while (list.children.length > 14) list.removeChild(list.firstChild);
      list.scrollTop = list.scrollHeight;
    }

    var interval = reduced ? 5000 : 2400;
    setInterval(function () {
      if (document.hidden) return;
      var panel = list.closest(".demo-panel");
      if (panel && panel.hidden) return;
      var rect = list.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      push();
    }, interval);
  }

  /* ---------------- Demo: reconocer incidente ---------------- */
  function initIncident() {
    var box = $("[data-incident]");
    var btn = $("[data-ack]");
    var badge = $("[data-incident-badge]");
    var log = $("[data-incident-log]");
    if (!box || !btn) return;
    btn.addEventListener("click", function () {
      if (box.classList.contains("is-acked")) return;
      box.classList.add("is-acked");
      if (badge) badge.innerHTML = '<i class="live-dot"></i> Reconocida';
      btn.disabled = true;
      btn.classList.remove("btn-primary");
      btn.classList.add("btn-ghost");
      btn.textContent = "Reconocida por vos · recién";
      if (log) {
        var d = new Date();
        var li = document.createElement("li");
        li.className = "is-new";
        li.innerHTML = "<span>" + (d.getHours() < 10 ? "0" : "") + d.getHours() + ":" +
          (d.getMinutes() < 10 ? "0" : "") + d.getMinutes() +
          "</span> Incidente reconocido — la guardia deja de recibir avisos";
        log.appendChild(li);
      }
    });
  }

  /* ---------------- Demo: typing en búsqueda (bento) ---------------- */
  function initTyping() {
    var el = $("[data-typing]");
    if (!el) return;
    var full = el.textContent;
    if (reduced) return; // dejar el texto completo
    el.textContent = "";
    var started = false;
    if (typeof IntersectionObserver === "undefined") { el.textContent = full; return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !started) {
          started = true;
          io.unobserve(el);
          var i = 0;
          var t = setInterval(function () {
            i++;
            el.textContent = full.slice(0, i);
            if (i >= full.length) clearInterval(t);
          }, 45);
        }
      });
    }, { threshold: 0.04 });
    io.observe(el);
    // Seguridad: si nunca se disparó, mostrar completo a los 6 s
    setTimeout(function () { if (!started) el.textContent = full; }, 6000);
  }

  /* ---------------- Pricing toggle ---------------- */
  function initPricingToggle() {
    var opts = $$("[data-cycle]");
    var price = $("[data-price]");
    var note = $("[data-cycle-note]");
    if (!opts.length || !price) return;
    opts.forEach(function (opt) {
      opt.addEventListener("click", function () {
        var cycle = opt.getAttribute("data-cycle");
        opts.forEach(function (o) {
          var active = o === opt;
          o.classList.toggle("is-active", active);
          o.setAttribute("aria-pressed", active ? "true" : "false");
        });
        price.textContent = price.getAttribute(cycle === "anual" ? "data-annual" : "data-monthly");
        if (note) note.textContent = cycle === "anual" ? "facturado anualmente (–20 %)" : "facturado mensualmente";
      });
    });
  }

  /* ---------------- Boot ---------------- */
  function boot() {
    document.documentElement.classList.remove("no-js");
    safe(initNav, "initNav");
    safe(initSmoothScroll, "initSmoothScroll");
    safe(initMouseGradient, "initMouseGradient");
    safe(initReveals, "initReveals");
    safe(initCountUp, "initCountUp");
    safe(initLiveFeed, "initLiveFeed");
    safe(initDemoTabs, "initDemoTabs");
    safe(initLogDemo, "initLogDemo");
    safe(initIncident, "initIncident");
    safe(initTyping, "initTyping");
    safe(initPricingToggle, "initPricingToggle");

    if (window.gsap && window.ScrollTrigger) {
      try { gsap.registerPlugin(ScrollTrigger); } catch (_) {}
    }
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
