# Local project preparation in the existing public chat

The accepted scope is a contextual start, three project questions, an editable
overview and clear next steps inside the existing shared Vite/Next chat. It adds
no chat engine, execution queue, account, telemetry or provider capability.

## State and user actions

- Two prompts refer to the actual public page and prepare the existing composer.
  They never submit automatically and cannot overwrite an unsent question.
- The three required answers are goal, current situation and next step. Limits
  are 400/800/400 characters. The overview preserves the visitor's words as text;
  it does not infer prices, legal terms, vehicle fitment or a booked appointment.
- State belongs to the already mounted Workspace and survives internal
  navigation, chat collapse and mode changes. The originating page stays visible
  separately from the current page. Reload clears this local draft. No new
  localStorage/sessionStorage key or server persistence is introduced. Existing
  locale and presenter-guide preferences retain their separate behavior.
- Editing, going back and cancelling reset preserve entries. Reset requires a
  separate confirmation and clears only this project draft, not unsent chat text
  or an existing quote form. Queued submits cannot skip a required question.
- Mail preparation uses only the existing public `mail@nexifyai.cloud` contact.
  A mailto link opens the visitor's own mail program with escaped subject/body;
  it does not send mail. The complete selectable text remains available.
- If the existing server-described quote capability is available, the overview
  can fill an empty existing quote form. Existing title/details are preserved.
  Opening that form makes no API write. Only the subsequent explicit action
  invokes the existing CSRF/idempotency-guarded PDF path. A quote preparation is
  not contract acceptance, email delivery or an external business action.
- Without the capability, the component exposes the honest unavailable state
  and contact preparation. No client checkbox grants an operation or tenant role.

The existing SDK composer retains its transport and truthful no-live-AI mode.
It reads the submitted DOM value at the action boundary and guards synchronous
double submission. The original draft is restored on an intercepted failure.
Focus changes happen at DOM commit, avoiding delayed focus stealing after reset.

## Local verification

`node --test apps/site/tests/project-brief.test.mjs` validates independent empty
state, required bounded answers, literal user text, fixed-recipient URL encoding
and complete DE/NL/FR labels. The browser driver
`apps/site/tests/browser-project-brief.mjs` builds the selected renderer freshly
with a minimal credential-free environment and binds served artifact hashes.

Its full matrix is 18 cases per renderer: 320/1280 pixels, DE/NL/FR and three
synthetic session states (unavailable, denied, quote-capable). It checks actual
navigation/back, collapse/resume, edit/reset/cancel, quote input protection,
keyboard focus, double submissions, exact request text and retained failed input,
reload boundaries and absence of new storage or external requests. Requests are
intercepted; these are not actual provider, mail or production acceptance tests.
`BRIEF_CASE` selects one explicitly partial diagnosis case in a separate local
folder; the stored-proof verifier requires the complete matrix.

Daily autonomous feature changes are not enabled by this increment. Any later
automation must use the existing owner/review/release contracts and explicit
cost/security boundaries; this local preparation is not a self-updating daemon.

The legal-source refresh also reproduced a delayed quote-handover focus race.
Quote-title focus now occurs in the committed layout effect, never a later
animation frame. Browser regression holds old frame callbacks, edits details,
flushes callbacks and types a suffix; title/details must remain independent.
