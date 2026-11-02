"""Phase-1 POC: LLM streaming (Claude) + Nano Banana glass motifs with original characters."""
import asyncio, base64, os, sys, time
from pathlib import Path
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent, TextDelta, StreamDone

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
KEY = os.environ["EMERGENT_LLM_KEY"]
MEDIA = Path("/tmp/repo/apps/web/public/media")
OUT = Path("/app/backend/tests/out"); OUT.mkdir(exist_ok=True)

STYLE = ("Photorealistic premium 3D product render, square 1:1. Dark graphite studio (#242826) with soft warm champagne light from above, "
         "polished dark reflective floor, thick mirror-glass objects with rounded edges, crisp bright top edges, subtle lime (#D7FA50) accent glow, "
         "deep soft shadows, high-end Apple-style keynote look. No text, no letters, no logos, no play buttons, no UI words. ")
MOTIFS = {
    "web": ("nex-toucan-121a804c.png", STYLE + "Use EXACTLY the character from the reference image (black toucan mascot with lime wing feathers and glowing chest light), unchanged design. "
            "He stands on the right and points with his wing at a large floating rounded glass website: a clear header bar with navigation dots, a big hero image area, three content cards and a contact form with a lime button. "
            "Beside it a smaller glass smartphone showing the same website. The website parts are clearly readable as shapes."),
    "systeme": ("ai-fly-oracle-avatar-9f705e5b.png", STYLE + "Use EXACTLY the character from the reference image (lime fluffy cloud with black bowler hat and monocle), unchanged design, floating top right. "
                "Below it, three large rounded glass tiles in a row connected by glowing light paths from left to right: tile 1 holds a glass envelope (incoming request), "
                "tile 2 a stack of neatly sorted glass documents with a checklist (organized processing), tile 3 a glass calendar with a lime check mark (next step). Few large, instantly understandable objects."),
    "teileklar": ("nex-toucan-121a804c.png", STYLE + "Use EXACTLY the character from the reference image (black toucan mascot with lime wing feathers), unchanged design, standing at the front left. "
                  "Scene: a clean modern car workshop in the same dark studio look: a transparent glass car on a lift, in front of it a shiny real brake disc and a brake caliper on a glass pedestal, "
                  "a large glass magnifying lens examining the part, and a glass parts box. Precise, calm, trustworthy automotive parts mood."),
}


async def poc_llm():
    chat = LlmChat(api_key=KEY, session_id="poc-llm-%d" % time.time(), system_message="Du bist ein knapper deutscher Assistent.").with_model("anthropic", "claude-sonnet-5-5")
    text = ""
    async for ev in chat.stream_message(UserMessage(text="Antworte nur mit: Integration erfolgreich")):
        if isinstance(ev, TextDelta):
            text += ev.content
        elif isinstance(ev, StreamDone):
            break
    print("LLM turn1:", text.strip()[:80])
    text2 = ""
    async for ev in chat.stream_message(UserMessage(text="Was habe ich dich gerade gebeten zu antworten? Ein Satz.")):
        if isinstance(ev, TextDelta):
            text2 += ev.content
        elif isinstance(ev, StreamDone):
            break
    print("LLM turn2:", text2.strip()[:120])
    assert "erfolgreich" in text.lower()


async def poc_image(name, ref, prompt):
    data = base64.b64encode((MEDIA / "presenters" / ref).read_bytes()).decode()
    chat = LlmChat(api_key=KEY, session_id="poc-img-%s-%d" % (name, time.time()), system_message="You create premium marketing images.")
    chat.with_model("gemini", "gemini-3-pro-image-preview").with_params(modalities=["image", "text"])
    _, images = await chat.send_message_multimodal_response(UserMessage(text=prompt, file_contents=[ImageContent(data)]))
    assert images, "no image for " + name
    path = OUT / ("glass-%s.png" % name)
    path.write_bytes(base64.b64decode(images[0]["data"]))
    print("IMAGE ok:", path, path.stat().st_size)


async def main():
    which = sys.argv[1:] or ["llm", *MOTIFS]
    if "llm" in which:
        await poc_llm()
    await asyncio.gather(*[poc_image(n, *MOTIFS[n]) for n in which if n in MOTIFS])
    print("POC DONE")

asyncio.run(main())
