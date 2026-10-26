# Concept: Virtuele Web-Presenters & Moderne AI-Alternatieven

Dit document biedt een overzicht van de technologie achter interactieve video-acteurs op websites. Het behandelt de historische basis van bedrijven zoals **YAOTI** ("Your Actor On The Internet" uit München) en slaat de brug naar hoe je een soortgelijke, modernere oplossing vandaag de dag kunt implementeren met AI.

---

## 1. De Historische Basis: YAOTI (Rond 2007-2008)

Destijds was YAOTI pionier in een techniek waarbij echte personen naadloos in de lay-out van een website werden geïntegreerd om de conversie te verhogen. 

### Hoe de techniek destijds werkte:
* **Chroma Keying (Green Screen):** Echte acteurs werden in een studio gefilmd voor een groene achtergrond.
* **Alpha Channel Transparantie:** De groene achtergrond werd digitaal verwijderd en opgeslagen in formaten (zoals Adobe Flash `.FLV`) die transparantie ondersteunden.
* **HTML/JavaScript Overlay:** De video zweefde als een onzichtbare laag over de website-elementen heen, waardoor het leek alsof de acteur over de tekst en knoppen liep.

### Waarom dit destijds verdween:
* **Einde van Adobe Flash:** Browsers stopten met de ondersteuning van Flash vanwege beveiligingsrisico's.
* **Autoplay Blokkades:** Moderne browsers blokkeren video's die automatisch met geluid afspelen.
* **Laadtijd:** Videobestanden maakten websites destijds erg traag.

---

## 2. Moderne Alternatieven (Vandaag de dag)

Als je vandaag de dag een soortgelijke beleving wilt creëren (een menselijk gezicht dat direct communiceert met de websitebezoeker), gebruik je geen dure filmstudio's meer. De techniek is vervangen door **AI-gestuurde video-avatars** en **interactieve video-widgets**.

### Top Platforms voor Moderne AI-Acteurs:
1. **HeyGen:** Ideaal voor het genereren van fotorealistische AI-avatars die scripts voorlezen in tientalle talen. Ze bieden ook interactieve streaming-avatars aan.
2. **Synthesia:** Een enterprise-platform waarmee je tekst direct omzet in video's met levensechte digitale presentatoren.
3. **D-ID:** Bekend om het animeren van stilstaande foto's en het creëren van live pratende AI-agenten voor klantenservice.
4. **VideoAsk (by Typeform):** Een oplossing die gebruikmaakt van *echte* video-opnames (vooraf opgenomen), maar deze interactief maakt via keuzemenu's in de hoek van je website.

---

## 3. Stappenplan: Hoe implementeer je dit vandaag?

Wil je een 'moderne YAOTI' op je website bouwen? Volg dan deze stappen om irritatie bij bezoekers te voorkomen en te voldoen aan moderne webstandards.

### Stap 1: Kies je benadering
* **Optie A (AI Avatar):** Genereer een digitale presentator via platforms zoals HeyGen of Synthesia. Je typt simpelweg de tekst (bijv. *"Welkom op onze website!"*) en de AI genereert de video.
* **Optie B (Echte video met transparantie):** Neem jezelf of een acteur op voor een green screen. Exporteer de video als een **WebM-bestand met alpha-channel** (dit is de moderne, efficiënte opvolger van Flash die transparantie ondersteunt in HTML5).

### Stap 2: Respecteer moderne browserregels (Cruciaal!)
Browsers zoals Chrome en Safari blokkeren video's die direct geluid afspelen. Pas daarom de volgende best-practices toe:
* **Start gedempt (Muted Autoplay):** Laat de avatar automatisch bewegen/praten, maar zet het geluid standaard uit.
* **Visuele Click-to-Unmute:** Plaats een duidelijke tekstballon of knop in beeld: *"Klik hier om mij te horen spreken"*. Zodra de gebruiker klikt, start het geluid.
* **Plaatsing:** In plaats van de avatar over de hele website te laten lopen (wat de navigatie kan verstoren), plaatsen moderne websites deze vaak in een zwevende cirkel of widget rechtsonder in het scherm (vergelijkbaar met een chat-bubble).

### Stap 3: Integratie via HTML5 `<video>`
Gebruik de onderstaande code als basis om een transparante video (bijvoorbeeld een WebM-bestand) zwevend op je website te plaatsen:

```html
<div style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; width: 250px;">
    <!-- De video start automatisch, herhaalt, maar staat verplicht op 'muted' voor browsers -->
    <video autoplay muted loop playsinline id="aiPresenter" style="width: 100%; background: transparent;">
        <source src="jouw-transparante-avatar.webm" type="video/webm">
        Je browser ondersteunt deze videotag niet.
    </video>
    <button onclick="document.getElementById('aiPresenter').muted = false;" style="display: block; margin-top: 5px; width: 100%;">
        🔊 Geluid aanzetten
    </button>
</div>
```

---
*Gegenereerd naar aanleiding van je zoektocht naar het historische 'YAOTI'-concept uit München.*