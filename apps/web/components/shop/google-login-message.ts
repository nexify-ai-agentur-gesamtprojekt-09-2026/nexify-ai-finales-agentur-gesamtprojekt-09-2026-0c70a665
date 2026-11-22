// Meldung nach einer abgelehnten Google-Anmeldung (POST /api/auth/google/session). Das Backend nennt zwei Ablehnungen
// mit eigenem Fehlercode (apps/shop-api/shop/accounts_api.py, Zweig claude/konto-verknuepfung-sicher, PR 196): 409
// `account_exists_unverified` und 403 `google_login_not_allowed`. Nur diese beiden Codes bekommen einen eigenen Text;
// jeder andere Fehler, auch ein heute noch unbekannter Code, behält den bisherigen Text. Die Texte sagen nichts über
// ein Konto, was die Antwort des Backends nicht ohnehin sagt. Nur Deutsch wie die übrigen Texte von AuthForms.
export const GOOGLE_LOGIN_FAILED = "Die Anmeldung mit Google ist fehlgeschlagen.";
export const GOOGLE_LOGIN_MESSAGES: Readonly<Record<string, string>> = {
  account_exists_unverified: "Zu dieser E-Mail-Adresse gibt es bereits ein Konto mit Passwort. Bitte melden Sie sich mit Ihrem Passwort an oder setzen Sie es über „Passwort vergessen?“ zurück. Danach ist die Anmeldung mit Google möglich.",
  google_login_not_allowed: "Für dieses Konto ist die Anmeldung mit Google nicht freigegeben. Bitte melden Sie sich mit Ihrem Passwort an.",
};
export function googleLoginMessage(failure: unknown): string {
  const code = failure && typeof failure === "object" ? (failure as { error?: unknown }).error : undefined;
  return typeof code === "string" && Object.hasOwn(GOOGLE_LOGIN_MESSAGES, code) ? GOOGLE_LOGIN_MESSAGES[code] : GOOGLE_LOGIN_FAILED;
}
