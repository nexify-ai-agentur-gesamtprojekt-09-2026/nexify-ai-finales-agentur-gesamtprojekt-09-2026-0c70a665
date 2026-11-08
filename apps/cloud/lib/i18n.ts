import interfaceCopy from "../../../config/assistant-interface-copy.json" with { type: "json" };

// Canonical UI dictionary is shared with the gateway speech projection.
export const translations = interfaceCopy;
export type Locale = keyof typeof translations;
export type Translation = typeof translations.de;
