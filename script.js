/* ============================================================
   BOSS BURGER — Cinematic Scroll Engine
   GSAP + ScrollTrigger + Canvas Frame Sequence
   ============================================================ */

(function () {
  "use strict";

  /* ----------------------------------------------------------
     0. CONFIGURATION
     ---------------------------------------------------------- */
  const CONFIG = {
    frameCount: 300,
    framePath: "frames/ezgif-frame-",
    frameExt: ".jpg",
    scrollSpacerHeight: 8000,
    preloadBatch: 30,
  };

  /* ----------------------------------------------------------
     1. DOM REFS
     ---------------------------------------------------------- */
  const canvas          = document.getElementById("hero-canvas");
  const ctx             = canvas.getContext("2d");
  const preloader       = document.querySelector(".preloader");
  const preloaderFill   = document.querySelector(".preloader__bar-fill");
  const preloaderPct    = document.querySelector(".preloader__percent");
  const navbar          = document.querySelector(".navbar");
  const scrollIndicator = document.querySelector(".scroll-indicator");
  const stickyCta       = document.querySelector(".sticky-cta");
  const scrollSpacer    = document.querySelector(".scroll-spacer");

  /* ----------------------------------------------------------
     2. FRAME LOADING ENGINE
     ---------------------------------------------------------- */
  const frames = new Array(CONFIG.frameCount);
  let loadedCount = 0;
  let currentFrameObj = { index: 0 };
  let preloaderDismissed = false;

  function padNumber(n) {
    return String(n + 1).padStart(3, "0");
  }

  function getFrameSrc(i) {
    return CONFIG.framePath + padNumber(i) + CONFIG.frameExt;
  }

  function loadFrame(i) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        frames[i] = img;
        loadedCount++;
        updatePreloader();
        resolve();
      };
      img.onerror = () => {
        loadedCount++;
        updatePreloader();
        resolve();
      };
      img.src = getFrameSrc(i);
    });
  }

  function updatePreloader() {
    const pct = Math.round((loadedCount / CONFIG.frameCount) * 100);
    if (preloaderFill) preloaderFill.style.width = pct + "%";
    if (preloaderPct) preloaderPct.textContent = pct + "% LOADING";

    if (loadedCount >= CONFIG.preloadBatch && !preloaderDismissed) {
      dismissPreloader();
    }
  }

  function dismissPreloader() {
    preloaderDismissed = true;
    if (preloader) preloader.classList.add("hidden");
    // Render the first frame once preloader is done
    renderFrame(0);
    setTimeout(() => {
      initScrollAnimations();
      if (scrollIndicator) scrollIndicator.classList.add("visible");
    }, 300);
  }

  async function loadAllFrames() {
    // Load first batch immediately (critical)
    const firstBatch = [];
    for (let i = 0; i < Math.min(CONFIG.preloadBatch, CONFIG.frameCount); i++) {
      firstBatch.push(loadFrame(i));
    }
    await Promise.all(firstBatch);

    // Load remaining in small batches to avoid overwhelming the browser
    for (let i = CONFIG.preloadBatch; i < CONFIG.frameCount; i += 10) {
      const batch = [];
      for (let j = i; j < Math.min(i + 10, CONFIG.frameCount); j++) {
        batch.push(loadFrame(j));
      }
      await Promise.all(batch);
    }
  }

  /* ----------------------------------------------------------
     3. CANVAS RENDERER
     ---------------------------------------------------------- */
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    renderFrame(Math.round(currentFrameObj.index));
  }

  function renderFrame(index) {
    const frameIndex = Math.max(0, Math.min(Math.round(index), CONFIG.frameCount - 1));
    const img = frames[frameIndex];

    if (!img || !img.complete || img.naturalWidth === 0) {
      // Try to find nearest loaded frame
      for (let offset = 1; offset < 10; offset++) {
        const below = frames[frameIndex - offset];
        if (below && below.complete && below.naturalWidth > 0) {
          drawImage(below);
          return;
        }
        const above = frames[frameIndex + offset];
        if (above && above.complete && above.naturalWidth > 0) {
          drawImage(above);
          return;
        }
      }
      return;
    }

    drawImage(img);
  }

  function drawImage(img) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Cover-fit the image
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = canvas.width / canvas.height;

    let drawW, drawH, drawX, drawY;

    if (canvasRatio > imgRatio) {
      drawW = canvas.width;
      drawH = canvas.width / imgRatio;
      drawX = 0;
      drawY = (canvas.height - drawH) / 2;
    } else {
      drawH = canvas.height;
      drawW = canvas.height * imgRatio;
      drawX = (canvas.width - drawW) / 2;
      drawY = 0;
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  /* ----------------------------------------------------------
     4. GSAP SCROLL ANIMATIONS
     ---------------------------------------------------------- */
  function initScrollAnimations() {
    gsap.registerPlugin(ScrollTrigger);

    // Set scroll spacer height
    if (scrollSpacer) scrollSpacer.style.height = CONFIG.scrollSpacerHeight + "px";

    /* ---- Master Frame Scrubber ---- */
    gsap.to(currentFrameObj, {
      index: CONFIG.frameCount - 1,
      ease: "none",
      scrollTrigger: {
        trigger: ".scroll-spacer",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.3,
        onUpdate: function () {
          renderFrame(currentFrameObj.index);
        },
      },
    });

    /* ---- Canvas fade control ---- */
    // Canvas stays visible during scroll spacer, fades out at end
    gsap.to(canvas, {
      opacity: 0,
      scrollTrigger: {
        trigger: ".scroll-spacer",
        start: () => `bottom-=${window.innerHeight * 0.5} top`,
        end: "bottom top",
        scrub: true,
      },
    });

    /* ---- Scene 0: Hero Text ---- */
    const heroOverlay = document.querySelector(".hero-overlay");
    if (heroOverlay) {
      // Fade in hero text
      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: ".scroll-spacer",
          start: "top top",
          end: () => `top+=${CONFIG.scrollSpacerHeight * 0.08} top`,
          scrub: true,
        },
      });

      heroTl
        .fromTo(".hero-overlay__headline span:nth-child(1)",
          { y: 80, opacity: 0, rotateX: -25 },
          { y: 0, opacity: 1, rotateX: 0, duration: 0.3 }
        )
        .fromTo(".hero-overlay__headline span:nth-child(2)",
          { y: 80, opacity: 0, rotateX: -25 },
          { y: 0, opacity: 1, rotateX: 0, duration: 0.3 }, 0.1
        )
        .fromTo(".hero-overlay__headline span:nth-child(3)",
          { y: 80, opacity: 0, rotateX: -25 },
          { y: 0, opacity: 1, rotateX: 0, duration: 0.3 }, 0.2
        )
        .fromTo(".hero-overlay__sub",
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.2 }, 0.3
        )
        .fromTo(".hero-overlay__ctas",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.2 }, 0.4
        );

      // Make hero overlay visible
      gsap.set(heroOverlay, { opacity: 1 });

      // Fade out hero text before next scene
      gsap.to(heroOverlay, {
        opacity: 0, y: -80,
        scrollTrigger: {
          trigger: ".scroll-spacer",
          start: () => `top+=${CONFIG.scrollSpacerHeight * 0.09} top`,
          end: () => `top+=${CONFIG.scrollSpacerHeight * 0.14} top`,
          scrub: true,
        },
      });
    }

    /* ---- Scene 1: From The Grill ---- */
    animateSceneText("scene-grill", 0.14, 0.19, 0.21, 0.24, {
      enterFrom: { y: 60, opacity: 0, scale: 0.9 },
      enterTo: { y: 0, opacity: 1, scale: 1 },
    });

    /* ---- Scene 2: Crafted to Perfection ---- */
    animateSceneText("scene-macro", 0.24, 0.29, 0.31, 0.34, {
      enterFrom: { x: -100, opacity: 0 },
      enterTo: { x: 0, opacity: 1 },
      exitTo: { x: 100, opacity: 0 },
    });

    /* ---- Scene 3: Exploded View ---- */
    animateSceneText("scene-exploded", 0.34, 0.39, 0.48, 0.51, {
      enterFrom: { scale: 0.7, opacity: 0 },
      enterTo: { scale: 1, opacity: 1 },
    });

    // Ingredient labels
    const ingredientLabels = document.querySelector(".ingredient-labels");
    if (ingredientLabels) {
      gsap.fromTo(ingredientLabels,
        { opacity: 0 },
        {
          opacity: 1,
          scrollTrigger: {
            trigger: ".scroll-spacer",
            start: () => `top+=${CONFIG.scrollSpacerHeight * 0.35} top`,
            end: () => `top+=${CONFIG.scrollSpacerHeight * 0.38} top`,
            scrub: true,
          },
        }
      );

      const labels = ingredientLabels.querySelectorAll(".ingredient-label");
      labels.forEach((label, i) => {
        const isRight = label.classList.contains("ingredient-label--right");
        gsap.fromTo(label,
          { opacity: 0, x: isRight ? 50 : -50 },
          {
            opacity: 1, x: 0,
            scrollTrigger: {
              trigger: ".scroll-spacer",
              start: () => `top+=${CONFIG.scrollSpacerHeight * (0.36 + i * 0.007)} top`,
              end: () => `top+=${CONFIG.scrollSpacerHeight * (0.39 + i * 0.007)} top`,
              scrub: true,
            },
          }
        );
      });

      gsap.to(ingredientLabels, {
        opacity: 0,
        scrollTrigger: {
          trigger: ".scroll-spacer",
          start: () => `top+=${CONFIG.scrollSpacerHeight * 0.48} top`,
          end: () => `top+=${CONFIG.scrollSpacerHeight * 0.50} top`,
          scrub: true,
        },
      });
    }

    /* ---- Scene 4: Assembly ---- */
    animateSceneText("scene-assembly", 0.51, 0.56, 0.60, 0.63, {
      enterFrom: { scale: 1.4, opacity: 0 },
      enterTo: { scale: 1, opacity: 1 },
    });

    // Camera shake at landing
    ScrollTrigger.create({
      trigger: ".scroll-spacer",
      start: () => `top+=${CONFIG.scrollSpacerHeight * 0.58} top`,
      end: () => `top+=${CONFIG.scrollSpacerHeight * 0.585} top`,
      onEnter: () => {
        gsap.to(canvas, {
          x: 4, duration: 0.04,
          yoyo: true, repeat: 6,
          ease: "power2.inOut",
          onComplete: () => gsap.set(canvas, { x: 0 }),
        });
      },
    });

    /* ---- Scene 5: The Boss Box ---- */
    animateSceneText("scene-box", 0.63, 0.68, 0.74, 0.78, {
      enterFrom: { y: 70, opacity: 0 },
      enterTo: { y: 0, opacity: 1 },
    });

    /* ---- Scene 6: Final CTA ---- */
    const finalText = document.getElementById("scene-final");
    if (finalText) {
      gsap.fromTo(finalText,
        { opacity: 0, scale: 0.6 },
        {
          opacity: 1, scale: 1,
          scrollTrigger: {
            trigger: ".scroll-spacer",
            start: () => `top+=${CONFIG.scrollSpacerHeight * 0.80} top`,
            end: () => `top+=${CONFIG.scrollSpacerHeight * 0.88} top`,
            scrub: true,
          },
        }
      );

      gsap.to(finalText, {
        opacity: 0,
        scrollTrigger: {
          trigger: ".scroll-spacer",
          start: () => `top+=${CONFIG.scrollSpacerHeight * 0.93} top`,
          end: () => `top+=${CONFIG.scrollSpacerHeight * 0.97} top`,
          scrub: true,
        },
      });
    }

    /* ---- Scroll Indicator ---- */
    if (scrollIndicator) {
      gsap.to(scrollIndicator, {
        opacity: 0,
        scrollTrigger: {
          trigger: ".scroll-spacer",
          start: "top top",
          end: () => `top+=${CONFIG.scrollSpacerHeight * 0.04} top`,
          scrub: true,
        },
      });
    }

    /* ---- Particles visibility ---- */
    const particlesContainer = document.querySelector(".particles-container");
    if (particlesContainer) {
      gsap.set(particlesContainer, { opacity: 1 });
      gsap.to(particlesContainer, {
        opacity: 0,
        scrollTrigger: {
          trigger: ".scroll-spacer",
          start: () => `top+=${CONFIG.scrollSpacerHeight * 0.78} top`,
          end: () => `top+=${CONFIG.scrollSpacerHeight * 0.82} top`,
          scrub: true,
        },
      });
    }

    /* ---- Navbar ---- */
    ScrollTrigger.create({
      trigger: ".scroll-spacer",
      start: () => `top+=${CONFIG.scrollSpacerHeight * 0.04} top`,
      onEnter: () => navbar.classList.add("visible", "scrolled"),
      onLeaveBack: () => navbar.classList.remove("visible", "scrolled"),
    });

    /* ---- Sticky CTA ---- */
    ScrollTrigger.create({
      trigger: ".scroll-spacer",
      start: () => `top+=${CONFIG.scrollSpacerHeight * 0.12} top`,
      onEnter: () => stickyCta && stickyCta.classList.add("visible"),
      onLeaveBack: () => stickyCta && stickyCta.classList.remove("visible"),
    });

    /* ---- Static Sections ---- */
    initStaticSections();
  }

  /**
   * Helper: Animate a scene text element (fade in, hold, fade out)
   */
  function animateSceneText(id, enterStart, enterEnd, exitStart, exitEnd, opts) {
    const el = document.getElementById(id);
    if (!el) return;

    const from = opts.enterFrom || { y: 50, opacity: 0 };
    const to = opts.enterTo || { y: 0, opacity: 1 };
    const exitTo = opts.exitTo || { opacity: 0, y: -50 };

    gsap.fromTo(el, from, {
      ...to,
      scrollTrigger: {
        trigger: ".scroll-spacer",
        start: () => `top+=${CONFIG.scrollSpacerHeight * enterStart} top`,
        end: () => `top+=${CONFIG.scrollSpacerHeight * enterEnd} top`,
        scrub: true,
      },
    });

    gsap.to(el, {
      ...exitTo,
      scrollTrigger: {
        trigger: ".scroll-spacer",
        start: () => `top+=${CONFIG.scrollSpacerHeight * exitStart} top`,
        end: () => `top+=${CONFIG.scrollSpacerHeight * exitEnd} top`,
        scrub: true,
      },
    });
  }

  /* ----------------------------------------------------------
     5. STATIC SECTION ANIMATIONS
     ---------------------------------------------------------- */
  function initStaticSections() {

    /* Promo Banner */
    const promoBanner = document.querySelector(".promo-banner");
    if (promoBanner) {
      const promoTl = gsap.timeline({
        scrollTrigger: {
          trigger: promoBanner,
          start: "top 80%",
          end: "top 20%",
          scrub: 1,
        },
      });
      promoTl
        .fromTo(".promo-banner__kicker", { y: 30, opacity: 0 }, { y: 0, opacity: 1 })
        .fromTo(".promo-banner__headline", { y: 60, opacity: 0, scale: 0.8 }, { y: 0, opacity: 1, scale: 1 }, "<0.1")
        .fromTo(".promo-banner__sub", { y: 30, opacity: 0 }, { y: 0, opacity: 1 }, "<0.1")
        .fromTo(".promo-banner .btn", { y: 20, opacity: 0 }, { y: 0, opacity: 1 }, "<0.1");
    }

    /* Testimonial cards */
    gsap.utils.toArray(".testimonial-card").forEach((card, i) => {
      gsap.to(card, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: i * 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: card,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    });

    /* Menu cards */
    gsap.utils.toArray(".menu-card").forEach((card, i) => {
      gsap.to(card, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: i * 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: card,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    });

    /* Story reveals */
    gsap.utils.toArray(".story .reveal").forEach((el) => {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 80%",
          toggleActions: "play none none none",
        },
      });
    });

    /* Story image parallax */
    gsap.utils.toArray(".story__image").forEach((img) => {
      gsap.fromTo(img.querySelector("img"),
        { y: -30 },
        {
          y: 30,
          ease: "none",
          scrollTrigger: {
            trigger: img,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    });

    /* Footer reveals */
    gsap.utils.toArray(".footer .reveal").forEach((el, i) => {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        delay: i * 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          toggleActions: "play none none none",
        },
      });
    });

    /* Section labels + titles */
    gsap.utils.toArray(".section__label").forEach((label) => {
      gsap.fromTo(label,
        { x: -30, opacity: 0 },
        {
          x: 0, opacity: 1,
          scrollTrigger: {
            trigger: label,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    });

    gsap.utils.toArray(".section__title").forEach((title) => {
      gsap.fromTo(title,
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1,
          duration: 0.8,
          scrollTrigger: {
            trigger: title,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    });
  }

  /* ----------------------------------------------------------
     6. MENU CARD 3D TILT
     ---------------------------------------------------------- */
  function initMenuTilt() {
    document.querySelectorAll(".menu-card").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -5;
        const rotateY = ((x - centerX) / centerX) * 5;

        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-12px) scale(1.02)`;
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
      });
    });
  }

  /* ----------------------------------------------------------
     7. PARTICLE GENERATOR
     ---------------------------------------------------------- */
  function initParticles() {
    const container = document.querySelector(".particles-container");
    if (!container) return;

    // Create sparks
    for (let i = 0; i < 18; i++) {
      const spark = document.createElement("div");
      spark.classList.add("particle", "particle--spark");
      spark.style.left = (10 + Math.random() * 80) + "%";
      spark.style.top = (35 + Math.random() * 45) + "%";
      spark.style.animationDelay = (Math.random() * 4) + "s";
      spark.style.animationDuration = (2 + Math.random() * 3) + "s";
      spark.style.setProperty("--dx", (Math.random() * 50 - 25) + "px");
      spark.style.setProperty("--dy", (-30 - Math.random() * 80) + "px");
      container.appendChild(spark);
    }

    // Create smoke wisps
    for (let i = 0; i < 8; i++) {
      const smoke = document.createElement("div");
      smoke.classList.add("particle", "particle--smoke");
      smoke.style.left = (25 + Math.random() * 50) + "%";
      smoke.style.top = (45 + Math.random() * 35) + "%";
      smoke.style.animationDelay = (Math.random() * 6) + "s";
      smoke.style.animationDuration = (5 + Math.random() * 5) + "s";
      container.appendChild(smoke);
    }
  }

  /* ----------------------------------------------------------
     8. SMOOTH SCROLL FOR NAV LINKS
     ---------------------------------------------------------- */
  function initSmoothNav() {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (e) => {
        const href = link.getAttribute("href");
        if (href === "#") return;
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          gsap.to(window, {
            scrollTo: { y: target, offsetY: 80 },
            duration: 1.5,
            ease: "power3.inOut",
          });
        }
      });
    });
  }

  /* ----------------------------------------------------------
     9. INITIALIZE EVERYTHING
     ---------------------------------------------------------- */
  function init() {
    initParticles();
    initMenuTilt();
    initSmoothNav();

    // Start loading frames
    loadAllFrames();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
