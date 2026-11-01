/** Tree-shakeable locale bundle, loaded only inside the lazy Clerk boundary so
 * the four needed locales stay off the public critical path (no full-package
 * namespace import, which would defeat tree-shaking). */
import {deDE,nlNL,frFR,enUS} from "@clerk/localizations";
export const localizations={de:deDE,nl:nlNL,fr:frFR,en:enUS};
