# Who Should the Bank Call?

Interactive 10-minute web presentation for the MH6805 Machine Learning group project
*Predicting Bank Marketing Subscriptions* (Li Zeyuan, Tian Shengbo, Yuan Ruoqi).

The deck compares nine models on the UCI Bank Marketing dataset (45,211 records, call duration
excluded) and walks through the results: ranking quality, which model wins on which metric,
how many subscribers a 10% or 20% calling budget reaches, SHAP explanations, and why call
duration cannot be used.

## Open it

Download `dist/who-should-the-bank-call.html` and open it in **Chrome or Edge**. It is a single
self-contained file and works offline (the Geist font loads from Google Fonts when online;
otherwise a system font is used and the titles resize to fit). Other browsers show the glass as
plain frosted panels.

## Keys

| Key | Action |
| --- | --- |
| → / Space / Page Down | Next step or slide |
| ← / Page Up | Back |
| S | Speaker notes with timer (can open in a second window) |
| R | Pair a phone as a remote |
| T | Switch between the white and dark versions |
| F | Full screen |
| Home / End | First / last slide |
| ? | Keyboard help |

Each slide reveals its points step by step; the speaker notes mark where to press →.
Total speaking time is about 10:00 (≈1,100 words).

## Phone remote

Press **R** (or the phone icon in the dock) on the deck and scan the QR code, or open
`/remote` on the phone and type the 6-character code. The phone gets large Back / Next buttons,
a list to jump to any slide, and the line to say at the current step. The deck and phone pass
messages through the public [ntfy.sh](https://ntfy.sh) relay, on a topic named after the random
pairing code; *New code* in the pairing panel starts a fresh one. The remote needs the deployed
site (it cannot reach the relay from inside the Claude preview).

## Edit and rebuild

```
src/template.html   slide markup
src/style.css       design tokens, glass, controls, dock, notes panel
src/slides.css      per-slide layout and motion
src/notes.js        speaker script and per-slide timing
src/app.js          navigation, liquid-glass filters, charts, interactions, remote pairing
src/remote.*        the phone remote page (built to dist/remote.html)
vercel.json         serves the deck at / and the remote at /remote
assets/             SHAP figure layers (from the report's Figure 1)
build.py            inlines everything into dist/who-should-the-bank-call.html
```

```
python3 build.py
```

No dependencies beyond Python 3. The liquid-glass effect follows the SVG displacement-map
approach used by [liquid-glass-react](https://github.com/rdev/liquid-glass-react), implemented
directly in `src/app.js`.
