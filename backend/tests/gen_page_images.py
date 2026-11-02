"""Generates one unique glass image per page (Nano Banana, original characters as reference). Skips existing files."""
import asyncio, base64, os, sys, time
from pathlib import Path
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
KEY = os.environ["EMERGENT_LLM_KEY"]
REF = Path("/root/repo_src/apps/web/public/media/presenters")
OUT = Path("/app/frontend/public/media/gen"); OUT.mkdir(parents=True, exist_ok=True)
NEX, FLY = "nex-toucan-121a804c.png", "ai-fly-oracle-avatar-9f705e5b.png"
STYLE = ("Photorealistic premium 3D render, landscape 4:3. Dark graphite studio (#242826) with soft warm champagne light from above, polished dark reflective floor, "
         "thick mirror-glass objects with rounded edges, crisp bright top edges, subtle lime (#D7FA50) accent glow, deep soft shadows, Apple-keynote quality. "
         "Absolutely no text, no letters, no numbers, no logos, no play buttons. ")
TK = ("Photorealistic premium 3D render, landscape 4:3. TEILEKLAR automotive brand world: dark anthracite showroom with brushed steel, warm white light from above, "
      "turquoise (#6FE3CF) accent light strips, glass shelves, real metallic car parts with precise detail, deep shadows, reflections. No text, no letters, no logos. ")
NEXD = "Use EXACTLY the character from the reference image (black toucan mascot with lime wing feathers, glowing chest light), unchanged design. "
FLYD = "Use EXACTLY the character from the reference image (lime fluffy cloud with black bowler hat and monocle), unchanged design, floating. "

