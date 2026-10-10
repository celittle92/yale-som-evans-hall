# Yale SOM Virtual: Evans Hall, Floor 2

A first-person walk-through of the 2nd floor of Edward P. Evans Hall (Yale School of Management), built with React, Vite, three.js, and @react-three/fiber.

It includes the blue classroom drums you can walk into, the curvy glass cloister around the courtyard, Ross Library on the west side, the Beinecke Terrace Room and its outdoor terrace on the east side, the small glass meeting rooms, and paintings above the stairwells.

**Walk it in your browser:** https://celittle92.github.io/yale-som-evans-hall/

## Credits

The 3D world — the floor plan, the meshes, the procedural textures, the Labubus, the Hogwarts
faculty, Handsome Dan — is the work of [@zlisto](https://github.com/zlisto), built for
MGT 409: AI Foundations for Managers. Original repo:
[zlisto/yale_som_virtual](https://github.com/zlisto/yale_som_virtual).

This fork is my in-class version for Lecture 4. The only change so far is the interface palette:
the original's black-and-pink chrome is now a "warm editorial" theme (cream ground, deep ink type,
a single plum accent) matching the house style I use across my coursework. That lives in
`src/styles.css` and the `C` palette in `src/Minimap.jsx`; the 3D world is untouched.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:5173 and click **Click to walk in**.

### The professor agents (backend)

Walk into room 2400 and you can talk to Prof. Zaman. That needs the Python backend running
alongside Vite — the dev server proxies `/api` to it on port 8000.

```bash
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
cd backend && .venv/bin/uvicorn main:app --port 8000 --reload
```

It reads `PORTKEY_API_KEY` from the workspace-root `.env` and the model from `OPENAI_MODEL`
(default `gpt-6-luna`). `GET /api/health` reports the model name and never a key.

Each professor is a PydanticAI agent. Its system prompt is assembled at runtime from
`backend/prompts/professor_base.md`, that professor's own persona file in the same folder, and
their course record read live out of `data/yale_som.db` — no course facts are hard-coded. Every
agent also gets two tools, `search_catalog` and `course_info`, so it can answer questions about
any other course by querying the catalog instead of guessing. The database is opened read-only,
PhD rows are filtered out, and `faculty_1_email` is never selected.

**Keyboard + mouse** (works like a PC shooter):

| Key | Action |
| --- | --- |
| W A S D / arrows | walk |
| Mouse | look |
| Shift | sprint |
| Space | jump |
| C | crouch |
| M | toggle map |
| Esc | pause |

**Phone / tablet:** tap **Tap to walk in**. The left-thumb joystick walks (push it all the way to sprint), dragging anywhere else looks around, and there are on-screen jump and pause buttons. On a laptop, click **Use on-screen joystick** to try the phone controls. WASD still works in that mode.

## How it's built

- `src/layout.js`: the floor plan in meters (+x east, -z north). It holds the drums, library, Beinecke, stairs, meeting rooms, wall colliders, and room lookup. Each classroom faces the courtyard, with the whiteboard and podium on the inner side and stadium-seating rows (32 cm risers) stepping up toward the outer wall; its two doors are at the front corners. You climb the center-aisle steps one riser at a time.
- `src/World.jsx`: all the meshes. Walls use instanced boxes and the drums use partial cylinders.
- `src/textures.js`: procedural canvas textures (carpet, navy drum glass, wood slats, mural, signs, stairwell paintings).
- `src/Player.jsx`: walking (pointer lock or touch), jump/crouch, circle-vs-wall collision.
- `src/TouchControls.jsx`: on-screen joystick, drag-to-look, jump and pause buttons.
- `src/Minimap.jsx`: the cream-and-plum floorplan map in the corner.
- `src/Labubu.jsx`: a customizable Labubu built from primitives: `fur`, `expression` (grin / happy / surprised / sleepy / mischief), `shirt` ('yale', 'stripes', or any color), `pants`, `overalls`, `hat`, `sitting`, `anim`.
- `src/LabubuParty.jsx`: the crew playing in the courtyard plus Labubus in meetings in every glass room.
- `src/slides.js`: lecture slides for eight Fall 2026 MBA courses (MGT 409, 404, 403, 887, 402, 538, 800, 541) on the classroom screens and meeting-room monitors.
- `src/LabubuCrowd.jsx`: 30 seated Labubu students per classroom, drawn with shared instanced meshes.
- `src/Professor.jsx` + `src/Faculty.jsx`: cartoon Hogwarts professors teaching each class (Dumbledore, McGonagall, Trelawney, Slughorn, Snape, Lockhart, Moody, Flitwick), plus Hagrid in the courtyard.
- `src/HandsomeDan.jsx`: Handsome Dan touring a loop of 1000 randomly chosen classrooms (blue dot on the map).

The layout is estimated from the wayfinding plan posted on the floor, so room sizes are approximate. The Stair G painting comes from a photo; the other stairwell paintings are made up.

Made for MGT 409: AI Foundations for Managers, Lecture 13.
