# PlayBox Game Generation Pipeline

## Selected Approach

PlayBox should generate a structured game JSON specification and render it with reusable React + HTML Canvas game systems.

This is the best fit for the current codebase because the app already captures rich tldraw shape data, text labels, a canvas screenshot, and a written description, and the backend already has a Gemini JSON-generation flow with Zod validation and one repair pass. A structured spec keeps Gemini focused on design decisions instead of code generation, makes previews safe because no arbitrary JavaScript is executed, and lets the app debug failed generations as data problems rather than runtime script errors.

## Options Compared

1. Raw HTML/CSS/JavaScript generation: flexible, but unsafe to execute directly, harder to validate, inconsistent across Gemini outputs, and expensive to debug during a hackathon.
2. React component generation: easier to preview in Next.js than raw scripts, but still requires executing generated code and fighting JSX/build/runtime failures.
3. Structured game JSON + reusable React game systems: safest, fastest to generate, easiest to validate with Zod, and reliable for Gemini because the output surface is constrained.
4. React-Konva, Canvas, Phaser, or other renderers: useful as render targets, but they should consume a validated spec rather than be generated per game. For this foundation, plain HTML Canvas is the smallest dependency-free renderer. Phaser can remain available later for richer platform physics.

## Pipeline

1. The frontend exports the tldraw canvas screenshot, simplified shape data, text labels, the user's game description, and an optional selected game type.
2. The backend combines those inputs into a Gemini prompt that treats labels as high-priority gameplay hints.
3. Gemini returns JSON only, constrained to the supported PlayBox game schema.
4. The backend validates the response with Zod. If validation fails, it sends the exact issues back to Gemini for one repair attempt.
5. The frontend receives a validated `GameSpec` and renders it inside a safe canvas preview using reusable systems for controls, movement, collisions, scoring, lives, timer, win/lose, pause, restart, projectiles, particles, and simple animations.
6. The user can regenerate from the same sketch/description or edit the description and generate again.

## Supported First Templates

- `dodge`
- `collect`
- `pong`
- `snake`
- `maze`
- `clicker`
- `simple-shooter`
- `platform-jumper`

The templates share one schema so Gemini only chooses values and entities, not executable behavior.
