(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let lastRoute = null;
  let galleryRaf = 0;
  let galleryPoint = { x: 0, y: 0 };
  let apechainCarousel = null;

  function gsap() {
    return window.gsap && window.gsap.to ? window.gsap : null;
  }

  function routeFromPath(pathname = window.location.pathname) {
    if (pathname === "/" || pathname === "") return "home";
    if (pathname.startsWith("/projects")) return "projects";
    if (pathname.startsWith("/about")) return "about";
    if (pathname.startsWith("/contact")) return "contact";
    return "home";
  }

  function activeRoute() {
    return (
      document.querySelector(".persistent-experience")?.dataset.route ||
      routeFromPath()
    );
  }

  function dispatchVideoSync() {
    window.dispatchEvent(new CustomEvent("signal-pole:video-sync"));
  }

  function startRouteHint(href) {
    let target = null;
    try {
      target = href ? new URL(href, window.location.origin).pathname : null;
    } catch {
      target = null;
    }

    root.classList.add("codex-route-moving");
    window.clearTimeout(startRouteHint.timer);
    startRouteHint.timer = window.setTimeout(() => {
      root.classList.remove("codex-route-moving");
    }, 920);

    if (target && target !== "/") {
      window.dispatchEvent(new CustomEvent("signal-pole:video-pause"));
    }
  }

  function animatePageIn(route) {
    if (reduceMotion.matches) return;
    const page = document.querySelector(
      ".persistent-experience > .experience-page",
    );
    if (!page) return;

    const engine = gsap();
    if (engine) {
      engine.killTweensOf(page);
      engine.fromTo(
        page,
        { autoAlpha: 0, y: 18, scale: 0.992 },
        {
          autoAlpha: 1,
          clearProps: "opacity,visibility,transform",
          duration: route === "projects" ? 0.78 : 0.62,
          ease: "power3.out",
          overwrite: true,
          scale: 1,
          y: 0,
        },
      );
      return;
    }

    page.animate(
      [
        { opacity: 0, transform: "translate3d(0, 18px, 0) scale(0.992)" },
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
      ],
      {
        duration: route === "projects" ? 780 : 620,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    );
  }

  function syncRoute() {
    const route = activeRoute();
    root.dataset.codexRoute = route;
    dispatchVideoSync();

    if (lastRoute && lastRoute !== route) {
      animatePageIn(route);
    }
    lastRoute = route;

    setupApechainCarousel();
    enhanceProjectCards();
  }

  function setTrackShift(event) {
    const gallery = document.querySelector(".projects-gl-gallery");
    if (!gallery) return;

    const rect = gallery.getBoundingClientRect();
    galleryPoint = {
      x: ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 26,
      y: ((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 16,
    };

    if (galleryRaf) return;
    galleryRaf = window.requestAnimationFrame(() => {
      gallery.style.setProperty("--track-shift-x", `${galleryPoint.x}px`);
      gallery.style.setProperty("--track-shift-y", `${galleryPoint.y}px`);
      galleryRaf = 0;
    });
  }

  function previewSourceFor(src) {
    if (!src) return null;

    try {
      const url = new URL(src, window.location.origin);
      const match = url.pathname.match(/^\/projects\/([^/]+)\.png$/i);
      return match ? `/projects/previews/${match[1]}.jpg` : null;
    } catch {
      const match = src.match(/^\/projects\/([^/]+)\.png$/i);
      return match ? `/projects/previews/${match[1]}.jpg` : null;
    }
  }

  function optimizeCarouselImages(gallery) {
    const sets = Array.from(gallery.querySelectorAll(".projects-marquee__set"));

    sets.forEach((set, setIndex) => {
      if (setIndex > 0) set.setAttribute("aria-hidden", "true");

      set
        .querySelectorAll(".projects-marquee__figure img")
        .forEach((image, imageIndex) => {
          const original = image.dataset.codexOriginalSrc || image.getAttribute("src");
          const preview = previewSourceFor(original);
          if (!original) return;

          image.dataset.codexOriginalSrc = original;
          image.decoding = "async";
          image.loading = setIndex === 0 ? "eager" : "lazy";
          image.setAttribute(
            "fetchpriority",
            setIndex === 0 && imageIndex < 3 ? "high" : "low",
          );

          if (!preview || image.dataset.codexPreviewApplied === "true") return;

          image.dataset.codexPreviewApplied = "true";
          image.addEventListener(
            "error",
            () => {
              if (image.getAttribute("src") === preview) {
                image.src = image.dataset.codexOriginalSrc;
              }
            },
            { once: true },
          );
          image.src = preview;
        });
    });
  }

  function createQuick(card, image) {
    const engine = gsap();
    if (!engine) return null;

    engine.set(card, {
      force3D: true,
      transformOrigin: "50% 50%",
      transformPerspective: 900,
    });
    engine.set(image, { force3D: true, transformOrigin: "50% 50%" });

    return {
      cardX: engine.quickTo(card, "x", { duration: 0.32, ease: "power3.out" }),
      cardY: engine.quickTo(card, "y", { duration: 0.32, ease: "power3.out" }),
      cardRX: engine.quickTo(card, "rotationX", {
        duration: 0.32,
        ease: "power3.out",
      }),
      cardRY: engine.quickTo(card, "rotationY", {
        duration: 0.32,
        ease: "power3.out",
      }),
      cardScale: engine.quickTo(card, "scale", {
        duration: 0.32,
        ease: "power3.out",
      }),
      imageX: engine.quickTo(image, "x", { duration: 0.4, ease: "power3.out" }),
      imageY: engine.quickTo(image, "y", { duration: 0.4, ease: "power3.out" }),
      imageScale: engine.quickTo(image, "scale", {
        duration: 0.4,
        ease: "power3.out",
      }),
    };
  }

  function setupApechainCarousel() {
    const gallery = document.querySelector(".projects-gl-gallery");
    if (!gallery) {
      if (apechainCarousel) {
        apechainCarousel.stop();
        apechainCarousel = null;
      }
      return;
    }

    if (apechainCarousel?.gallery === gallery) return;
    if (apechainCarousel) apechainCarousel.stop();
    apechainCarousel = createApechainCarousel(gallery);
    apechainCarousel?.start();
  }

  function createApechainCarousel(gallery) {
    const set = gallery.querySelector(".projects-marquee__set");
    const items = Array.from(
      set?.querySelectorAll(".projects-marquee__item") || [],
    );
    if (!set || items.length < 2) return null;

    gallery.classList.add("codex-apechain-carousel");
    optimizeCarouselImages(gallery);

    const total = items.length;
    const step = 1 / total;
    const state = {
      current: 0,
      dragStartProgress: 0,
      dragging: false,
      easeRate: 10,
      idleDuration: 4600,
      idleTimer: 0,
      lastRenderedProgress: Number.NaN,
      lastTime: performance.now(),
      metrics: {
        height: 1,
        radius: 420,
        verticalLift: 18,
        width: 1,
      },
      moved: false,
      progress: 0,
      raf: 0,
      renderFrame: 0,
      resizeObserver: null,
      startX: 0,
      stopped: false,
      suppressClick: false,
      targetProgress: 0,
      wheelSnapTimer: 0,
    };

    const mod = (value, size = 1) => ((value % size) + size) % size;
    const shortestTarget = (from, to) => {
      let target = to;
      while (target - from > 0.5) target -= 1;
      while (target - from < -0.5) target += 1;
      return target;
    };

    const activeIndexFor = (progress) => mod(Math.round(progress * total), total);
    const cancelIdle = () => {
      if (!state.idleTimer) return;
      window.clearTimeout(state.idleTimer);
      state.idleTimer = 0;
    };

    const updateMetrics = () => {
      const rect = gallery.getBoundingClientRect();
      const width = Math.max(rect.width, 1);
      const height = Math.max(rect.height, 1);
      state.metrics = {
        height,
        radius: Math.min(Math.max(width * 0.44, 340), 780),
        verticalLift: Math.min(Math.max(height * 0.032, 10), 24),
        width,
      };
    };

    const render = (force = false) => {
      if (
        !force &&
        Math.abs(state.progress - state.lastRenderedProgress) < 0.00008
      ) {
        return;
      }

      state.lastRenderedProgress = state.progress;
      const { radius, verticalLift } = state.metrics;
      const normalized = mod(state.progress);

      items.forEach((item, index) => {
        const angle = (-(index / total) + normalized + 0.25) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const front = Math.sin(angle);
        const depth = Math.max(0, Math.min(1, (front + 1) / 2));
        const z = (depth - 0.5) * 380;
        const y = (1 - depth) * verticalLift + Math.cos(angle * 2) * 6;
        const scale = 0.5 + depth * 0.5;
        const rotateX = -5 + (1 - depth) * 3.5;
        const rotateY = -Math.cos(angle) * 38;
        const rotateZ = -4 + Math.cos(angle) * 2.2;
        const opacity = depth > 0.06 ? 0.18 + depth * 0.82 : 0;
        item.style.transform = [
          "translate(-50%, -50%)",
          `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px)`,
          `rotateX(${rotateX.toFixed(2)}deg)`,
          `rotateY(${rotateY.toFixed(2)}deg)`,
          `rotateZ(${rotateZ.toFixed(2)}deg)`,
          `scale(${scale.toFixed(3)})`,
        ].join(" ");
        item.style.opacity = opacity.toFixed(3);
        item.style.zIndex = String(Math.round(depth * 1000));
        item.style.pointerEvents = depth > 0.35 ? "" : "none";
        item.classList.toggle("is-ape-active", depth > 0.9);
        item.classList.toggle("is-ape-near", depth > 0.42 && depth <= 0.9);
        item.classList.toggle("is-ape-back", depth <= 0.42);
      });
    };

    const scheduleIdle = () => {
      cancelIdle();
      if (state.stopped || state.dragging || document.hidden) return;
      state.idleTimer = window.setTimeout(() => {
        goTo(state.current + 1, 1.08);
      }, state.idleDuration);
    };

    const startAnimation = () => {
      cancelIdle();
      if (state.raf) return;
      state.lastTime = performance.now();
      state.raf = window.requestAnimationFrame(tick);
    };

    const queueRender = (force = false) => {
      if (state.renderFrame) return;
      state.renderFrame = window.requestAnimationFrame(() => {
        state.renderFrame = 0;
        render(force);
      });
    };

    const goTo = (index, duration = 1.1) => {
      const wrappedIndex = mod(index, total);
      const target = shortestTarget(state.progress, wrappedIndex * step);
      state.current = wrappedIndex;
      state.targetProgress = target;
      state.easeRate = reduceMotion.matches ? 999 : 9 / Math.max(duration, 0.24);
      startAnimation();
    };

    function tick(time) {
      state.raf = 0;
      if (state.stopped) return;

      const dt = Math.min(0.08, Math.max(0, (time - state.lastTime) / 1000));
      state.lastTime = time;
      const diff = state.targetProgress - state.progress;

      if (reduceMotion.matches || Math.abs(diff) < 0.00035) {
        state.progress = mod(state.targetProgress);
        state.targetProgress = state.progress;
        state.current = activeIndexFor(state.progress);
        render();
        scheduleIdle();
        return;
      }

      state.progress += diff * (1 - Math.exp(-dt * state.easeRate));
      render();
      state.raf = window.requestAnimationFrame(tick);
    }

    const onPointerDown = (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      if (gallery.closest(".projects-page")?.dataset.previewOpen === "true") return;
      state.dragging = true;
      state.moved = false;
      state.startX = event.clientX;
      state.dragStartProgress = state.progress;
      state.targetProgress = state.progress;
      cancelIdle();
      gallery.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event) => {
      if (!state.dragging) return;
      const delta = event.clientX - state.startX;
      if (Math.abs(delta) > 6) state.moved = true;
      state.progress =
        state.dragStartProgress - (delta / Math.max(state.metrics.width, 1)) * 0.52;
      state.targetProgress = state.progress;
      state.current = activeIndexFor(state.progress);
      queueRender();
    };

    const onPointerUp = (event) => {
      if (!state.dragging) return;
      state.dragging = false;
      gallery.releasePointerCapture?.(event.pointerId);
      const nearest = Math.round(state.progress * total);
      state.suppressClick = state.moved;
      goTo(nearest, 0.62);
      window.setTimeout(() => {
        state.suppressClick = false;
      }, 80);
    };

    const normalizeWheel = (event) => {
      const scale =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? window.innerHeight
            : 1;
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      return delta * scale;
    };

    const onWheel = (event) => {
      if (gallery.closest(".projects-page")?.dataset.previewOpen === "true") return;

      const delta = normalizeWheel(event);
      if (Math.abs(delta) < 1) return;

      event.preventDefault();
      event.stopPropagation();
      root.classList.add("codex-carousel-wheel-active");

      const clamped = Math.max(-260, Math.min(260, delta));
      state.targetProgress += clamped * 0.00062;
      state.easeRate = 18;
      state.suppressClick = true;
      startAnimation();

      window.clearTimeout(state.wheelSnapTimer);
      state.wheelSnapTimer = window.setTimeout(() => {
        root.classList.remove("codex-carousel-wheel-active");
        state.suppressClick = false;
        goTo(Math.round(state.targetProgress * total), 0.52);
      }, 140);
    };

    const onClick = (event) => {
      if (!state.suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      state.suppressClick = false;
    };

    const onResize = () => {
      updateMetrics();
      queueRender(true);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        cancelIdle();
        return;
      }
      state.lastTime = performance.now();
      render(true);
      scheduleIdle();
    };

    updateMetrics();
    if ("ResizeObserver" in window) {
      state.resizeObserver = new ResizeObserver(onResize);
      state.resizeObserver.observe(gallery);
    } else {
      window.addEventListener("resize", onResize, { passive: true });
    }

    gallery.addEventListener("pointerdown", onPointerDown);
    gallery.addEventListener("pointermove", onPointerMove);
    gallery.addEventListener("pointerup", onPointerUp);
    gallery.addEventListener("pointercancel", onPointerUp);
    gallery.addEventListener("wheel", onWheel, { passive: false });
    gallery.addEventListener("click", onClick, true);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return {
      gallery,
      start() {
        render(true);
        scheduleIdle();
      },
      stop() {
        state.stopped = true;
        gallery.classList.remove("codex-apechain-carousel");
        gallery.removeEventListener("pointerdown", onPointerDown);
        gallery.removeEventListener("pointermove", onPointerMove);
        gallery.removeEventListener("pointerup", onPointerUp);
        gallery.removeEventListener("pointercancel", onPointerUp);
        gallery.removeEventListener("wheel", onWheel);
        gallery.removeEventListener("click", onClick, true);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.removeEventListener("resize", onResize);
        state.resizeObserver?.disconnect();
        cancelIdle();
        window.clearTimeout(state.wheelSnapTimer);
        if (state.raf) window.cancelAnimationFrame(state.raf);
        if (state.renderFrame) window.cancelAnimationFrame(state.renderFrame);
        root.classList.remove("codex-carousel-wheel-active");
        items.forEach((item) => {
          item.classList.remove("is-ape-active", "is-ape-near", "is-ape-back");
          item.style.removeProperty("filter");
          item.style.removeProperty("opacity");
          item.style.removeProperty("pointer-events");
          item.style.removeProperty("transform");
          item.style.removeProperty("z-index");
        });
      },
    };
  }

  function enhanceProjectCards() {
    const items = document.querySelectorAll(
      ".projects-marquee__item:not([data-codex-magnet])",
    );

    items.forEach((item) => {
      const card = item.querySelector(".projects-marquee__card");
      const image = item.querySelector(".projects-marquee__figure img");
      if (!card || !image) return;

      item.dataset.codexMagnet = "true";
      const quick = createQuick(card, image);
      let hoverRect = null;
      let pointerFrame = 0;
      let pointerPoint = null;

      const applyMove = () => {
        pointerFrame = 0;
        if (!pointerPoint || reduceMotion.matches) return;

        const rect = hoverRect || item.getBoundingClientRect();
        const nx =
          (pointerPoint.x - (rect.left + rect.width / 2)) / (rect.width / 2);
        const ny =
          (pointerPoint.y - (rect.top + rect.height / 2)) / (rect.height / 2);
        const x = nx * Math.min(30, rect.width * 0.085);
        const y = ny * Math.min(24, rect.height * 0.095);
        const tiltX = -ny * 5.2;
        const tiltY = nx * 5.8;

        if (quick) {
          quick.cardX(x);
          quick.cardY(y);
          quick.cardRX(tiltX);
          quick.cardRY(tiltY);
          quick.cardScale(1.035);
          quick.imageX(x * -0.22);
          quick.imageY(y * -0.18);
          quick.imageScale(1.085);
          return;
        }

        card.style.transform = `translate3d(${x}px, ${y}px, 0) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.035)`;
        image.style.transform = `translate3d(${x * -0.22}px, ${y * -0.18}px, 0) scale(1.085)`;
      };

      const move = (event) => {
        pointerPoint = { x: event.clientX, y: event.clientY };
        if (pointerFrame || reduceMotion.matches) return;
        pointerFrame = window.requestAnimationFrame(applyMove);
      };

      const reset = () => {
        pointerPoint = null;
        hoverRect = null;
        if (pointerFrame) {
          window.cancelAnimationFrame(pointerFrame);
          pointerFrame = 0;
        }

        if (quick) {
          quick.cardX(0);
          quick.cardY(0);
          quick.cardRX(0);
          quick.cardRY(0);
          quick.cardScale(1);
          quick.imageX(0);
          quick.imageY(0);
          quick.imageScale(1.015);
          return;
        }

        card.style.transform = "";
        image.style.transform = "";
      };

      item.addEventListener("pointermove", move, { passive: true });
      item.addEventListener("pointerleave", reset, { passive: true });
      item.addEventListener(
        "pointerenter",
        () => {
          hoverRect = item.getBoundingClientRect();
          root.classList.add("codex-project-hovering");
        },
        { passive: true },
      );
      item.addEventListener(
        "pointerleave",
        () => {
          root.classList.remove("codex-project-hovering");
        },
        { passive: true },
      );
    });
  }

  function bind() {
    root.classList.add("codex-enhanced");

    document.addEventListener(
      "click",
      (event) => {
        const link = event.target.closest?.("a[href]");
        if (!link) return;
        const url = new URL(link.href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (!["/", "/projects", "/about", "/contact"].includes(url.pathname)) {
          return;
        }
        startRouteHint(url.href);
      },
      true,
    );

    window.addEventListener("signal-pole:navigate", (event) => {
      startRouteHint(event.detail?.href);
    });

    window.addEventListener("popstate", () => {
      startRouteHint(window.location.href);
      window.setTimeout(syncRoute, 80);
    });

    document.addEventListener("pointermove", setTrackShift, { passive: true });

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(syncRoute);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    window.setTimeout(syncRoute, 60);
    window.setTimeout(syncRoute, 520);
    window.setTimeout(syncRoute, 1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }
})();
