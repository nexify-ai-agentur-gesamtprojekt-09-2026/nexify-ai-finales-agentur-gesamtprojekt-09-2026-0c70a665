/** Public presentation data only; this module never reads server configuration. */
export type Localized = { de: string; nl: string; fr: string; en: string };
export type ContactChannel = { type: "email"; address: string; label: Localized };
export type PublicPage = {
  id: string; path: string; title: string; purpose: string; sourceId: string; role: string;
  site_context: string; localizedTitle: Localized; localizedSummary: Localized;
  sections: { id: string; heading: Localized; body: Localized }[];
  actions: { type: string; target_id?: string; chat_intent?: "quote" | "booking" | "marketing"; label: Localized }[];
  navigationContexts: string[]; contact_channels?: ContactChannel[];
};
