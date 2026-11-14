/**
 * Übergabestelle (Port) an den Agentenkern.
 *
 * Reversible Zielentscheidung: Eingehende Trigger-Ereignisse werden mandantengebunden im Ereignisspeicher abgelegt und
 * über /api/suite/composio/events lesbar gemacht. ZUSÄTZLICH ruft der Webhook nach dem Ablegen diese Schnittstelle auf.
 * Später wird hier `packages/agent_core` (NeX Agentic) angebunden, indem eine Implementierung von `AgentEreignisPort`
 * per `setAgentPort` gesetzt wird. HEUTE ist nichts an einen laufenden Kern verdrahtet: die Standardimplementierung tut nichts.
 * Kein hartes Ziel: wer die Ereignisse konsumiert, ist austauschbar.
 *
 * Das übergebene Ereignis trägt Mandant und Nutzer aus der Suite-Verbindung (nie aus dem Webhook-Inhalt) und nur eine
 * kurze Zusammenfassung (Trigger-Slug, Trigger-Kennung), keine Nutzdaten, keine Geheimnisse.
 */
import type { StoredEvent } from './composio-store.ts';

export interface AgentEreignisPort {
  /** Wird genau einmal je neuem, abgelegtem Trigger-Ereignis aufgerufen (Idempotenz liegt im Webhook). */
  ereignisAngelegt(event: StoredEvent): Promise<void>;
}

/** No-Op: verwirft das Ereignis, protokolliert nichts. */
export const noopAgentPort: AgentEreignisPort = {
  async ereignisAngelegt() {},
};

let current: AgentEreignisPort = noopAgentPort;
export function getAgentPort(): AgentEreignisPort {
  return current;
}
export function setAgentPort(port: AgentEreignisPort | null): void {
  current = port ?? noopAgentPort;
}
