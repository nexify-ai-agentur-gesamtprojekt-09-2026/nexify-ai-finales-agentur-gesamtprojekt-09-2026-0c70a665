# Phase 1c (bounded package) Requirement: Design alignment for figures, right chat and video controls

Version: phase-1c-a
Source: Pascal's design brief via coordinator, 31.10.2026. Visual evidence: Cloud Chrome 1180×757, 13:31–13:32 UTC; mobile and Safari not yet checked.
Scope: frontend only, handled by the existing frontend owner (web_app_dev). The package stays bounded: first a file scope plus a credit estimate, then a patch only after approval. No paid media regeneration, no push, no deployment, no backend files.

## Functional requirements

P1 Figures / video background
- REQ-201 [always] The system shall show the hero figures over one shared hero background, with no second scene surface and no visible dark rectangle, both while the video plays and while it is paused.
- REQ-202 [always] The system shall remove the burned-in background in the material or compositing itself. Hiding it with border:none, blend modes or masks over the box is not allowed.
- REQ-203 [always] The system shall keep the original media files unchanged.
- REQ-204 [unwanted] If alpha source material or authorised tooling is missing, then the system shall show the existing cleanly cut-out poster as an honest fallback.
- REQ-205 [always] The system shall place no lines or overlays in front of the figures.
- REQ-206 [always] The system shall keep sound after interaction, pause, subtitles and reduced-motion behaviour.

P1 Right chat
- REQ-207 [always] The system shall render the chat with distinguishable graphite layers from the existing tokens: canvas #080A0F, then panel, conversation and composer.
- REQ-208 [always] The system shall give the chat a subtle lateral contact shadow plus a light edge instead of thin outlines, a downward shadow or a neon frame.
- REQ-209 [always] The system shall show a compact chat header with an honest connection status.
- REQ-210 [always] The system shall place the conversation starters directly below the introduction, without a large gap.
- REQ-211 [always] The system shall anchor the composer at the bottom of the chat where it stays reachable.
- REQ-212 [always] The system shall use Lime #C0EE38 for the primary action and Cyan #38BDF8 sparingly for focus.
- REQ-213 [always] The system shall not draw an extra box around each text block.
- REQ-214 [always] The system shall keep mouse/keyboard resize and conversation scroll working.
- REQ-215 [state] While on mobile, the system shall show the chat as a centred panel or drawer with safe area, a visible close control and a reachable input when the on-screen keyboard is open.
- REQ-216 [state] While the chat is open, the system shall hide the floating launcher (no duplicate launcher).

P2 Video controls
- REQ-217 [always] The system shall size the scene container to the media (no empty player area around a 427 px high video).
- REQ-218 [always] The system shall show a compact control row, with the transcript optional.
- REQ-219 [state] While the duration is unknown, the system shall show no total duration and no seek bar. It shows an honest loading or fallback state instead of "0:11 / 0:00".

Keep
- REQ-220 [always] The system shall keep Inter, the current Lime, and chat buttons of at least 48 px.
- REQ-221 [always] The system shall align spacing to the 8 px grid in all touched components.

## Quality requirements
```
Q-201 Tag: Media.Seamless
      Scale: visible rectangular tone edge / halo / flicker at hair or feathers
      Meter: paused + playing frames on light and dark test backgrounds, Chrome; Safari/WebKit only if actually run
      Must: 0   Plan: 0
Q-202 Tag: Layout.Responsive
      Scale: horizontal overflow or clipped actions at 1440/1180/768/390/320
      Meter: before/after screenshots: start page, chat open/closed, shop, partner
      Must: 0   Plan: 0
Q-203 Tag: A11y.Targets
      Scale: interactive targets < 48 px; missing visible focus; contrast < 4.5:1 for text
      Meter: browser measurement on touched components
      Must: 0   Plan: 0
Q-204 Tag: Chat.Function
      Scale: broken input/scroll/resize/close/back
      Meter: manual browser run per breakpoint
      Must: 0   Plan: 0
```
