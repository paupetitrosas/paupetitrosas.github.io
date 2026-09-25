/* =============================================================
   Pau Petit Rosàs — site behaviour
   ============================================================= */
(function () {
  "use strict";

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------------------------------------------------------
     THEME  —  "detector" (dark)  <->  "preprint" (light)
     --------------------------------------------------------- */
  var root = document.documentElement;

  function setTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("ppr-theme", t); } catch (e) {}
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "light" ? "#f4f0e6" : "#08090c");
    window.dispatchEvent(new CustomEvent("ppr:theme"));
  }
  function toggleTheme() {
    setTheme(root.getAttribute("data-theme") === "light" ? "dark" : "light");
  }
  $$("#themeBtn, #themeBtn2").forEach(function (b) { b.addEventListener("click", toggleTheme); });

  /* ---------------------------------------------------------
     YEAR
     --------------------------------------------------------- */
  var yr = $("#yr");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------
     CUSTOM CURSOR  +  MAGNETIC ELEMENTS
     --------------------------------------------------------- */
  if (fine && !reduced) {
    var cur = $("#cur"), dot = $("#curDot");
    var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    var rx = cx, ry = cy;

    window.addEventListener("mousemove", function (e) {
      cx = e.clientX; cy = e.clientY;
      document.body.classList.add("cursor-on");
      dot.style.transform = "translate(" + cx + "px," + cy + "px)";
    }, { passive: true });

    (function ring() {
      rx += (cx - rx) * 0.16;
      ry += (cy - ry) * 0.16;
      cur.style.transform = "translate(" + rx + "px," + ry + "px)";
      requestAnimationFrame(ring);
    })();

    document.addEventListener("mouseleave", function () {
      document.body.classList.remove("cursor-on");
    });

    var hot = "a, button, .card, .proj, .tl-item";
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest && e.target.closest(hot)) document.body.classList.add("cursor-hot");
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest && e.target.closest(hot)) document.body.classList.remove("cursor-hot");
    });

    /* magnetic pull on key buttons */
    $$(".mag").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var mx = e.clientX - r.left - r.width / 2;
        var my = e.clientY - r.top - r.height / 2;
        el.style.transform = "translate(" + mx * 0.22 + "px," + my * 0.3 + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------------------------------------------------------
     SCROLL PROGRESS + STICKY BAR
     --------------------------------------------------------- */
  var bar = $("#progress"), topbar = $("#topbar");

  function onScroll() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? window.scrollY / h : 0;
    if (bar) bar.style.transform = "scaleX(" + p + ")";
    if (topbar) topbar.classList.toggle("stuck", window.scrollY > 40);
    fillTimeline();
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  /* ---------------------------------------------------------
     MOBILE MENU
     --------------------------------------------------------- */
  var burger = $("#burger"), mmenu = $("#mmenu");
  function closeMenu() {
    mmenu.classList.remove("open");
    document.body.classList.remove("locked");
    burger.setAttribute("aria-expanded", "false");
  }
  if (burger && mmenu) {
    burger.addEventListener("click", function () {
      var open = mmenu.classList.toggle("open");
      document.body.classList.toggle("locked", open);
      burger.setAttribute("aria-expanded", String(open));
      /* stagger the links in */
      $$("a", mmenu).forEach(function (a, i) {
        a.style.transitionDelay = open ? (120 + i * 55) + "ms" : "0ms";
      });
    });
    $$("a", mmenu).forEach(function (a) { a.addEventListener("click", closeMenu); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && mmenu.classList.contains("open")) closeMenu();
    });
  }

  /* ---------------------------------------------------------
     ANCHOR / RAIL NAVIGATION
     --------------------------------------------------------- */
  var BAR = 92;              /* fixed top bar, plus a little air */

  /* Layout position, walking offsetParents. getBoundingClientRect would
     include the reveal transform on a section that has not animated in
     yet, and the scroll would overshoot by exactly that much. */
  function docTop(el) {
    var y = 0;
    while (el) { y += el.offsetTop; el = el.offsetParent; }
    return y;
  }

  function goTo(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (id === "home") {
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      return;
    }
    /* Sections carry a lot of top padding, so their box starts well above
       the words. Aim at the heading block itself. */
    var head = el.querySelector(".sec-head, .idx") || el;
    window.scrollTo({ top: Math.max(0, docTop(head) - BAR),
                      behavior: reduced ? "auto" : "smooth" });
  }
  $$("[data-go]").forEach(function (b) {
    b.addEventListener("click", function () { goTo(b.dataset.go); });
  });
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href").slice(1);
      if (!document.getElementById(id)) return;
      e.preventDefault();
      goTo(id);
      history.replaceState(null, "", id === "home" ? location.pathname : "#" + id);
    });
  });

  /* a deep link lands the same way an in-page click does */
  if (location.hash.length > 1) {
    var deep = location.hash.slice(1);
    if (document.getElementById(deep)) {
      window.addEventListener("load", function () {
        setTimeout(function () { goTo(deep); }, 60);
      });
    }
  }

  /* active section highlighting */
  var sections = ["home", "about", "research", "projects", "toolkit", "path", "offduty", "contact"]
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  var navLinks = $$("#nav a");
  var railBtns = $$("#rail button");

  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var id = en.target.id;
      navLinks.forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + id); });
      railBtns.forEach(function (b) { b.classList.toggle("on", b.dataset.go === id); });
    });
  }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
  sections.forEach(function (s) { spy.observe(s); });

  /* ---------------------------------------------------------
     REVEAL ON SCROLL
     --------------------------------------------------------- */
  var rv = $$(".rv");
  if (reduced) {
    rv.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
      /* threshold 0: a target taller than the viewport can never reach a
         percentage threshold, so trigger on the leading edge instead */
    }, { threshold: 0, rootMargin: "0px 0px -10% 0px" });
    rv.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------
     ROTATING RESEARCH KEYWORD
     --------------------------------------------------------- */
  var rot = $("#rot");
  if (rot && !reduced) {
    /* the first word is already in the markup, so the line survives without JS */
    var words = [
      "Feynman integrals",
      "differential equations",
      "Monte Carlo generators",
      "radiative corrections",
      "high-precision numerics"
    ];
    rot.innerHTML = "";
    var spans = words.map(function (w, i) {
      var el = document.createElement("span");
      el.textContent = w;
      if (i === 0) el.className = "now";
      rot.appendChild(el);
      return el;
    });

    var ri = 0;
    setInterval(function () {
      spans[ri].className = "up";               /* current word exits upward */
      ri = (ri + 1) % spans.length;
      var next = spans[ri];
      next.style.transition = "none";           /* park it below without sliding there */
      next.className = "";
      void next.offsetHeight;                   /* flush, then let it animate up */
      next.style.transition = "";
      next.className = "now";
    }, 3200);
  }

  /* ---------------------------------------------------------
     PUBLICATIONS — accordion + filter
     --------------------------------------------------------- */
  $$("#pubs .pub").forEach(function (pub) {
    var head = $(".pub-head", pub);
    head.addEventListener("click", function () {
      var open = pub.classList.toggle("open");
      head.setAttribute("aria-expanded", String(open));
    });
  });

  function bindFilter(wrapSel, attr, itemSel, catAttr) {
    var wrap = $(wrapSel);
    if (!wrap) return;
    $$("button", wrap).forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$("button", wrap).forEach(function (b) { b.classList.remove("on"); });
        btn.classList.add("on");
        var f = btn.dataset[attr];
        $$(itemSel).forEach(function (item) {
          var cats = (item.getAttribute(catAttr) || "").split(/\s+/);
          var show = f === "all" || cats.indexOf(f) > -1;
          item.classList.toggle("hide", !show);
          if (!show) item.classList.remove("open");
        });
        fillTimeline();
      });
    });
  }
  bindFilter("#pubChips",  "pf", "#pubs .pub",        "data-kind");
  bindFilter("#projChips", "jf", "#projGrid .proj",   "data-cat");
  bindFilter("#tlChips",   "tf", "#tl .tl-item",      "data-tl");

  /* ---------------------------------------------------------
     TIMELINE SPINE — fills as you scroll past it
     --------------------------------------------------------- */
  var tl = $("#tl"), tlFill = $("#tlFill");
  function fillTimeline() {
    if (!tl || !tlFill) return;
    var r = tl.getBoundingClientRect();
    var anchor = window.innerHeight * 0.62;
    var p = (anchor - r.top) / r.height;
    p = Math.max(0, Math.min(1, p));
    tlFill.style.height = (p * (r.height - 12)) + "px";
  }

  /* ---------------------------------------------------------
     REVIEW CARDS — expand
     --------------------------------------------------------- */
  $$(".card").forEach(function (card) {
    var p = $("p", card), more = $(".more", card);
    if (!p || !more) return;
    /* hide the affordance when the text already fits */
    requestAnimationFrame(function () {
      if (p.scrollHeight <= p.clientHeight + 2) more.style.display = "none";
    });
    card.addEventListener("click", function () {
      var open = card.classList.toggle("open");
      more.textContent = open ? "Show less" : "Read more";
    });
  });

  /* =========================================================
     HERO — live Feynman diagram field

     Nothing here is an image. A topology is sampled into polylines,
     decorated into photon waves and gluon coils, then animated
     outward from the incoming legs so the interaction visibly
     propagates through the vertices. Once drawn, particles run the
     propagators on a loop. Placement is rejection-sampled against
     every live diagram and against the headline, so nothing ever
     overlaps anything else.
     ========================================================= */
  (function feynman() {
    var canvas = $("#fx");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, dpr = 1;
    var narrow = window.innerWidth < 780;
    var glow = !narrow;

    /* choreography, in milliseconds */
    var STEP   = 250;   /* delay between one depth level and the next */
    var EDGE   = 640;   /* time for a single propagator to draw itself */
    var SETTLE = 280;   /* pause after the last line lands */
    var PERIOD = 2600;  /* particle pulses repeat this often */
    var TRAVEL = 880;   /* time a pulse takes to cross one propagator */
    var FLASH  = 620;   /* vertex ignition */
    var FADE   = 1200;

    var ink = "#e8b54b", alt = "#9186f4", bg = "#08090c";

    /* The inks a diagram may be drawn in, weighted so gold still reads as
       the house colour and the rest arrive as occasional variation. */
    var HUE_MIX = [["--dia-gold", 9], ["--dia-violet", 4], ["--dia-teal", 3],
                   ["--dia-rose", 2], ["--dia-bone", 3]];
    var HUES = [], HUE_VAL = {};

    function readColours() {
      var cs = getComputedStyle(root);
      ink = (cs.getPropertyValue("--gold") || "#e8b54b").trim();
      alt = (cs.getPropertyValue("--violet") || "#9186f4").trim();
      bg = (cs.getPropertyValue("--ink") || "#08090c").trim();
      HUES = [];
      HUE_VAL = {};
      HUE_MIX.forEach(function (d) {
        HUE_VAL[d[0]] = (cs.getPropertyValue(d[0]) || "").trim() || ink;
        for (var i = 0; i < d[1]; i++) HUES.push(d[0]);
      });
    }

    function hueOf(d) { return HUE_VAL[d.hue] || d.hue || ink; }

    /* pick an ink, nudged away from the ones already on screen */
    function pickHue(taken) {
      var c = HUES[(Math.random() * HUES.length) | 0] || ink;
      for (var i = 0; i < 4 && taken && taken.indexOf(c) > -1; i++) {
        c = HUES[(Math.random() * HUES.length) | 0];
      }
      return c;
    }
    readColours();
    window.addEventListener("ppr:theme", readColours);

    /* ---- topologies, in local units roughly spanning [-1, 1] ----
       F fermion (solid, arrowed) · P photon (wave) · G gluon (coil)
       D scalar/meson (dashed) · b hadronic blob                      */
    var F = "f", P = "p", G = "g", D = "d";
    var TOPOS = [
      /* ---------- tree level ---------- */
      { name: "annihilation",
        e: [
          { t: F, a: [-1.0, -0.66], b: [-0.34, 0], arrow: 1 },
          { t: F, a: [-0.34, 0], b: [-1.0,  0.66], arrow: 1 },
          { t: P, a: [-0.34, 0],    b: [0.34, 0] },
          { t: F, a: [0.34, 0],     b: [1.0, -0.66], arrow: 1 },
          { t: F, a: [1.0,  0.66],  b: [0.34, 0], arrow: 1 }
        ],
        v: [[-0.34, 0], [0.34, 0]],
        l: [{ p: [-1.0, -0.66], t: "e⁻" }, { p: [-1.0, 0.66], t: "e⁺" },
            { p: [1.0, -0.66],  t: "μ⁻" }, { p: [1.0, 0.66], t: "μ⁺" }] },

      /* e⁺e⁻ → π⁺π⁻, the hadronic channel behind the g−2 dispersion integral */
      { name: "twopion",
        e: [
          { t: F, a: [-1.0, -0.66], b: [-0.34, 0], arrow: 1 },
          { t: F, a: [-0.34, 0], b: [-1.0,  0.66], arrow: 1 },
          { t: P, a: [-0.34, 0],    b: [0.34, 0] },
          { t: D, a: [0.34, 0],     b: [1.0, -0.66] },
          { t: D, a: [0.34, 0],     b: [1.0,  0.66] }
        ],
        v: [[-0.34, 0], [0.34, 0]],
        l: [{ p: [-1.0, -0.66], t: "e⁻" }, { p: [-1.0, 0.66], t: "e⁺" },
            { p: [1.0, -0.66],  t: "π⁺" }, { p: [1.0, 0.66], t: "π⁻" }] },

      /* t-channel Bhabha — the luminosity process at low-energy colliders */
      { name: "bhabha",
        e: [
          { t: F, a: [-1.1, -0.72], b: [0, -0.45], arrow: 1 },
          { t: F, a: [0, -0.45], b: [1.1, -0.72], arrow: 1 },
          { t: P, a: [0, -0.45], b: [0, 0.45] },
          { t: F, a: [1.1, 0.72], b: [0, 0.45], arrow: 1 },
          { t: F, a: [0, 0.45], b: [-1.1, 0.72], arrow: 1 }
        ],
        v: [[0, -0.45], [0, 0.45]],
        l: [{ p: [-1.1, -0.72], t: "e⁻" }, { p: [1.1, -0.72], t: "e⁻" },
            { p: [-1.1, 0.72],  t: "e⁺" }, { p: [1.1, 0.72], t: "e⁺" }] },

      /* gluon exchange */
      { name: "qcd22",
        e: [
          { t: F, a: [-1.1, -0.72], b: [0, -0.45], arrow: 1 },
          { t: F, a: [0, -0.45], b: [1.1, -0.72], arrow: 1 },
          { t: G, a: [0, -0.45], b: [0, 0.45] },
          { t: F, a: [-1.1, 0.72], b: [0, 0.45], arrow: 1 },
          { t: F, a: [0, 0.45], b: [1.1, 0.72], arrow: 1 }
        ],
        v: [[0, -0.45], [0, 0.45]],
        l: [{ p: [-1.1, -0.72], t: "q" }, { p: [1.1, -0.72], t: "q" },
            { p: [-1.1, 0.72],  t: "q" }, { p: [1.1, 0.72], t: "q" }] },

      { name: "compton",
        e: [
          { t: F, a: [-1.1, 0.62], b: [-0.4, 0.14], arrow: 1 },
          { t: P, a: [-1.1, -0.62], b: [-0.4, 0.14] },
          { t: F, a: [-0.4, 0.14], b: [0.4, 0.14], arrow: 1 },
          { t: F, a: [0.4, 0.14], b: [1.1, 0.62], arrow: 1 },
          { t: P, a: [0.4, 0.14], b: [1.1, -0.62] }
        ],
        v: [[-0.4, 0.14], [0.4, 0.14]],
        l: [{ p: [-1.1, 0.62], t: "e⁻" }, { p: [-1.1, -0.62], t: "γ" },
            { p: [1.1, 0.62],  t: "e⁻" }, { p: [1.1, -0.62], t: "γ" }] },

      /* ---------- real radiation ---------- */
      /* radiative return: initial-state photon emission */
      { name: "isr",
        e: [
          { t: F, a: [-1.05, -0.7], b: [-0.5, -0.35], arrow: 1 },
          { t: F, a: [-0.5, -0.35], b: [-0.05, 0], arrow: 1 },
          { t: F, a: [-0.05, 0], b: [-1.05, 0.7], arrow: 1 },
          { t: P, a: [-0.5, -0.35], b: [-0.2, -1.0] },
          { t: P, a: [-0.05, 0], b: [0.5, 0] },
          { t: D, a: [0.5, 0], b: [1.05, -0.6] },
          { t: D, a: [0.5, 0], b: [1.05, 0.6] }
        ],
        v: [[-0.5, -0.35], [-0.05, 0], [0.5, 0]],
        l: [{ p: [-1.05, -0.7], t: "e⁻" }, { p: [-1.05, 0.7], t: "e⁺" },
            { p: [-0.2, -1.0], t: "γ" },
            { p: [1.05, -0.6], t: "π⁺" }, { p: [1.05, 0.6], t: "π⁻" }] },

      /* final-state radiation */
      { name: "fsr",
        e: [
          { t: F, a: [-1.05, -0.72], b: [-0.45, 0], arrow: 1 },
          { t: F, a: [-0.45, 0], b: [-1.05, 0.72], arrow: 1 },
          { t: P, a: [-0.45, 0], b: [0.1, 0] },
          { t: F, a: [0.1, 0], b: [0.55, -0.42], arrow: 1 },
          { t: F, a: [0.55, -0.42], b: [1.0, -0.92], arrow: 1 },
          { t: P, a: [0.55, -0.42], b: [1.18, -0.28] },
          { t: F, a: [1.0, 0.78], b: [0.1, 0], arrow: 1 }
        ],
        v: [[-0.45, 0], [0.1, 0], [0.55, -0.42]],
        l: [{ p: [-1.05, -0.72], t: "e⁻" }, { p: [-1.05, 0.72], t: "e⁺" },
            { p: [1.0, -0.92], t: "μ⁻" }, { p: [1.18, -0.28], t: "γ" },
            { p: [1.0, 0.78], t: "μ⁺" }] },

      /* radiative return meets GVMD: the pion form factor dresses the
         γ*ππ vertex, and the pion radiates the hard photon */
      { name: "gvmd",
        e: [
          { t: F, a: [-1.05, -0.72], b: [-0.45, 0], arrow: 1 },
          { t: F, a: [-0.45, 0], b: [-1.05, 0.72], arrow: 1 },
          { t: P, a: [-0.45, 0], b: [0.08, 0] },
          { t: D, a: [0.409, -0.153], b: [1.05, -0.75] },
          { t: D, a: [0.409, 0.153], b: [0.68, 0.42] },
          { t: D, a: [0.68, 0.42], b: [1.05, 0.85] },
          { t: P, a: [0.68, 0.42], b: [1.2, 0.2] }
        ],
        b: [{ c: [0.28, 0], r: 0.2 }],
        v: [[-0.45, 0], [0.68, 0.42]],
        l: [{ p: [-1.05, -0.72], t: "e⁻" }, { p: [-1.05, 0.72], t: "e⁺" },
            { p: [1.05, -0.75], t: "π⁻" }, { p: [1.05, 0.85], t: "π⁺" },
            { p: [1.2, 0.2], t: "γ" }, { p: [0.28, 0], t: "Fπ", c: 1 }] },

      /* ---------- one loop ---------- */
      /* the g−2 vertex correction */
      { name: "vertex",
        e: [
          { t: F, a: [-1.0, -0.9], b: [-0.12, -0.5], arrow: 1 },
          { t: F, a: [-0.12, -0.5], b: [0.6, 0], arrow: 1 },
          { t: F, a: [0.6, 0], b: [-0.12, 0.5], arrow: 1 },
          { t: F, a: [-0.12, 0.5], b: [-1.0, 0.9], arrow: 1 },
          { t: P, a: [-0.12, -0.5], b: [-0.12, 0.5] },
          { t: P, a: [0.6, 0], b: [1.15, 0] }
        ],
        v: [[-0.12, -0.5], [-0.12, 0.5], [0.6, 0]],
        l: [{ p: [-1.0, -0.9], t: "μ⁻" }, { p: [-1.0, 0.9], t: "μ⁻" },
            { p: [1.15, 0], t: "γ" }] },

      /* vacuum polarisation */
      { name: "bubble",
        e: [
          { t: P, a: [-1.05, 0], b: [-0.4, 0] },
          { t: F, a: [-0.4, 0], b: [0.4, 0], bend: -0.62, arrow: 1 },
          { t: F, a: [0.4, 0], b: [-0.4, 0], bend: -0.62, arrow: 1 },
          { t: P, a: [0.4, 0], b: [1.05, 0] }
        ],
        v: [[-0.4, 0], [0.4, 0]],
        l: [{ p: [-1.05, 0], t: "γ" }, { p: [1.05, 0], t: "γ" }] },

      /* quark self-energy */
      { name: "gluon",
        e: [
          { t: F, a: [-1.05, 0], b: [-0.45, 0], arrow: 1 },
          { t: G, a: [-0.45, 0], b: [0.45, 0], bend: -0.85 },
          { t: F, a: [-0.45, 0], b: [0.45, 0], arrow: 1 },
          { t: F, a: [0.45, 0], b: [1.05, 0], arrow: 1 }
        ],
        v: [[-0.45, 0], [0.45, 0]],
        l: [{ p: [-1.05, 0], t: "q" }, { p: [1.05, 0], t: "q" }] },

      /* one-loop box */
      { name: "box",
        e: [
          { t: F, a: [-1.05, -0.95], b: [-0.48, -0.48], arrow: 1 },
          { t: F, a: [-0.48, 0.48], b: [-1.05, 0.95], arrow: 1 },
          { t: F, a: [-0.48, -0.48], b: [-0.48, 0.48], arrow: 1 },
          { t: P, a: [-0.48, -0.48], b: [0.48, -0.48] },
          { t: P, a: [-0.48, 0.48], b: [0.48, 0.48] },
          { t: F, a: [0.48, 0.48], b: [0.48, -0.48], arrow: 1 },
          { t: F, a: [0.48, -0.48], b: [1.05, -0.95], arrow: 1 },
          { t: F, a: [1.05, 0.95], b: [0.48, 0.48], arrow: 1 }
        ],
        v: [[-0.48, -0.48], [-0.48, 0.48], [0.48, -0.48], [0.48, 0.48]],
        l: [{ p: [-1.05, -0.95], t: "e⁻" }, { p: [-1.05, 0.95], t: "e⁺" },
            { p: [1.05, -0.95], t: "μ⁻" }, { p: [1.05, 0.95], t: "μ⁺" }] },

      /* crossed box */
      { name: "crossbox",
        e: [
          { t: F, a: [-1.08, -0.95], b: [-0.5, -0.5], arrow: 1 },
          { t: F, a: [-0.5, -0.5], b: [-0.5, 0.5], arrow: 1 },
          { t: F, a: [-0.5, 0.5], b: [-1.08, 0.95], arrow: 1 },
          { t: P, a: [-0.5, -0.5], b: [0.5, 0.5] },
          { t: P, a: [-0.5, 0.5], b: [0.5, -0.5] },
          { t: F, a: [0.5, 0.5], b: [0.5, -0.5], arrow: 1 },
          { t: F, a: [0.5, -0.5], b: [1.08, -0.95], arrow: 1 },
          { t: F, a: [1.08, 0.95], b: [0.5, 0.5], arrow: 1 }
        ],
        v: [[-0.5, -0.5], [-0.5, 0.5], [0.5, -0.5], [0.5, 0.5]],
        l: [{ p: [-1.08, -0.95], t: "e⁻" }, { p: [-1.08, 0.95], t: "e⁺" },
            { p: [1.08, -0.95], t: "μ⁻" }, { p: [1.08, 0.95], t: "μ⁺" }] },

      /* triangle anomaly — π⁰ → γγ through a quark loop (three photons
         would cancel between loop orientations, by Furry's theorem) */
      { name: "triangle",
        e: [
          { t: F, a: [-0.56, 0], b: [0.3, 0.49], arrow: 1 },
          { t: F, a: [0.3, 0.49], b: [0.3, -0.49], arrow: 1 },
          { t: F, a: [0.3, -0.49], b: [-0.56, 0], arrow: 1 },
          { t: D, a: [-1.18, 0], b: [-0.56, 0] },
          { t: P, a: [0.3, 0.49], b: [0.62, 1.04] },
          { t: P, a: [0.3, -0.49], b: [0.62, -1.04] }
        ],
        v: [[-0.56, 0], [0.3, 0.49], [0.3, -0.49]],
        l: [{ p: [-1.18, 0], t: "π⁰" }, { p: [0.62, 1.04], t: "γ" },
            { p: [0.62, -1.04], t: "γ" }] },

      /* QCD penguin — the flavour-anomaly topology: b → s needs a W in
         the loop (the photon cannot change flavour), with the gluon
         radiated off the internal top */
      { name: "penguin",
        e: [
          { t: F, a: [-1.2, -0.62], b: [-0.5, -0.62], arrow: 1 },
          { t: F, a: [-0.5, -0.62], b: [0, -0.62], arrow: 1 },
          { t: F, a: [0, -0.62], b: [0.5, -0.62], arrow: 1 },
          { t: F, a: [0.5, -0.62], b: [1.2, -0.62], arrow: 1 },
          { t: P, a: [-0.5, -0.62], b: [0.5, -0.62], bend: -0.85 },
          { t: G, a: [0, -0.62], b: [0, 0.16] },
          { t: F, a: [0, 0.16], b: [0.88, 0.72], arrow: 1 },
          { t: F, a: [-0.88, 0.72], b: [0, 0.16], arrow: 1 }
        ],
        v: [[-0.5, -0.62], [0, -0.62], [0.5, -0.62], [0, 0.16]],
        l: [{ p: [-1.2, -0.62], t: "b" }, { p: [1.2, -0.62], t: "s" },
            { p: [0, -1.045], t: "W" },
            { p: [0.88, 0.72], t: "q" }, { p: [-0.88, 0.72], t: "q" }] },

      /* the one-loop pentagon of e⁺e⁻ → π⁺π⁻γ in scalar QED: two
         photons between the lepton and pion lines, the hard photon
         radiated from inside the loop */
      { name: "pentagon",
        e: [
          { t: F, a: [-1.05, -0.95], b: [-0.48, -0.48], arrow: 1 },
          { t: F, a: [-0.48, -0.48], b: [-0.48, 0.48], arrow: 1 },
          { t: F, a: [-0.48, 0.48], b: [-1.05, 0.95], arrow: 1 },
          { t: P, a: [-0.48, -0.48], b: [0.48, -0.48] },
          { t: P, a: [-0.48, 0.48], b: [0.48, 0.48] },
          { t: D, a: [0.48, -0.48], b: [0.48, 0] },
          { t: D, a: [0.48, 0], b: [0.48, 0.48] },
          { t: D, a: [0.48, -0.48], b: [1.05, -0.95] },
          { t: D, a: [0.48, 0.48], b: [1.05, 0.95] },
          { t: P, a: [0.48, 0], b: [1.12, 0] }
        ],
        v: [[-0.48, -0.48], [-0.48, 0.48], [0.48, -0.48], [0.48, 0], [0.48, 0.48]],
        l: [{ p: [-1.05, -0.95], t: "e⁻" }, { p: [-1.05, 0.95], t: "e⁺" },
            { p: [1.05, -0.95], t: "π⁻" }, { p: [1.05, 0.95], t: "π⁺" },
            { p: [1.12, 0], t: "γ" }] },

      /* ---------- contributions to g−2 ---------- */
      /* electroweak: the muon turns into a neutrino and a W, and the
         photon couples to the W */
      { name: "ew",
        e: [
          { t: F, a: [-1.0, -0.9], b: [-0.12, -0.5], arrow: 1 },
          { t: F, a: [-0.12, -0.5], b: [-0.12, 0.5], arrow: 1 },
          { t: F, a: [-0.12, 0.5], b: [-1.0, 0.9], arrow: 1 },
          { t: P, a: [-0.12, -0.5], b: [0.6, 0] },
          { t: P, a: [0.6, 0], b: [-0.12, 0.5] },
          { t: P, a: [0.6, 0], b: [1.15, 0] }
        ],
        v: [[-0.12, -0.5], [-0.12, 0.5], [0.6, 0]],
        l: [{ p: [-1.0, -0.9], t: "μ⁻" }, { p: [-1.0, 0.9], t: "μ⁻" },
            { p: [-0.12, 0], t: "ν" }, { p: [0.24, -0.25], t: "W" },
            { p: [1.15, 0], t: "γ" }] },

      /* hadronic vacuum polarisation */
      { name: "hvp",
        e: [
          { t: F, a: [-1.18, 0.62], b: [-0.56, 0.62], arrow: 1 },
          { t: F, a: [-0.56, 0.62], b: [0, 0.62], arrow: 1 },
          { t: F, a: [0, 0.62], b: [0.56, 0.62], arrow: 1 },
          { t: F, a: [0.56, 0.62], b: [1.18, 0.62], arrow: 1 },
          { t: P, a: [0, 0.62], b: [0, 1.22] },
          { t: P, a: [-0.56, 0.62], b: [-0.198, 0.018] },
          { t: P, a: [0.56, 0.62], b: [0.198, 0.018] }
        ],
        b: [{ c: [0, -0.18], r: 0.28 }],
        v: [[-0.56, 0.62], [0, 0.62], [0.56, 0.62]],
        l: [{ p: [-1.18, 0.62], t: "μ" }, { p: [1.18, 0.62], t: "μ" },
            { p: [0, 1.22], t: "γ" }, { p: [0, -0.18], t: "had", c: 1 }] },

      /* hadronic light-by-light */
      { name: "hlbl",
        e: [
          { t: F, a: [-1.22, 0.82], b: [-0.62, 0.82], arrow: 1 },
          { t: F, a: [-0.62, 0.82], b: [0, 0.82], arrow: 1 },
          { t: F, a: [0, 0.82], b: [0.62, 0.82], arrow: 1 },
          { t: F, a: [0.62, 0.82], b: [1.22, 0.82], arrow: 1 },
          { t: P, a: [-0.62, 0.82], b: [-0.26, -0.1] },
          { t: P, a: [0, 0.82], b: [0, 0.05] },
          { t: P, a: [0.62, 0.82], b: [0.26, -0.1] },
          { t: P, a: [0, -0.55], b: [0, -1.18] }
        ],
        b: [{ c: [0, -0.25], r: 0.3 }],
        v: [[-0.62, 0.82], [0, 0.82], [0.62, 0.82]],
        l: [{ p: [-1.22, 0.82], t: "μ" }, { p: [1.22, 0.82], t: "μ" },
            { p: [0, -1.18], t: "γ" }, { p: [0, -0.25], t: "had", c: 1 }] },

      /* ---------- two loops ---------- */
      /* two-loop vacuum polarisation: a photon rung across the fermion loop */
      { name: "vp2",
        e: [
          { t: P, a: [-1.12, 0], b: [-0.5, 0] },
          { t: F, a: [-0.5, 0], b: [0.5, 0], bend: -0.62, arrow: 1 },
          { t: F, a: [0.5, 0], b: [-0.5, 0], bend: -0.62, arrow: 1 },
          { t: P, a: [0.5, 0], b: [1.12, 0] },
          { t: P, a: [0, -0.31], b: [0, 0.31] }
        ],
        v: [[-0.5, 0], [0.5, 0], [0, -0.31], [0, 0.31]],
        l: [{ p: [-1.12, 0], t: "γ" }, { p: [1.12, 0], t: "γ" }] },

      /* sunrise: three propagators between two vertices — the Higgs
         self-energy through the quartic coupling */
      { name: "sunrise",
        e: [
          { t: D, a: [-1.12, 0], b: [-0.46, 0] },
          { t: D, a: [-0.46, 0], b: [0.46, 0], bend: -0.78 },
          { t: D, a: [-0.46, 0], b: [0.46, 0] },
          { t: D, a: [-0.46, 0], b: [0.46, 0], bend: 0.78 },
          { t: D, a: [0.46, 0], b: [1.12, 0] }
        ],
        v: [[-0.46, 0], [0.46, 0]],
        l: [{ p: [-1.12, 0], t: "H" }, { p: [1.12, 0], t: "H" }] },

      /* the NNLO double box of μe scattering — each fermion line keeps
         its flavour, so the photons are exchanged between e and μ */
      { name: "doublebox",
        e: [
          { t: F, a: [-1.15, -0.92], b: [-0.56, -0.5], arrow: 1 },
          { t: F, a: [-0.56, -0.5], b: [0, -0.5], arrow: 1 },
          { t: F, a: [0, -0.5], b: [0.56, -0.5], arrow: 1 },
          { t: F, a: [0.56, -0.5], b: [1.15, -0.92], arrow: 1 },
          { t: F, a: [-1.15, 0.92], b: [-0.56, 0.5], arrow: 1 },
          { t: F, a: [-0.56, 0.5], b: [0, 0.5], arrow: 1 },
          { t: F, a: [0, 0.5], b: [0.56, 0.5], arrow: 1 },
          { t: F, a: [0.56, 0.5], b: [1.15, 0.92], arrow: 1 },
          { t: P, a: [-0.56, -0.5], b: [-0.56, 0.5] },
          { t: P, a: [0, -0.5], b: [0, 0.5] },
          { t: P, a: [0.56, -0.5], b: [0.56, 0.5] }
        ],
        v: [[-0.56, -0.5], [0, -0.5], [0.56, -0.5],
            [-0.56, 0.5], [0, 0.5], [0.56, 0.5]],
        l: [{ p: [-1.15, -0.92], t: "e⁻" }, { p: [-1.15, 0.92], t: "μ⁻" },
            { p: [1.15, -0.92], t: "e⁻" }, { p: [1.15, 0.92], t: "μ⁻" }] },

      /* two-loop vertex correction */
      { name: "vertex2",
        e: [
          { t: F, a: [-1.02, -0.92], b: [-0.3, -0.62], arrow: 1 },
          { t: F, a: [-0.3, -0.62], b: [0.12, -0.42], arrow: 1 },
          { t: F, a: [0.12, -0.42], b: [0.62, 0], arrow: 1 },
          { t: F, a: [0.62, 0], b: [0.12, 0.42], arrow: 1 },
          { t: F, a: [0.12, 0.42], b: [-0.3, 0.62], arrow: 1 },
          { t: F, a: [-0.3, 0.62], b: [-1.02, 0.92], arrow: 1 },
          { t: P, a: [-0.3, -0.62], b: [-0.3, 0.62] },
          { t: P, a: [0.12, -0.42], b: [0.12, 0.42] },
          { t: P, a: [0.62, 0], b: [1.16, 0] }
        ],
        v: [[-0.3, -0.62], [0.12, -0.42], [0.62, 0], [0.12, 0.42], [-0.3, 0.62]],
        l: [{ p: [-1.02, -0.92], t: "μ⁻" }, { p: [-1.02, 0.92], t: "μ⁻" },
            { p: [1.16, 0], t: "γ" }] },

      /* two-loop pentabox for tt̄ + jet: a top line wraps the box, and
         the jet leaves the pentagon through a triple-gluon vertex */
      { name: "pentabox",
        e: [
          { t: G, a: [-1.15, -0.92], b: [-0.56, -0.5] },
          { t: G, a: [-1.15, 0.92], b: [-0.56, 0.5] },
          { t: F, a: [1.15, 0.92], b: [0.56, 0.5], arrow: 1 },
          { t: F, a: [0.56, 0.5], b: [0, 0.5], arrow: 1 },
          { t: F, a: [0, 0.5], b: [-0.56, 0.5], arrow: 1 },
          { t: F, a: [-0.56, 0.5], b: [-0.56, -0.5], arrow: 1 },
          { t: F, a: [-0.56, -0.5], b: [0, -0.5], arrow: 1 },
          { t: F, a: [0, -0.5], b: [0.56, -0.5], arrow: 1 },
          { t: F, a: [0.56, -0.5], b: [1.15, -0.92], arrow: 1 },
          { t: G, a: [0, -0.5], b: [0, 0.5] },
          { t: G, a: [0.56, -0.5], b: [0.56, 0] },
          { t: G, a: [0.56, 0], b: [0.56, 0.5] },
          { t: G, a: [0.56, 0], b: [1.2, 0] }
        ],
        v: [[-0.56, -0.5], [0, -0.5], [0.56, -0.5],
            [-0.56, 0.5], [0, 0.5], [0.56, 0.5], [0.56, 0]],
        l: [{ p: [-1.15, -0.92], t: "g" }, { p: [-1.15, 0.92], t: "g" },
            { p: [1.15, -0.92], t: "t" }, { p: [1.15, 0.92], t: "t̄" },
            { p: [1.2, 0], t: "g" }] }
    ];

    /* ---- geometry ---- */
    function sample(a, b, bend, n) {
      var dx = b[0] - a[0], dy = b[1] - a[1];
      var len = Math.hypot(dx, dy) || 1;
      var px = -dy / len, py = dx / len;
      var cx = (a[0] + b[0]) / 2 + px * (bend || 0) * len;
      var cy = (a[1] + b[1]) / 2 + py * (bend || 0) * len;
      var pts = [];
      for (var i = 0; i <= n; i++) {
        var t = i / n, m = 1 - t;
        pts.push([
          m * m * a[0] + 2 * m * t * cx + t * t * b[0],
          m * m * a[1] + 2 * m * t * cy + t * t * b[1]
        ]);
      }
      return pts;
    }

    function decorate(pts, type, amp, cycles) {
      if (type === F || type === D) return pts;
      var n = pts.length - 1, out = [];
      for (var i = 0; i <= n; i++) {
        var t = i / n;
        var p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(n, i + 1)];
        var tx = p1[0] - p0[0], ty = p1[1] - p0[1];
        var l = Math.hypot(tx, ty) || 1;
        tx /= l; ty /= l;
        var nx = -ty, ny = tx;
        var taper = Math.sin(Math.PI * t);        /* pin the ends to the vertices */
        var th = t * cycles * Math.PI * 2;
        var ox, oy;
        if (type === P) {
          ox = nx * Math.sin(th) * amp * taper;
          oy = ny * Math.sin(th) * amp * taper;
        } else {                                   /* gluon coil */
          ox = (nx * Math.sin(th) + tx * (1 - Math.cos(th)) * 0.6) * amp * taper;
          oy = (ny * Math.sin(th) + ty * (1 - Math.cos(th)) * 0.6) * amp * taper;
        }
        out.push([pts[i][0] + ox, pts[i][1] + oy]);
      }
      return out;
    }

    /* ---- causal ordering -------------------------------------
       Breadth-first from the incoming external legs. Each edge
       inherits the depth of whichever endpoint the front reached
       first, and draws away from it — so the diagram unfolds the
       way the interaction does, rather than in array order.
       --------------------------------------------------------- */
    function key(p) { return p[0].toFixed(3) + "|" + p[1].toFixed(3); }

    function sequence(topo) {
      if (topo._seq) return topo._seq;

      var deg = {}, pos = {};
      topo.e.forEach(function (ed) {
        [ed.a, ed.b].forEach(function (p) {
          var k = key(p);
          deg[k] = (deg[k] || 0) + 1;
          pos[k] = p;
        });
      });

      var ends = Object.keys(deg).filter(function (k) { return deg[k] === 1; });
      var starts = ends.filter(function (k) { return pos[k][0] < 0; });
      if (!starts.length) starts = ends;
      if (!starts.length) starts = [Object.keys(deg)[0]];

      var depth = {}, order = new Array(topo.e.length);
      var taken = [];
      starts.forEach(function (k) { depth[k] = 0; });

      var frontier = starts.slice(), d = 0;
      while (frontier.length) {
        var next = [];
        frontier.forEach(function (k) {
          topo.e.forEach(function (ed, i) {
            if (taken[i]) return;
            var ka = key(ed.a), kb = key(ed.b);
            if (ka !== k && kb !== k) return;
            taken[i] = true;
            order[i] = { d: d, rev: kb === k };
            var other = ka === k ? kb : ka;
            if (!(other in depth)) { depth[other] = d + 1; next.push(other); }
          });
        });
        frontier = next; d++;
      }
      topo.e.forEach(function (ed, i) { if (!order[i]) order[i] = { d: d, rev: false }; });

      /* vertices and labels inherit the depth at which they light up;
         anything the front never reaches waits until the end */
      var vd = topo.v.map(function (p) {
        var k = key(p);
        return { p: p, d: depth[k] === undefined ? d : depth[k] };
      });

      /* a blob appears once the propagators that touch it have landed */
      var bd = (topo.b || []).map(function (bl) {
        var m = 0, touched = false;
        topo.e.forEach(function (ed, i) {
          [ed.a, ed.b].forEach(function (pp) {
            var reach = Math.hypot(pp[0] - bl.c[0], pp[1] - bl.c[1]);
            if (Math.abs(reach - bl.r) < 0.07) { touched = true; m = Math.max(m, order[i].d); }
          });
        });
        return { c: bl.c, r: bl.r, d: touched ? m : d };
      });
      var ld = (topo.l || []).map(function (o) {
        return { p: o.p, t: o.t, c: o.c,
                 d: (depth[key(o.p)] === undefined ? d : depth[key(o.p)]) };
      });

      topo._seq = { order: order, v: vd, b: bd, l: ld, max: d,
                    origin: pos[starts[0]] };
      return topo._seq;
    }

    /* exact bounding radius, cached per topology */
    function boundsOf(topo) {
      if (topo._r) return topo._r;
      var m = 0;
      topo.e.forEach(function (ed) {
        var pts = decorate(sample(ed.a, ed.b, ed.bend, 40), ed.t, ed.t === G ? 0.075 : 0.055, 8);
        pts.forEach(function (p) { m = Math.max(m, Math.hypot(p[0], p[1])); });
      });
      (topo.b || []).forEach(function (bl) { m = Math.max(m, Math.hypot(bl.c[0], bl.c[1]) + bl.r); });
      (topo.l || []).forEach(function (o) {
        m = Math.max(m, Math.hypot(o.p[0], o.p[1]) + (o.c ? 0 : 0.16));
      });
      topo._r = m;
      return m;
    }

    /* ---- canvas sizing + the regions diagrams must keep out of ---- */
    var keepOut = [];
    var diagrams = [];

    function clearOfRect(cx, cy, r, box) {
      var nx = Math.max(box.x0, Math.min(cx, box.x1));
      var ny = Math.max(box.y0, Math.min(cy, box.y1));
      return Math.hypot(cx - nx, cy - ny) > r;
    }

    /* The headline elements are block-level and therefore full-width, so their
       layout boxes would fence off the entire hero. Walk down to the text
       nodes and measure their glyph runs instead — that is what a diagram
       actually has to keep clear of. Icons are added explicitly since they
       carry no text of their own. */
    function inkedBox(el) {
      var l = Infinity, t = Infinity, r = -Infinity, b = -Infinity, n = 0;

      function eat(c) {
        if (!c || c.width < 1 || c.height < 1) return;
        l = Math.min(l, c.left); t = Math.min(t, c.top);
        r = Math.max(r, c.right); b = Math.max(b, c.bottom);
        n++;
      }

      try {
        var rng = document.createRange();
        var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        var node;
        while ((node = walker.nextNode())) {
          if (!node.nodeValue || !node.nodeValue.trim()) continue;
          rng.selectNodeContents(node);
          var list = rng.getClientRects();
          for (var i = 0; i < list.length; i++) eat(list[i]);
        }
        Array.prototype.forEach.call(el.querySelectorAll("svg, img"), function (g) {
          eat(g.getBoundingClientRect());
        });
      } catch (e) {}

      if (!n) {
        var g0 = el.getBoundingClientRect();
        return [g0.left, g0.top, g0.right, g0.bottom];
      }
      return [l, t, r, b];
    }

    function measureKeepOut() {
      keepOut = [];
      var cr = canvas.getBoundingClientRect();
      var pad = 18;

      function push(l, t, r, b) {
        if (!(r > l) || !(b > t)) return;
        keepOut.push({ x0: l - cr.left - pad, y0: t - cr.top - pad,
                       x1: r - cr.left + pad, y1: b - cr.top + pad });
      }

      [".hero-kick", ".hero h1", ".hero-lede", ".hero-cta", ".hero-now .nlabel",
       ".scroll-cue", ".hero-legend"]
        .forEach(function (sel) {
          var el = $(sel);
          if (!el) return;
          var k = inkedBox(el);
          push(k[0], k[1], k[2], k[3]);
        });

      /* the rotating word is absolutely positioned inside a flex-grown box,
         so reserve only as much width as its longest state needs */
      var rotEl = $("#rot");
      if (rotEl) {
        var rr = rotEl.getBoundingClientRect(), w = 0;
        $$("span", rotEl).forEach(function (sp) { w = Math.max(w, sp.scrollWidth); });
        push(rr.left, rr.top, rr.left + (w || 220), rr.bottom);
      }
      evictConflicts();
    }

    /* A reflow can move the text under a diagram that was legally placed
       against the old metrics. Retire those rather than let them sit on
       top of the headline. */
    function evictConflicts() {
      if (!diagrams || !diagrams.length) return;
      var now = performance.now();
      diagrams = diagrams.filter(function (d) {
        var age = now - d.born;
        var cx = d.x + d.vx * age, cy = d.y + d.vy * age;
        for (var k = 0; k < keepOut.length; k++) {
          if (!clearOfRect(cx, cy, d.reserve, keepOut[k])) return false;
        }
        return true;
      });
    }

    function resize() {
      var r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      narrow = window.innerWidth < 780;
      glow = !narrow;
      measureKeepOut();
    }
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("load", measureKeepOut);

    /* Instrument Serif changes the headline's size substantially, so hold
       off placing anything until the metrics are final. */
    var metricsReady = false;
    function markReady() { measureKeepOut(); metricsReady = true; }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(markReady);
      setTimeout(markReady, 2500);               /* fallback if it never settles */
    } else {
      setTimeout(markReady, 300);
    }

    /* ---- placement ---- */
    /* Click bursts are held in document coordinates. Express them in
       hero-canvas space so the ambient placer can avoid them as well. */
    function clickObstacles() {
      if (!clicks || !clicks.length || !canvas) return NONE;
      var hr = canvas.getBoundingClientRect();
      var ox = hr.left + window.scrollX, oy = hr.top + window.scrollY;
      return clicks.map(function (c) {
        return { x: c.dx - ox, y: c.dy - oy, r: c.rGeo };
      });
    }
    var NONE = [];

    function tryPlace(r) {
      var bleed = r * 0.22;                      /* touching an edge reads as intentional */
      var lo = r - bleed, span = Math.max(1, W - 2 * lo), vspan = Math.max(1, H - 2 * lo);
      var obs = clickObstacles();
      for (var i = 0; i < 120; i++) {
        var cx = lo + Math.random() * span;
        var cy = lo + Math.random() * vspan;
        var ok = true;
        for (var k = 0; k < keepOut.length && ok; k++) ok = clearOfRect(cx, cy, r, keepOut[k]);
        for (var j = 0; j < diagrams.length && ok; j++) {
          ok = Math.hypot(cx - diagrams[j].x, cy - diagrams[j].y) > r + diagrams[j].reserve;
        }
        for (var m = 0; m < obs.length && ok; m++) {
          ok = Math.hypot(cx - obs[m].x, cy - obs[m].y) > r + obs[m].r;
        }
        if (ok) return { x: cx, y: cy, reserve: r };
      }
      return null;
    }

    /* Try the intended size, then progressively smaller, so a crowded hero
       still gets a diagram rather than none at all. */
    function place(topo, s, reserveExtra) {
      var unit = boundsOf(topo);
      for (var k = 0; k < 4; k++) {
        var scale = [1, 0.8, 0.62, 0.45][k];
        var spot = tryPlace(unit * s * scale + reserveExtra);
        if (spot) { spot.s = s * scale; return spot; }
      }
      return null;
    }

    function buildEdges(topo, seq) {
      return topo.e.map(function (ed, i) {
        /* a wave needs points to be a wave; a straight line needs two */
        var chord = Math.hypot(ed.b[0] - ed.a[0], ed.b[1] - ed.a[1]);
        var len = chord * (1 + 1.25 * Math.abs(ed.bend || 0));
        var wave = ed.t === P || ed.t === G;
        var n = wave ? Math.max(36, Math.min(84, Math.round(len * 48)))
                     : (ed.bend ? 28 : 10);
        var raw = sample(ed.a, ed.b, ed.bend, n);
        var pts = decorate(raw, ed.t, ed.t === G ? 0.075 : 0.055, Math.max(3, Math.round(len * 5.5)));
        return {
          type: ed.t, arrow: ed.arrow, raw: raw,
          pts: seq.order[i].rev ? pts.slice().reverse() : pts,
          depth: seq.order[i].d
        };
      });
    }

    function spawn(now, still) {
      /* avoid showing the same topology twice at once */
      var live = {};
      diagrams.forEach(function (d) { live[d.name] = 1; });
      var pool = TOPOS.filter(function (t) { return !live[t.name]; });
      if (!pool.length) pool = TOPOS;
      var topo = pool[(Math.random() * pool.length) | 0];
      var seq = sequence(topo);

      var span = Math.min(W, H);
      var s = span * (narrow ? 0.09 : 0.13) + Math.random() * span * (narrow ? 0.045 : 0.085);

      /* barely-there drift: enough to feel alive, small enough that the
         clearance reserve stays affordable */
      var vx = (Math.random() - 0.5) * 0.0011;
      var vy = -0.0006 - Math.random() * 0.0011;
      var hold = 4800 + Math.random() * 9500;
      var drawTotal = seq.max * STEP + EDGE;
      var life = drawTotal + SETTLE + hold + FADE;
      var driftLen = Math.hypot(vx, vy) * life;

      var spot = place(topo, s, driftLen + 14);
      if (!spot) return null;                    /* no room — try again next tick */
      s = spot.s;

      var edges = buildEdges(topo, seq);

      return {
        name: topo.name,
        edges: edges, v: seq.v, blobs: seq.b, labels: seq.l,
        x: spot.x, y: spot.y, reserve: spot.reserve,
        rGeo: boundsOf(topo) * s,               /* what is actually drawn */
        s: s, rot: (Math.random() - 0.5) * 0.42,
        spin: (Math.random() - 0.5) * 0.000009,
        vx: vx, vy: vy, field: true,
        born: still ? now - (drawTotal + SETTLE + 1200) : now,
        drawTotal: drawTotal, life: still ? Infinity : life,
        hue: pickHue(diagrams.map(function (x) { return x.hue; }))
      };
    }

    /* ---- detector hits ---- */
    var hits = [];
    (function seedHits() {
      var n = narrow ? 24 : 50;
      for (var i = 0; i < n; i++) {
        hits.push({ x: Math.random(), y: Math.random(), r: 0.5 + Math.random() * 1.3,
                    ph: Math.random() * Math.PI * 2, sp: 0.15 + Math.random() * 0.5 });
      }
    })();

    /* ---- pointer parallax ---- */
    var mx = 0, my = 0, px = 0, py = 0;
    if (fine) {
      window.addEventListener("mousemove", function (e) {
        mx = (e.clientX / window.innerWidth - 0.5) * 2;
        my = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
    }

    /* the canvas the drawing primitives currently paint into */
    var TG = ctx;

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    /* point at fraction u along a polyline, interpolated between samples,
       so a coarsely sampled line still ends exactly where it should */
    function ptAt(pts, u) {
      var n = pts.length - 1;
      var f = Math.max(0, Math.min(n, u * n));
      var i = Math.min(n - 1, Math.floor(f)), t = f - i;
      var a = pts[i], b = pts[i + 1];
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }

    function strokeRange(pts, from, to, width, colour, alpha, dash) {
      var n = pts.length - 1;
      var f0 = Math.max(0, Math.min(1, from)) * n;
      var f1 = Math.max(0, Math.min(1, to)) * n;
      if (f1 - f0 < 0.0005) return;
      var start = ptAt(pts, from), end = ptAt(pts, to);
      TG.beginPath();
      TG.moveTo(start[0], start[1]);
      for (var i = Math.floor(f0) + 1; i <= Math.floor(f1); i++) TG.lineTo(pts[i][0], pts[i][1]);
      TG.lineTo(end[0], end[1]);
      TG.globalAlpha = alpha;
      TG.strokeStyle = colour;
      TG.lineWidth = width;
      if (dash) TG.setLineDash(dash);
      TG.stroke();
      if (dash) TG.setLineDash(EMPTY);
    }
    var EMPTY = [];

    function arrowAt(pts, colour, alpha, size) {
      var i = Math.floor(pts.length * 0.52);
      var p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)];
      TG.save();
      TG.translate(p[0], p[1]);
      TG.rotate(Math.atan2(q[1] - p[1], q[0] - p[0]));
      TG.globalAlpha = alpha;
      TG.fillStyle = colour;
      TG.beginPath();
      TG.moveTo(size, 0);
      TG.lineTo(-size * 0.75, size * 0.62);
      TG.lineTo(-size * 0.75, -size * 0.62);
      TG.closePath();
      TG.fill();
      TG.restore();
    }

    var sparks = [];   /* pulse heads, drawn together so the glow is set once */

    function drawDiagram(d, now) {
      var age = now - d.born;
      if (age > d.life) return false;

      var hue = hueOf(d);
      var fade = d.life === Infinity ? 1 : Math.min(1, Math.max(0, (d.life - age) / FADE));
      var base = 0.52 * fade * (d.gain || 1);

      if (fine && d.field) {
        var prox = Math.max(0, 1 - Math.hypot(d.x - (mx * 0.5 + 0.5) * W,
                                              d.y - (my * 0.5 + 0.5) * H) / (Math.min(W, H) * 0.6));
        base *= 1 + prox * 1.05;
      }

      var ox = d.x + d.vx * age + (d.field ? px * 16 : 0);
      var oy = d.y + d.vy * age + (d.field ? py * 12 : 0);
      var rot = d.rot + d.spin * age;
      var settled = age - (d.drawTotal + SETTLE);

      TG.save();
      TG.translate(ox, oy);
      TG.rotate(rot);
      TG.scale(d.s, d.s);
      TG.lineCap = "round";
      TG.lineJoin = "round";

      d.edges.forEach(function (ed) {
        var t = (age - ed.depth * STEP) / EDGE;
        if (t <= 0) return;
        t = easeOut(Math.min(1, t));

        var w = (ed.type === F ? 1.5 : 1.25) / d.s;
        var dash = ed.type === D ? [0.085, 0.06] : null;
        strokeRange(ed.pts, 0, t, w, hue, base * (ed.type === F ? 1 : 0.88), dash);

        /* the drawing head glows while the line is still growing */
        if (t < 1) {
          var hp = ptAt(ed.pts, t);
          sparks.push([ox + (hp[0] * Math.cos(rot) - hp[1] * Math.sin(rot)) * d.s,
                       oy + (hp[0] * Math.sin(rot) + hp[1] * Math.cos(rot)) * d.s,
                       2.6, hue, base * 2.1]);
        }

        if (ed.arrow && t > 0.6) {
          arrowAt(ed.raw, hue, base * Math.min(1, (t - 0.6) / 0.2), 0.075);
        }

        /* particles running the propagator, cascading outward */
        if (settled > 0) {
          var pt = settled - ed.depth * STEP * 0.75;
          if (pt > 0) {
            var u = (pt % PERIOD) / TRAVEL;
            if (u <= 1) {
              var e = easeOut(u);
              strokeRange(ed.pts, Math.max(0, e - 0.18), e, w * 1.5, hue, base * 1.5 * (1 - u * 0.25), dash);
              var hp2 = ptAt(ed.pts, e);
              sparks.push([ox + (hp2[0] * Math.cos(rot) - hp2[1] * Math.sin(rot)) * d.s,
                           oy + (hp2[0] * Math.sin(rot) + hp2[1] * Math.cos(rot)) * d.s,
                           2.4, hue, base * 2.4 * (1 - u * 0.4)]);
            }
          }
        }
      });

      /* the spark the diagram grows out of, under the pointer */
      if (d.anchor && age < 700) {
        var ig = age / 700;
        TG.globalAlpha = base * (1 - ig) * 1.6;
        TG.strokeStyle = hue;
        TG.lineWidth = 1.5 / d.s;
        TG.beginPath();
        TG.arc(d.anchor[0], d.anchor[1], 0.02 + ig * 0.34, 0, Math.PI * 2);
        TG.stroke();
      }

      /* hadronic blobs — hatched, the conventional shorthand for
         "everything the strong interaction does in here" */
      (d.blobs || []).forEach(function (bl) {
        var on = age - bl.d * STEP;
        if (on <= 0) return;
        var t = Math.min(1, on / 560);
        var beat = 0;
        if (settled > 0) {
          var bp = (settled - bl.d * STEP * 0.75) % PERIOD;
          if (bp > 0 && bp < FLASH) beat = 1 - bp / FLASH;
        }
        var r = bl.r * (0.55 + 0.45 * easeOut(t)) * (1 + beat * 0.05);

        TG.globalAlpha = base * 0.26 * t * (1 + beat);
        TG.fillStyle = hue;
        TG.beginPath();
        TG.arc(bl.c[0], bl.c[1], r, 0, Math.PI * 2);
        TG.fill();

        var th = -0.72;
        var nx = -Math.sin(th), ny = Math.cos(th);
        var ux = Math.cos(th), uy = Math.sin(th);
        TG.globalAlpha = base * 0.42 * t;
        TG.strokeStyle = hue;
        TG.lineWidth = 0.9 / d.s;
        for (var i = -3; i <= 3; i++) {
          var off = i * r * 0.28;
          var half = Math.sqrt(Math.max(0, r * r - off * off));
          TG.beginPath();
          TG.moveTo(bl.c[0] + off * nx - half * ux, bl.c[1] + off * ny - half * uy);
          TG.lineTo(bl.c[0] + off * nx + half * ux, bl.c[1] + off * ny + half * uy);
          TG.stroke();
        }

        TG.globalAlpha = base * t * (0.85 + beat * 0.5);
        TG.lineWidth = 1.5 / d.s;
        TG.beginPath();
        TG.arc(bl.c[0], bl.c[1], r, 0, Math.PI * 2);
        TG.stroke();
      });

      /* vertices: a ring when they ignite, a beat when a pulse arrives */
      TG.fillStyle = hue;
      TG.strokeStyle = hue;
      d.v.forEach(function (vt) {
        var on = age - vt.d * STEP;
        if (on <= 0) return;

        var beat = 0;
        if (settled > 0) {
          var bp = (settled - vt.d * STEP * 0.75) % PERIOD;
          if (bp > 0 && bp < FLASH) beat = 1 - bp / FLASH;
        }

        TG.globalAlpha = base * Math.min(1, on / 320) * (0.9 + beat * 0.8);
        TG.beginPath();
        TG.arc(vt.p[0], vt.p[1], (0.042 + beat * 0.016), 0, Math.PI * 2);
        TG.fill();

        var ring = Math.min(on, FLASH) / FLASH;
        if (ring < 1) {
          TG.globalAlpha = base * (1 - ring) * 1.5;
          TG.lineWidth = 1.2 / d.s;
          TG.beginPath();
          TG.arc(vt.p[0], vt.p[1], 0.045 + ring * 0.2, 0, Math.PI * 2);
          TG.stroke();
        }
      });

      TG.restore();
      TG.globalAlpha = 1;

      /* leg labels, drawn unscaled so the type stays crisp */
      if (d.labels.length) {
        var c = Math.cos(rot), sn = Math.sin(rot);
        var fs = Math.max(9, Math.min(13, d.s * 0.15));
        TG.font = "500 " + fs.toFixed(1) + "px 'JetBrains Mono', ui-monospace, monospace";
        TG.textBaseline = "middle";
        TG.fillStyle = hue;
        d.labels.forEach(function (lb) {
          var on = age - (lb.d * STEP + EDGE);
          if (on <= 0) return;
          TG.globalAlpha = base * 0.95 * Math.min(1, on / 380);

          if (lb.c) {                                  /* centred inside a blob */
            var lx = ox + (lb.p[0] * c - lb.p[1] * sn) * d.s;
            var ly = oy + (lb.p[0] * sn + lb.p[1] * c) * d.s;
            TG.font = "500 " + (fs * 0.84).toFixed(1) + "px 'JetBrains Mono', ui-monospace, monospace";
            TG.textAlign = "center";
            TG.lineWidth = 3.5;                        /* knock the hatching out */
            TG.strokeStyle = bg;
            TG.lineJoin = "round";
            TG.strokeText(lb.t, lx, ly);
            TG.fillText(lb.t, lx, ly);
            TG.font = "500 " + fs.toFixed(1) + "px 'JetBrains Mono', ui-monospace, monospace";
            TG.textAlign = "left";
            return;
          }

          var len = Math.hypot(lb.p[0], lb.p[1]) || 1;
          var q = [lb.p[0] + lb.p[0] / len * 0.17, lb.p[1] + lb.p[1] / len * 0.17];
          TG.textAlign = q[0] * c - q[1] * sn < 0 ? "right" : "left";
          TG.fillText(lb.t, ox + (q[0] * c - q[1] * sn) * d.s,
                             oy + (q[0] * sn + q[1] * c) * d.s);
        });
        TG.globalAlpha = 1;
      }

      return true;
    }

    function drawHits(now) {
      ctx.fillStyle = ink;
      hits.forEach(function (h) {
        var tw = 0.12 + 0.1 * (0.5 + 0.5 * Math.sin(now * 0.0012 * h.sp + h.ph));
        var y = (h.y - now * 0.0000075 * h.sp) % 1;
        if (y < 0) y += 1;
        ctx.globalAlpha = tw;
        ctx.beginPath();
        ctx.arc(h.x * W + px * 26, y * H + py * 20, h.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    var GLOW_BUDGET = 26;

    function flushSparks() {
      if (!sparks.length) return;
      sparks.sort(function (a, b) { return a[3] < b[3] ? -1 : a[3] > b[3] ? 1 : 0; });

      var lit = glow ? Math.min(sparks.length, GLOW_BUDGET) : 0;
      var colour = null;
      if (lit) TG.shadowBlur = 11;

      for (var i = 0; i < sparks.length; i++) {
        var s = sparks[i];
        if (i === lit) { TG.shadowBlur = 0; colour = null; }
        if (s[3] !== colour) {
          colour = s[3];
          TG.fillStyle = colour;
          if (i < lit) TG.shadowColor = colour;
        }
        TG.globalAlpha = Math.min(1, s[4]);
        TG.beginPath();
        TG.arc(s[0], s[1], s[2], 0, Math.PI * 2);
        TG.fill();
      }

      TG.shadowBlur = 0;
      TG.globalAlpha = 1;
      sparks.length = 0;
    }

    /* =======================================================
       CLICK LAYER — a diagram blooms where you press

       Drawn on a fixed, viewport-sized canvas that sits behind the
       page content, with positions held in document coordinates so a
       burst stays where it was made while you scroll past it.
       ======================================================= */
    var cvs2 = $("#fxClick");
    var ctx2 = cvs2 ? cvs2.getContext("2d") : null;
    var clicks = [], cW = 0, cH = 0, lastClick = 0, lastTopo = "";

    function resize2() {
      if (!ctx2) return;
      cW = window.innerWidth;
      cH = window.innerHeight;
      cvs2.width = Math.round(cW * dpr);
      cvs2.height = Math.round(cH * dpr);
      ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize2();
    window.addEventListener("resize", resize2);

    function burst(docX, docY, now) {
      var pool = TOPOS.filter(function (t) { return t.name !== lastTopo; });
      var topo = pool[(Math.random() * pool.length) | 0];
      lastTopo = topo.name;

      var seq = sequence(topo);
      var span = Math.min(window.innerWidth, window.innerHeight);
      var s = span * (narrow ? 0.072 : 0.082) * (0.85 + Math.random() * 0.3);
      var drawTotal = seq.max * STEP + EDGE;
      var o = seq.origin || [0, 0];

      /* Turn the diagram so it unfurls into open space: the local origin
         sits at the middle, so heading from the anchor towards it is the
         direction the body will grow. Aim that at the viewport centre. */
      var vx = docX - window.scrollX, vy = docY - window.scrollY;
      var away = Math.hypot(cW / 2 - vx, cH / 2 - vy);
      var target = away > 40 ? Math.atan2(cH / 2 - vy, cW / 2 - vx)
                             : Math.random() * Math.PI * 2;
      var rot = target - Math.atan2(-o[1], -o[0]) + (Math.random() - 0.5) * 0.7;

      /* place the transform origin so the anchor lands under the pointer */
      var c = Math.cos(rot), sn = Math.sin(rot);
      var ox = docX - (o[0] * c - o[1] * sn) * s;
      var oy = docY - (o[0] * sn + o[1] * c) * s;

      return {
        name: topo.name,
        edges: buildEdges(topo, seq), v: seq.v, blobs: seq.b, labels: seq.l,
        dx: ox, dy: oy, x: 0, y: 0,
        anchor: o,                              /* where the first stroke starts */
        rGeo: boundsOf(topo) * s,
        s: s, rot: rot,
        spin: (Math.random() - 0.5) * 0.000014,
        vx: 0, vy: 0, field: false, gain: 1.45,
        born: now, drawTotal: drawTotal,
        life: drawTotal + SETTLE + 1600 + FADE,
        hue: pickHue(clicks.map(function (x) { return x.hue; }))
      };
    }

    /* A burst lands exactly where the pointer did, so instead of refusing
       the position it clears whatever occupied it — previous bursts and,
       inside the hero, ambient diagrams too. Nothing ever overlaps. */
    function clearSpace(vx0, vy0, r) {
      var sx = window.scrollX, sy = window.scrollY;
      clicks = clicks.filter(function (c) {
        return Math.hypot(c.dx - sx - vx0, c.dy - sy - vy0) > r + c.rGeo + 16;
      });
      if (!canvas) return;
      var hr = canvas.getBoundingClientRect();
      var t = performance.now();
      diagrams = diagrams.filter(function (d) {
        var age = t - d.born;
        return Math.hypot(hr.left + d.x + d.vx * age - vx0,
                          hr.top + d.y + d.vy * age - vy0) > r + d.rGeo + 16;
      });
    }

    var painted = [];

    function drawClicks(now) {
      if (!ctx2) return;
      for (var q = 0; q < painted.length; q++) {
        ctx2.clearRect(painted[q][0], painted[q][1], painted[q][2], painted[q][3]);
      }
      painted.length = 0;
      if (!clicks.length) return;
      var sx = window.scrollX, sy = window.scrollY;
      TG = ctx2;
      clicks = clicks.filter(function (c) {
        c.x = c.dx - sx;
        c.y = c.dy - sy;
        var m = c.rGeo * 1.5;
        if (c.x < -m || c.x > cW + m || c.y < -m || c.y > cH + m) {
          return now - c.born < c.life;        /* scrolled away, still alive */
        }
        var pad = c.rGeo + 44;                 /* labels and glow spill outward */
        painted.push([c.x - pad, c.y - pad, pad * 2, pad * 2]);
        return drawDiagram(c, now);
      });
      flushSparks();
      TG = ctx;
    }

    var SKIP = "button, [role=\'button\'], input, textarea, select, " +
               ".btn, .social a, .topbar, .mmenu, .rail";

    if (ctx2 && !reduced) {
      document.addEventListener("click", function (e) {
        if (e.target.closest && e.target.closest(SKIP)) return;
        var sel = window.getSelection();
        if (sel && String(sel).length) return;          /* they were selecting text */
        var now = performance.now();
        if (now - lastClick < 110) return;
        lastClick = now;

        var d = burst(e.clientX + window.scrollX, e.clientY + window.scrollY, now);
        clearSpace(d.dx - window.scrollX, d.dy - window.scrollY, d.rGeo);
        clicks.push(d);
        if (clicks.length > 4) clicks.shift();
      });
    }

    var lastSpawn = 0;
    var maxCap = narrow ? 2 : 3;
    var maxD = maxCap;

    /* One-shot quality check. Sample real frame times once the field is
       running and scale it back on devices that cannot keep up, rather
       than animating badly. Decided once, so it never oscillates. */
    var qFrames = 0, qStart = 0, tuned = false;
    function tune(now) {
      if (tuned) return;
      if (!qStart) {
        /* wait for a full field so the sample reflects steady state, not
           the page still settling */
        if (metricsReady && diagrams.length >= maxCap) qStart = now + 1200;
        return;
      }
      if (now < qStart) return;
      qFrames++;
      var elapsed = now - qStart;
      if (elapsed < 2500) return;
      var fps = qFrames / (elapsed / 1000);
      if (fps < 22) { maxCap = 1; glow = false; hits.length = Math.min(hits.length, 12); }
      else if (fps < 38) { maxCap = 2; glow = false; }
      tuned = true;
    }

    /* no point animating the hero field once it has scrolled away */
    var heroOnScreen = true;
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        heroOnScreen = es[0].isIntersecting;
      }, { rootMargin: "150px" }).observe(canvas);
    }

    function frame(now) {
      if (heroOnScreen) {
        ctx.clearRect(0, 0, W, H);
        px += (mx - px) * 0.045;
        py += (my - py) * 0.045;

        drawHits(now);
        diagrams = diagrams.filter(function (d) { return drawDiagram(d, now); });
        flushSparks();

        tune(now);
        maxD = maxCap;
        if (metricsReady && diagrams.length < maxD && now - lastSpawn > 650) {
          var d = spawn(now);
          if (d) { diagrams.push(d); lastSpawn = now; }
          else lastSpawn = now - 250;          /* no room; retry sooner */
        }
      }

      drawClicks(now);
      requestAnimationFrame(frame);
    }

    if (reduced) {
      /* one settled composition, no loop — placed only once the metrics
         are final so it obeys the same no-overlap rule */
      var t0 = performance.now();
      var paint = function () {
        ctx.clearRect(0, 0, W, H);
        drawHits(t0);
        diagrams.forEach(function (d) { drawDiagram(d, t0); });
        flushSparks();
      };
      var compose = function () {
        if (diagrams.length) return;
        for (var i = 0; i < 3; i++) {
          var d0 = spawn(t0, true);
          if (d0) diagrams.push(d0);
        }
        paint();
      };
      var poll = setInterval(function () {
        if (!metricsReady) return;
        clearInterval(poll);
        compose();
      }, 120);
      window.addEventListener("resize", function () { diagrams = []; compose(); });
    } else {
      requestAnimationFrame(frame);
    }
  })();

  /* ---------------------------------------------------------
     INIT
     --------------------------------------------------------- */
  onScroll();
  window.addEventListener("load", onScroll);

})();