JOBS = {
 "leistungen": (NEX, STYLE + NEXD + "Three tall rounded glass pedestals in a row: on the first a glass website frame, on the second interlocking glass gears, on the third a rising glass bar chart with an arrow. NeX stands beside them presenting."),
 "marke": (NEX, STYLE + NEXD + "NeX holds a fan of glass colour swatches (graphite, lime, turquoise, champagne); behind him a floating open glass brand book and large abstract glass shape blocks representing a visual identity."),
 "websites": (FLY, STYLE + FLYD + "A large rounded glass desktop monitor and a glass tablet showing a clean website layout as shapes (header bar, hero image, cards, contact button in lime). The cloud hovers next to the monitor."),
 "automatisierung": (NEX, STYLE + NEXD + "A glass conveyor belt carrying glass documents through a transparent glass machine with gears inside; at the end a big glass switch with a lime approval light. NeX supervises with a wing on the switch."),
 "ki-agenten": (FLY, STYLE + FLYD + "Several glass speech bubbles and a glass toolbox float around a glass round table; in the middle a glass shield with a lock showing controlled permissions. The cloud coordinates with thin light lines."),
 "marketing": (NEX, STYLE + NEXD + "A glass megaphone emitting soft lime light rings toward a glass landing page panel; next to it a glass funnel with small glowing spheres dropping into a glass bowl. NeX holds the megaphone."),
 "seo": (FLY, STYLE + FLYD + "A large glass magnifying lens hovering over a glass city map tile with a glowing lime location pin and small glass buildings; a glass search bar shape floats above."),
 "zusammenarbeit": (NEX, STYLE + NEXD + "Four broad glass steps rising from left to right, each step lit from inside; on the steps glass objects: a speech bubble, a document, a glass monitor, a gift box with ribbon. NeX walks up the steps."),
 "preise": (NEX, STYLE + NEXD + "A big glass calculator, a neat stack of glass coins and a long glass receipt divided into three clear sections; NeX points at the receipt. Transparent, honest, calm mood."),
 "care": (NEX, STYLE + NEXD + "NeX holds a glass wrench next to a large glass shield and a glass server cabinet with gentle lime status lights; a small glass toolbox stands open on the floor."),
 "referenzen": (FLY, STYLE + FLYD + "A gallery of empty rounded glass display frames on slim pedestals with spotlights, like a museum showcase waiting for approved projects."),
 "kontakt": (NEX, STYLE + NEXD + "A big glass envelope, a glass smartphone and a glass speech bubble float in front of NeX who waves friendly. Inviting, personal mood."),
 "briefing": (FLY, STYLE + FLYD + "A large glass clipboard with a checklist of four glowing rows, a glass pencil and small glass sticky notes; the cloud examines it through its monocle."),
 "termin": (NEX, STYLE + NEXD + "A large glass desk calendar and a glass wall clock with lime hands; a glass coffee cup on a small glass table, NeX sits on a glass stool waiting politely."),
 "produkte": (FLY, STYLE + FLYD + "Four elegant glass product boxes of different shapes on illuminated pedestals in a row, each with a different glowing core (sphere, cube, ring, gear)."),
 "suite": (NEX, STYLE + NEXD + "A glass workspace desk with several floating rounded glass panels around it: a chat panel, a task list panel, a document stack panel and a folder panel. NeX sits at the desk working."),
 "agentic": (NEX, STYLE + NEXD + "NeX operates a delicate glass robotic arm that places a glass document into a glass tray; a glass confirmation button with lime light waits beside it. Controlled, careful execution."),
 "oracle": (FLY, STYLE + FLYD + "The cloud acts as a conductor in the centre; around it five small glass orbs (agents) connected by thin glowing light threads to a central glass hub, orderly and calm."),
 "api": (NEX, STYLE + NEXD + "Thick glass cables with glowing lime cores plug into a stack of rounded glass server blocks; a large glass plug connector in front. NeX holds one cable end."),
 "api-doku": (FLY, STYLE + FLYD + "A floating glass terminal window with abstract glowing lines (no letters), an open glass book and glass curly-brace shapes made of light."),
 "skills": (NEX, STYLE + NEXD + "A tall glass shelf filled with small glass cubes, each containing a different tiny glass tool (pen, wrench, chart, magnifier, envelope, gear). NeX takes one cube from the shelf."),
 "verbindungen": (FLY, STYLE + FLYD + "Large glass puzzle pieces clicking together, each containing a different glowing app-like shape; light flows between the joined pieces."),
 "hilfe": (NEX, STYLE + NEXD + "A glass lifebuoy ring leaning on a glass status pillar with three soft lights (green lit, others dim) and a glass question-mark-free help book; NeX holds a glass lantern."),
 "anmelden": (FLY, STYLE + FLYD + "A tall rounded glass doorway glowing softly from inside, a glass key floating in front of it; calm, secure, welcoming entrance."),
 "dashboard": (NEX, STYLE + NEXD + "A curved glass control desk with three floating glass panels showing simple abstract charts and progress rings; NeX looks at them content."),
 "notfound": (NEX, STYLE + NEXD + "NeX stands at a glass signpost whose arrows point in different directions, scratching his head with one wing; humorous but elegant."),
 "tk-hero": (NEX, TK + NEXD + "A large shop window display (Schaufenster) with illuminated glass shelves holding real car parts: brake discs, oil filters, spark plugs, a headlight, wiper blades. NeX stands in front of the window, proud."),
 "tk-fahrzeug": (NEX, TK + NEXD + "A sleek transparent glass car silhouette on a turntable; in front a glass vehicle registration card shape and a glass tablet; NeX points at the car's wheel area."),
 "tk-werkstatt": (NEX, TK + NEXD + "A clean modern car workshop: a real car on a two-post lift, tool wall, rolling tool chest; NeX holds a wrench in front. Professional and trustworthy."),
 "tk-partner": (FLY, TK + FLYD + "Two glass building models (a small car workshop and a parts warehouse) connected by a glowing turquoise bridge of light; the cloud floats above them."),
 "tk-support": (NEX, TK + NEXD + "A glass headset, a cardboard parcel with a turquoise ribbon and a glass speech bubble on a counter; NeX behind the counter ready to help."),
 "tk-cat-bremsen": (None, TK + "Close-up product hero: a real drilled brake disc with red brake caliper on a glass pedestal."),
 "tk-cat-filter": (None, TK + "Close-up product hero: an oil filter, air filter and cabin filter arranged on a glass pedestal."),
 "tk-cat-beleuchtung": (None, TK + "Close-up product hero: a modern LED car headlight unit and bulbs glowing softly on a glass pedestal."),
 "tk-cat-motor": (None, TK + "Close-up product hero: spark plugs, timing belt kit and a water pump arranged on a glass pedestal."),
 "tk-cat-fahrwerk": (None, TK + "Close-up product hero: a shock absorber with coil spring and a control arm on a glass pedestal."),
 "tk-cat-zubehoer": (None, TK + "Close-up product hero: car floor mats, phone holder, roof box model and seat covers neatly arranged on glass shelves."),
 "tk-cat-pflege": (None, TK + "Close-up product hero: car care bottles, polish, microfiber cloths and a sponge on a glass pedestal, water droplets."),
 "tk-cat-werkzeug": (None, TK + "Close-up product hero: a torque wrench, socket set and a car jack on a glass pedestal."),
 "tk-cat-motorrad": (None, TK + "Close-up product hero: a motorcycle helmet, gloves and a motorcycle chain sprocket on a glass pedestal."),
 "tk-cat-elektrik": (None, TK + "Close-up product hero: a car battery, jump cables and a dashcam on a glass pedestal."),
}


async def one(sem, name, ref, prompt):
    path = OUT / (name + ".png")
    if path.exists():
        return
    async with sem:
        for attempt in range(3):
            try:
                chat = LlmChat(api_key=KEY, session_id="gen-%s-%d" % (name, time.time()), system_message="You create premium marketing images.")
                chat.with_model("gemini", "gemini-3-pro-image-preview").with_params(modalities=["image", "text"])
                if ref:
                    prompt = prompt + " Composition: the character is placed in the right third of the frame, body turned and eyes clearly looking to the LEFT toward the main objects and the left image edge (where the page headline sits). Natural, attentive gaze; the character never looks away from the scene."
                files = [ImageContent(base64.b64encode((REF / ref).read_bytes()).decode())] if ref else None
                _, images = await chat.send_message_multimodal_response(UserMessage(text=prompt, file_contents=files) if files else UserMessage(text=prompt))
                if images:
                    path.write_bytes(base64.b64decode(images[0]["data"]))
                    print("ok", name, flush=True)
                    return
            except Exception as e:  # noqa
                print("retry", name, type(e).__name__, str(e)[:120], flush=True)
        print("FAILED", name, flush=True)


async def main():
    sem = asyncio.Semaphore(6)
    names = sys.argv[1:] or list(JOBS)
    await asyncio.gather(*[one(sem, n, *JOBS[n]) for n in names])
    print("ALL DONE", flush=True)

asyncio.run(main())
