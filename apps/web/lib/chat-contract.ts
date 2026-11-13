/**
 * NeXify Live-Chat · Client-/Server-Vertrag (frei von Abhängigkeiten).
 *
 * Diese Datei definiert das JSON-Interface zwischen
 *  - dem DC-Prototyp-Chat-Frontend (prototypen/…) und
 *  - apps/web (Next 16)
 * damit beide denselben Endpunkt gleich benutzen können.
 *
 * Bewusst ohne Imports/Secrets: reine Typen + ein paar reine Hilfsfunktionen.
 * Quelle der Modell-/Routing-Wahrheit bleibt config/llm-policy.json (serverseitig).
 */

export type ChatLocale = 'de' | 'nl' | 'fr' | 'en';
export type ChatRole = 'user' | 'assistant';

/** Eine einzelne Chat-Nachricht im Transport (nicht die DB-Zeile). */
export interface ChatMessageDTO {
  role: ChatRole;
  content: string;
  /** ISO-8601, serverseitig gesetzt. Optional im Request. */
  created_at?: string;
}

/** Request-Body an POST /api/chat. */
export interface ChatRequest {
  /** Fortlaufende Konversation; fehlt beim ersten Aufruf (Server legt an). */
  conversationId?: string;
  /** Neue Nutzernachricht (Pflicht). */
  message: string;
  locale?: ChatLocale;
  /** Öffentlicher Seitenkontext, z. B. "/" oder "/leistungen/websites". */
  pagePath?: string;
  /** true = Server-Sent-Events (Default), false = eine JSON-Antwort. */
  stream?: boolean;
  /**
   * Bisheriger Verlauf aus dem Browser. Wird nur verwendet, wenn serverseitig kein Verlauf
   * gespeichert ist, und dort begrenzt und bereinigt (lib/chat-guidance.ts).
   */
  history?: ChatMessageDTO[];
}

/** Strukturiertes Projektbriefing aus dem Gespräch (Schlüssel deutsch, Werte in Besuchersprache). */
export interface BriefingDataDTO {
  vorhaben: string;
  ziel: string;
  ausgangslage: string;
  zielgruppe: string;
  umfang: string[];
  zeitrahmen: string;
  budget: string;
  leistungen: string[];
  offene_punkte: string[];
}

export interface BriefingDTO {
  data: BriefingDataDTO;
  /** Bearbeitbarer Klartext für das Kontaktformular (höchstens 4.000 Zeichen). */
  text: string;
}

/** Positionen eines individuellen Angebots. */
export interface OfferItemDTO {
  position: number;
  description: string;
  quantity: number;
  /** Richtpreis je Einheit in Cent (netto). null = noch offen. */
  unit_cents: number | null;
  /** quantity * unit_cents, null solange unit_cents offen. */
  line_cents: number | null;
}

export type OfferStatus = 'draft' | 'proposed' | 'accepted' | 'ordered' | 'cancelled';

/** Individuelles, aus der Konversation entstandenes Angebot. */
export interface OfferDTO {
  id: string;
  conversationId: string;
  status: OfferStatus;
  title: string;
  summary: string;
  currency: string;
  items: OfferItemDTO[];
  /** Summe der Richtpreise in Cent (netto); null solange unvollständig. */
  est_total_cents: number | null;
  /** ISO-8601 Datum, bis zu dem der Richtpreis gilt. */
  valid_until?: string | null;
  created_at?: string;
}

/** Nicht-gestreamte Antwort von POST /api/chat (stream:false). */
export interface ChatResponse {
  conversationId: string;
  message: ChatMessageDTO;
  /** Gesetzt, sobald das Modell ein Angebot vorschlägt. */
  offer?: OfferDTO;
  /** Gesetzt, sobald aus dem Gespräch ein Briefing entstanden ist. */
  briefing?: BriefingDTO;
  /** Wurde in Supabase persistiert? false = DB (noch) nicht konfiguriert. */
  persisted: boolean;
  /** Wird seit 13.11.2026 nicht mehr an den Browser gesendet (DECISIONS.md D-010). */
  model?: string;
  /** Version der Gesprächsführung (lib/chat-guidance.ts). */
  guidance?: string;
}

/**
 * Streaming-Protokoll (text/event-stream). Jede SSE-"data:"-Zeile ist eine
 * JSON-serialisierte ChatStreamEvent. Reihenfolge: start → delta* → [briefing] → [offer] → done.
 * delta enthält nur bereits geprüften Text; done.message.content ist der vollständige sichtbare Text.
 */
export type ChatStreamEvent =
  | { type: 'start'; conversationId: string; model?: string; persisted: boolean; guidance?: string }
  | { type: 'delta'; text: string }
  | { type: 'briefing'; briefing: BriefingDTO }
  | { type: 'offer'; offer: OfferDTO }
  | { type: 'done'; message: ChatMessageDTO }
  | { type: 'error'; error: string };

export type OrderStatus = 'placed' | 'confirmed' | 'dispatched' | 'fulfilled' | 'cancelled';

/** Kundendaten für die verbindliche Bestellung. */
export interface OrderCustomer {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  note?: string;
}

/** Request an POST /api/offers/{id}/order. */
export interface OrderRequest {
  customer: OrderCustomer;
  /** Muss true sein: der Kunde bestellt das Angebot verbindlich. */
  accept_binding: boolean;
}

/** Verbindliche Bestellung (eingefrorene Angebots-Positionen). */
export interface OrderDTO {
  id: string;
  number: string;
  offerId: string;
  conversationId: string;
  status: OrderStatus;
  customer: OrderCustomer;
  items: OfferItemDTO[];
  total_cents: number | null;
  currency: string;
  /** Wurde die Bestellung an ein externes Fulfilment weitergereicht? */
  dispatched: boolean;
  created_at?: string;
  /** Rechnungsnummer (XRechnung), sobald erzeugt. null = Umfang noch offen. */
  invoice_number?: string | null;
  /** Wurde die Bestätigung/Rechnung per Mail versendet? */
  invoice_mailed?: boolean;
}

/** Fehlerform aller Endpunkte. */
export interface ChatApiError {
  error: string;
  detail?: string;
}

// ------------------------- reine Hilfsfunktionen -------------------------

export const CHAT_SSE_CONTENT_TYPE = 'text/event-stream; charset=utf-8';

/** Eine ChatStreamEvent als SSE-Frame kodieren. */
export function encodeSseEvent(event: ChatStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** Eine SSE-"data:"-Zeile zu einer ChatStreamEvent parsen (null bei Nicht-Event). */
export function parseSseData(line: string): ChatStreamEvent | null {
  const trimmed = line.startsWith('data:') ? line.slice(5).trim() : line.trim();
  if (!trimmed || trimmed === '[DONE]') return null;
  try {
    const value: unknown = JSON.parse(trimmed);
    if (value && typeof value === 'object' && 'type' in value) {
      return value as ChatStreamEvent;
    }
  } catch {
    return null;
  }
  return null;
}

/** Positionssumme berechnen; null sobald eine Einheit offen ist. */
export function offerTotalCents(items: readonly OfferItemDTO[]): number | null {
  let sum = 0;
  for (const item of items) {
    if (item.unit_cents === null) return null;
    sum += item.unit_cents * item.quantity;
  }
  return sum;
}
