(function () {
  const root = document.documentElement;
  const MOTION = root.classList.contains("motion") && window.gsap;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // разбивка на буквы и слова
  $$("[data-split]").forEach((el) => {
    el.innerHTML = [...el.textContent].map((c) => `<span class="char">${c}</span>`).join("");
  });
  $$("[data-reveal-words]").forEach((el) => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(" ");
  });

  // одометр: в колонке 0–9 и ещё один 0, чтобы нули прокручивали полный круг
  $$(".odo").forEach((odo) => {
    const strip = Array.from({ length: 11 }, (_, i) => `<span>${i % 10}</span>`).join("");
    odo.innerHTML = [...odo.dataset.value]
      .map((ch) => (ch === " "
        ? '<span class="odo-gap"></span>'
        : `<span class="odo-col"><span class="odo-strip" data-target="${+ch || 10}">${strip}</span></span>`))
      .join("");
  });
  const odoFinal = (el) => (-el.dataset.target / 11) * 100;

  // счётчики — без анимации сразу финальное число
  if (!MOTION) {
    $$("[data-count]").forEach((el) => (el.textContent = el.dataset.count));
    $$(".odo-strip").forEach((el) => (el.style.transform = `translateY(${odoFinal(el)}%)`));
    $(".life-rail").style.overflowX = "auto";
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // плавный скролл
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    window.lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach((a) =>
      a.addEventListener("click", (e) => {
        const target = $(a.getAttribute("href"));
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { duration: 1.6 });
      })
    );
  }
  lenis && lenis.stop();

  /* ---------- прелоадер + вход ---------- */
  const counter = { v: 0 };
  const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
  intro
    .fromTo(".loader-word span", { yPercent: 110 }, { yPercent: 0, duration: 1, stagger: 0.045 }, 0)
    .to(counter, {
      v: 100, duration: 1.6, ease: "power2.inOut",
      onUpdate: () => ($(".loader-count .num").textContent = Math.round(counter.v)),
    }, 0)
    .to(".loader-word span", { yPercent: -110, duration: 0.6, stagger: 0.02, ease: "power3.in" }, 1.7)
    .to(".loader", { yPercent: -100, duration: 1, ease: "expo.inOut" }, 2.05)
    .set(".loader", { display: "none" })
    .from(".hero-title .char", { yPercent: 115, rotate: 8, duration: 1.3, stagger: 0.05 }, 2.55)
    .to(".hero-photo-inner", { clipPath: "inset(0% 0 0 0)", duration: 1.4, ease: "expo.inOut" }, 2.45)
    .from(".hero-photo img", { scale: 1.4, duration: 1.8 }, 2.45)
    .to(".hero-meta, .hero-bottom", { opacity: 1, duration: 1 }, 3.1)
    .fromTo(".sticker", { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.8, stagger: 0.15, ease: "back.out(2.5)" }, 3.3)
    .add(() => lenis && lenis.start(), 3.1);

  /* ---------- hero: мышь и скролл ---------- */
  if (fine) {
    const px = gsap.quickTo(".hero-photo-inner", "x", { duration: 0.9, ease: "power3" });
    const py = gsap.quickTo(".hero-photo-inner", "y", { duration: 0.9, ease: "power3" });
    const rx = gsap.quickTo(".hero-photo-inner", "rotate", { duration: 0.9, ease: "power3" });
    $(".hero").addEventListener("mousemove", (e) => {
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      px(nx * 40); py(ny * 30); rx(nx * 4);
    });
    gsap.to(".sticker-1", { y: -14, rotate: 12, duration: 2.4, yoyo: true, repeat: -1, ease: "sine.inOut" });
    gsap.to(".sticker-2", { y: 12, rotate: -9, duration: 2.8, yoyo: true, repeat: -1, ease: "sine.inOut" });
  }
  const heroST = { trigger: ".hero", start: "top top", end: "bottom top", scrub: true };
  gsap.to(".hero-title .line:first-child", { xPercent: -18, scrollTrigger: heroST });
  gsap.to(".hero-title .line-2", { xPercent: 14, scrollTrigger: heroST });
  gsap.to(".hero-photo img", { yPercent: -12, scrollTrigger: heroST });
  gsap.to(".hero-photo", { scale: 0.86, rotate: -3, scrollTrigger: heroST });

  /* ---------- бегущие строки (скорость от скролла) ---------- */
  $$(".marquee .track").forEach((track, i) => {
    track.innerHTML += track.innerHTML;
    const dir = i % 2 ? 1 : -1;
    const loop = gsap.fromTo(track, { xPercent: dir < 0 ? 0 : -50 }, { xPercent: dir < 0 ? -50 : 0, duration: 26 + i * 6, ease: "none", repeat: -1 });
    ScrollTrigger.create({
      onUpdate: (self) => {
        const v = gsap.utils.clamp(-4, 4, self.getVelocity() / 400);
        gsap.to(loop, { timeScale: 1 + Math.abs(v), duration: 0.3, overwrite: true });
        gsap.to(loop, { timeScale: 1, duration: 1.2, delay: 0.3 });
      },
    });
  });

  /* ---------- манифест: слова загораются ---------- */
  gsap.to(".manifest-text .w", {
    opacity: 1, stagger: 0.08, ease: "none",
    scrollTrigger: { trigger: ".manifest-text", start: "top 78%", end: "bottom 45%", scrub: true },
  });

  // счётчики
  $$("[data-count]").forEach((el) => {
    const o = { v: 0 };
    gsap.to(o, {
      v: +el.dataset.count, duration: 1.8, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
      onUpdate: () => (el.textContent = Math.round(o.v)),
    });
  });
  gsap.from(".fact", { y: 60, opacity: 0, stagger: 0.12, duration: 1, ease: "expo.out", scrollTrigger: { trigger: ".facts", start: "top 85%" } });

  /* ---------- запуски: одометр и имена ---------- */
  gsap.to(".odo-strip", {
    yPercent: (i, el) => odoFinal(el), duration: 2.8, ease: "power4.out", stagger: 0.07,
    scrollTrigger: { trigger: ".billions", start: "top 78%" },
  });
  gsap.from(".bill-cur", {
    scale: 0, rotate: -45, duration: 1.1, delay: 1.4, ease: "back.out(2.2)",
    scrollTrigger: { trigger: ".billions", start: "top 78%" },
  });
  $$(".name").forEach((row) => {
    gsap.fromTo(row.querySelector(".name-title"), { "--fill": "0%" }, {
      "--fill": "100%", ease: "none",
      scrollTrigger: { trigger: row, start: "top 88%", end: "top 45%", scrub: 0.6 },
    });
    gsap.from(row.querySelectorAll(".name-no, .name-desc"), {
      opacity: 0, y: 24, duration: 1, stagger: 0.08, ease: "expo.out",
      scrollTrigger: { trigger: row, start: "top 88%" },
    });
  });

  /* ---------- заголовки и подписи ---------- */
  $$(".section-title, .eyebrow").forEach((el) => {
    gsap.from(el, { y: 70, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%" } });
  });

  /* ---------- работы: горизонтальный пин на десктопе ---------- */
  const mm = gsap.matchMedia();
  mm.add("(min-width: 901px)", () => {
    const track = $(".work-track");
    const dist = () => track.scrollWidth - innerWidth;
    const tween = gsap.to(track, {
      x: () => -dist(), ease: "none",
      scrollTrigger: { trigger: ".work-pin", start: "top top", end: () => "+=" + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 },
    });
    $$(".case-media img").forEach((img) => {
      gsap.fromTo(img, { xPercent: -6 }, {
        xPercent: 6, ease: "none",
        scrollTrigger: { trigger: img.closest(".case"), containerAnimation: tween, start: "left right", end: "right left", scrub: true },
      });
    });
    $$(".case").forEach((c) => {
      gsap.from(c.querySelector(".case-info"), {
        y: 40, opacity: 0, duration: 1, ease: "expo.out",
        scrollTrigger: { trigger: c, containerAnimation: tween, start: "left 85%" },
      });
    });
  });
  mm.add("(max-width: 900px)", () => {
    $$(".case").forEach((c) => {
      gsap.from(c, { y: 80, opacity: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: c, start: "top 88%" } });
    });
  });

  /* ---------- услуги ---------- */
  gsap.from(".svc", { y: 50, opacity: 0, stagger: 0.08, duration: 1, ease: "expo.out", scrollTrigger: { trigger: ".svc-list", start: "top 80%" } });
  gsap.from(".niches li", { scale: 0.5, opacity: 0, stagger: 0.05, duration: 0.7, ease: "back.out(2)", scrollTrigger: { trigger: ".niches", start: "top 90%" } });
  if (fine) {
    const float = $(".svc-float"), fimg = $("img", float);
    const fx = gsap.quickTo(float, "left", { duration: 0.6, ease: "power3" });
    const fy = gsap.quickTo(float, "top", { duration: 0.6, ease: "power3" });
    $$(".svc").forEach((li) => {
      li.addEventListener("mouseenter", () => { fimg.src = li.dataset.img; float.classList.add("on"); });
      li.addEventListener("mouseleave", () => float.classList.remove("on"));
    });
    $(".svc-list").addEventListener("mousemove", (e) => { fx(e.clientX + 170); fy(e.clientY); });
  }

  /* ---------- жизнь: лента с дрейфом и перетаскиванием ---------- */
  const rail = $(".life-rail"), lt = $(".life-track");
  lt.innerHTML += lt.innerHTML;
  let x = 0, drift = -0.6, dragging = false, startX = 0, startPos = 0, moved = 0;
  const half = () => lt.scrollWidth / 2;
  gsap.ticker.add(() => {
    if (!dragging) x += drift;
    const h = half();
    if (x <= -h) x += h;
    if (x > 0) x -= h;
    gsap.set(lt, { x });
  });
  rail.addEventListener("pointerdown", (e) => { dragging = true; moved = 0; startX = e.clientX; startPos = x; rail.style.cursor = "grabbing"; });
  addEventListener("pointermove", (e) => { if (!dragging) return; moved = e.clientX - startX; x = startPos + moved; });
  addEventListener("pointerup", () => { dragging = false; rail.style.cursor = ""; });
  rail.addEventListener("click", (e) => { if (Math.abs(moved) > 6) e.preventDefault(); }, true);
  rail.addEventListener("mouseenter", () => (drift = -0.15));
  rail.addEventListener("mouseleave", () => (drift = -0.6));
  gsap.from(".polaroid", { y: 160, rotate: 12, opacity: 0, stagger: 0.06, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".life-rail", start: "top 85%" } });

  /* ---------- финал ---------- */
  gsap.from(".cta-title .line > span", {
    yPercent: 110, duration: 1.3, stagger: 0.12, ease: "expo.out",
    scrollTrigger: { trigger: ".cta-title", start: "top 80%" },
  });
  gsap.from(".cta-links .pill", { y: 40, opacity: 0, stagger: 0.08, duration: 1, ease: "expo.out", scrollTrigger: { trigger: ".cta-links", start: "top 92%" } });

  /* ---------- курсор и магниты ---------- */
  if (fine) {
    root.classList.add("has-cursor");
    const cur = $(".cursor"), label = $(".cursor-label");
    const cx = gsap.quickTo(cur, "x", { duration: 0.25, ease: "power3" });
    const cy = gsap.quickTo(cur, "y", { duration: 0.25, ease: "power3" });
    addEventListener("mousemove", (e) => { cx(e.clientX); cy(e.clientY); });
    document.addEventListener("mouseover", (e) => {
      const big = e.target.closest("[data-cursor]");
      const link = e.target.closest("a, button");
      cur.classList.toggle("is-big", !!big);
      cur.classList.toggle("is-link", !big && !!link);
      label.textContent = big ? big.dataset.cursor : "";
    });

    $$(".magnetic").forEach((el) => {
      const inner = el.querySelector("span") || el;
      const mx = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, .4)" });
      const my = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, .4)" });
      const ix = gsap.quickTo(inner, "x", { duration: 0.6, ease: "elastic.out(1, .4)" });
      const iy = gsap.quickTo(inner, "y", { duration: 0.6, ease: "elastic.out(1, .4)" });
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        mx(dx * 0.35); my(dy * 0.35); ix(dx * 0.15); iy(dy * 0.15);
      });
      el.addEventListener("mouseleave", () => { mx(0); my(0); ix(0); iy(0); });
    });
  }

  addEventListener("load", () => ScrollTrigger.refresh());
})();
