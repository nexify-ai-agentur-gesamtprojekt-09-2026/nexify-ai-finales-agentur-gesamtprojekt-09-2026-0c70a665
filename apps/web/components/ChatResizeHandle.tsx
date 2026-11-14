"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";

export const CHAT_MIN = 360, CHAT_MAX = 1220, CHAT_STEP = 16;
const WIDTH_KEY = "nx-chat-width";
export const chatMax = () => Math.max(CHAT_MIN, Math.min(CHAT_MAX, Math.floor(window.innerWidth * .62)));
export const clampChat = (w: number) => Math.min(chatMax(), Math.max(CHAT_MIN, Math.round(w)));

export function readChatWidth(): number | null {
  try { const v = Number(sessionStorage.getItem(WIDTH_KEY)); return v > 0 ? clampChat(v) : null; } catch { return null; }
}
export function storeChatWidth(width: number | null) {
  try { if (width === null) sessionStorage.removeItem(WIDTH_KEY); else sessionStorage.setItem(WIDTH_KEY, String(width)); } catch { /* preference only */ }
}
export const chatWidthStyle = (width: number | null, mobile: boolean) => (width && !mobile ? { "--layout-panel-width": width + "px" } as CSSProperties : undefined);

export default function ChatResizeHandle({ width, onChange, label }: { width: number | null; onChange: (w: number | null) => void; label: string }) {
  const [maximum,setMaximum]=useState(CHAT_MIN);
  const handle = useRef<HTMLDivElement>(null), drag = useRef(false);
  const current = () => width ?? Math.round(handle.current?.parentElement?.getBoundingClientRect().width || CHAT_MIN);
  useEffect(() => {
    const refit = () => {setMaximum(chatMax()); if (width && width > chatMax()) onChange(clampChat(width)); };
    refit();
    window.addEventListener("resize", refit);
    return () => window.removeEventListener("resize", refit);
  }, [width, onChange]);
  return <div ref={handle} className="chat-resize-handle" role="separator" aria-orientation="vertical" aria-label={label} tabIndex={0}
    aria-valuemin={CHAT_MIN} aria-valuemax={maximum} aria-valuenow={width ?? CHAT_MIN} data-testid="chat-resize-handle"
    onPointerDown={e => { drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); document.body.classList.add("is-resizing-chat"); }}
    onPointerMove={e => { if (drag.current) onChange(clampChat(window.innerWidth - e.clientX)); }}
    onPointerUp={e => { drag.current = false; e.currentTarget.releasePointerCapture(e.pointerId); document.body.classList.remove("is-resizing-chat"); }}
    onDoubleClick={() => onChange(null)}
    onKeyDown={e => {
      const step = { ArrowLeft: CHAT_STEP, ArrowRight: -CHAT_STEP }[e.key];
      if (step) { e.preventDefault(); onChange(clampChat(current() + step)); }
      else if (e.key === "Home") { e.preventDefault(); onChange(CHAT_MIN); }
      else if (e.key === "End") { e.preventDefault(); onChange(chatMax()); }
      else if (e.key === "Enter") { e.preventDefault(); onChange(null); }
    }} />;
}
