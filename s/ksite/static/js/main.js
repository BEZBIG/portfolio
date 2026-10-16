(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const music = $("#music");
  const musicBtn = $("#musicBtn");

  function playMusic() {
    if (!music) return;
    music.volume = 0.6;
    music.play().then(() => musicBtn.classList.add("playing")).catch(() => {});
  }

  if (musicBtn) {
    musicBtn.addEventListener("click", () => {
      if (music.paused) playMusic();
      else { music.pause(); musicBtn.classList.remove("playing"); }
    });
  }

  // --- обложка ---
  const gate = $("#gate");
  document.body.classList.add("locked");
  $("#gateBtn").addEventListener("click", () => {
    gate.classList.add("hidden");
    document.body.classList.remove("locked");
    playMusic();
    window.scrollTo(0, 0);
  });

  // --- появление при скролле ---
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }
  }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal").forEach((el) => io.observe(el));

  // --- видео играют только на экране ---
  const vio = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target;
      if (e.isIntersecting) {
        if (v.preload === "none") v.preload = "auto";
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    }
  }, { threshold: 0.35 });
  $$("video").forEach((v) => vio.observe(v));

  // --- конверт ---
  const envelope = $("#envelope");
  const letter = $("#letter");
  function openLetter() {
    if (envelope.classList.contains("opened")) return;
    envelope.classList.add("opened");
    setTimeout(() => {
      envelope.style.display = "none";
      $(".s-letter__hint").style.display = "none";
      letter.classList.remove("collapsed");
      void letter.offsetWidth;
      letter.classList.add("open");
    }, 650);
  }
  envelope.addEventListener("click", openLetter);
  envelope.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLetter(); }
  });

  // --- бордовая линия между локациями ---
  const places = $("#places");
  const svg = $("#placesLine");
  const path = $("#placesPath");
  let pathLen = 0;

  function buildLine() {
    const base = places.getBoundingClientRect();
    const pts = $$(".place__img", places).map((img) => {
      const r = img.getBoundingClientRect();
      // точка у кнопки сверху полароида
      return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height * 0.06 };
    });
    if (pts.length < 2) return;
    svg.setAttribute("viewBox", `0 0 ${base.width} ${base.height}`);
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const dy = b.y - a.y;
      // мягкая провисающая нить
      d += ` C ${a.x} ${a.y + dy * 0.75}, ${b.x} ${b.y - dy * 0.15}, ${b.x} ${b.y}`;
    }
    path.setAttribute("d", d);
    pathLen = path.getTotalLength();
    path.style.strokeDasharray = pathLen;
    drawLine();
  }

  function drawLine() {
    if (!pathLen) return;
    const r = places.getBoundingClientRect();
    const vh = window.innerHeight;
    const progress = Math.min(1, Math.max(0, (vh * 0.75 - r.top) / r.height));
    path.style.strokeDashoffset = pathLen * (1 - progress);
  }

  // линия рисуется после загрузки картинок, чтобы координаты были точными
  window.addEventListener("load", buildLine);
  window.addEventListener("resize", buildLine);
  window.addEventListener("scroll", drawLine, { passive: true });
  $$(".place__img").forEach((img) => img.addEventListener("load", buildLine));
  $$(".place").forEach((el) => el.addEventListener("transitionend", buildLine));
})();
