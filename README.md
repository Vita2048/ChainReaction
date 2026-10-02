# Chain Reaction

15-second, 1920x1080, 30 fps Three.js film assembled and rendered with HyperFrames 0.8.111.

## Files
- `renders/chain-reaction-v2.mp4`: revised film with a spring-loaded trigger.
- `scene.js`: geometry, materials, lighting, camera and seekable animation.
- `simulate-tilt.mjs`: fixed-step planar domino model; writes baked angles and sound cues.
- `build.mjs`: assembles `index.html` with embedded scene code and audio tracks.
- `assets/audio`: ElevenLabs sound effects plus a level-adjusted gong WAV.

## Preview
Run the workspace `start.cmd`, or `node node_modules/hyperframes/dist/cli.js preview --background` here.

## Rebuild
Run `node simulate-tilt.mjs`, then `node build.mjs`. Check with `node node_modules/hyperframes/dist/cli.js check`.
Put `tools` on PATH and render with `node node_modules/hyperframes/dist/cli.js render --quality delivery --output renders/chain-reaction.mp4 --workers 1 --fps 30`.

## Motion and audio
The dominoes use a constrained planar model: gravitational torque, contact-triggered impulse transfer and nonpenetration angle limits. The last tile presses a trip paddle that lifts a sear hook from a floor-mounted torsion-spring hammer. Ball travel, spring-hammer rebound and camera movement are choreographed. `node verify-mechanics.mjs` checks the trigger threshold and hammer/plate separation over 3,601 samples plus the exact strike instant. This is a stylized mechanical animation, not a validated rigid-body physics demonstration.

Rolling, clack and gong sounds were generated with ElevenLabs `eleven_text_to_sound_v2`. Clacks are placed at the model's contact events; the revised gong strike occurs at 7.7333 seconds. No music or narration. All visuals are procedural original geometry; no imagery or footage from the reference is reused.

API credentials remain outside the project and are never embedded in output.
