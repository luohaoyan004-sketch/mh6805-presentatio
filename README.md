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
| T | Switch between the white and dark versions |
| F | Full screen |
| Home / End | First / last slide |
| ? | Keyboard help |

Each slide reveals its points step by step; the speaker notes mark where to press →.
Total speaking time is about 10:00 (≈1,100 words).

## Edit and rebuild

```
src/template.html   slide markup
src/style.css       design tokens, glass, controls, dock, notes panel
src/slides.css      per-slide layout and motion
src/notes.js        speaker script and per-slide timing
src/app.js          navigation, liquid-glass filters, charts and interactions
assets/             SHAP figure layers (from the report's Figure 1)
build.py            inlines everything into dist/who-should-the-bank-call.html
```

```
python3 build.py
```

No dependencies beyond Python 3. The liquid-glass effect follows the SVG displacement-map
approach used by [liquid-glass-react](https://github.com/rdev/liquid-glass-react), implemented
directly in `src/app.js`.
