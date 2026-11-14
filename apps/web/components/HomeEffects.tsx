"use client";
import {useEffect} from "react";

const LIT = ".hc-anchors,.hc-service-detail,.hc-product,.hc-visibility-grid article,.hc-process li,.hc-costs,.hc-rate,.identity-hero-photo,.hc-art";
const TILT = ".identity-media,.hc-art,.hc-product,.hc-visibility-grid article,.hc-process li";
const REVEAL = ".hc-intro,.hc-gallery-card,.hc-section-heading,.hc-service-detail,.hc-visibility-grid article,.hc-process li,.hc-product,.hc-costs,.hc-rate,.hc-finish-heading,.hc-finish-next";

/**
 * Light and depth for the home page (docs/design/startseite-referenz-2026-11-13.md, R9 to R11).
 * Writes CSS variables only; every visible value lives in AtelierSystem.css.
 * Nothing runs under reduced motion; without script the page shows complete and still.
 */
export default function HomeEffects() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".home-concept");
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.dataset.fx = "on";

    const seen = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add("is-in"); seen.unobserve(entry.target); }
    }, {rootMargin: "0px 0px -8% 0px", threshold: 0.08});
    root.querySelectorAll(REVEAL).forEach(node => seen.observe(node));

    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return () => { seen.disconnect(); delete root.dataset.fx; };

    let frame = 0, last: PointerEvent | null = null, tilted: HTMLElement | null = null;
    const apply = () => {
      frame = 0;
      const event = last, target = event?.target;
      if (!event || !(target instanceof Element)) return;
      const lit = target.closest<HTMLElement>(LIT);
      if (lit) { const box = lit.getBoundingClientRect(); lit.style.setProperty("--glow-x", `${event.clientX - box.left}px`); lit.style.setProperty("--glow-y", `${event.clientY - box.top}px`); }
      const hero = target.closest(".identity-scene");
      const tilt = hero ? hero.querySelector<HTMLElement>(".identity-media") : target.closest<HTMLElement>(TILT);
      if (tilted && tilted !== tilt) { tilted.style.removeProperty("--tilt-x"); tilted.style.removeProperty("--tilt-y"); }
      tilted = tilt;
      if (tilt) { const box = (hero ?? tilt).getBoundingClientRect(); tilt.style.setProperty("--tilt-x", ((event.clientX - box.left) / box.width * 2 - 1).toFixed(3)); tilt.style.setProperty("--tilt-y", ((event.clientY - box.top) / box.height * 2 - 1).toFixed(3)); }
    };
    const move = (event: PointerEvent) => { last = event; if (!frame) frame = requestAnimationFrame(apply); };
    const leave = () => { if (tilted) { tilted.style.removeProperty("--tilt-x"); tilted.style.removeProperty("--tilt-y"); tilted = null; } };
    root.addEventListener("pointermove", move, {passive: true});
    root.addEventListener("pointerleave", leave);
    return () => { seen.disconnect(); cancelAnimationFrame(frame); root.removeEventListener("pointermove", move); root.removeEventListener("pointerleave", leave); delete root.dataset.fx; };
  }, []);
  return null;
}
