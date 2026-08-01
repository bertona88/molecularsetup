# Browser adapter integration

`molecular-world.ts` is the only simulation backend the successor page should
instantiate. It never evaluates forces or bonds in JavaScript and has no
heuristic fallback. `molecular-catalog.ts` owns stable engine ids and the
existing tray/thumbnail presentation data.

The pipeline must serve the zero-import artifact at:

```text
/engine/molecularsetup_engine.wasm
```

## Exact `app/page.tsx` changes

1. Import the catalog and adapter near the current React import:

   ```ts
   import {
     ELEMENTS,
     SPECIES,
     type Species,
   } from "@/lib/molecular-catalog";
   import {
     MolecularWorld,
     type BoundaryDraft,
     type BoundaryEdge,
   } from "@/lib/molecular-world";
   ```

2. Delete the inline `ElementKey`, `ElementModel`, `AtomSeed`, `Species`,
   `Atom`, `Bond`, `Boundary`, `Camera`, and `SpawnJob` declarations. Delete
   the inline `ELEMENTS` and `SPECIES` constants. Keep the gesture, drag-ghost,
   and pinch types; they are browser interaction state.

3. Delete `MAX_ATOMS`, `FIXED_STEP`, `GOLDEN_ANGLE`, `roundedRectPath`,
   `createRandom`, and the entire inline `MolecularWorld` class. Keep `clamp`,
   `quantityFromSlider`, `sliderFromQuantity`, and `distance`; the UI gestures
   still use them.

4. Keep the existing SSR-safe construction block unchanged:

   ```ts
   if (worldRef.current === null) {
     worldRef.current = new MolecularWorld();
   }
   ```

   Construction does not fetch or touch `window`. At the start of the canvas
   effect, initialize once and surface rejection through the existing live
   summary:

   ```ts
   void world.initialize().catch(() => {
     setWorldSummary(world.summary());
   });
   ```

   Commands made while this promise is pending are queued in semantic order.
   Do not introduce a JavaScript fallback in the catch branch.

5. Replace `updateSummary`'s direct iteration over `world.atoms` and
   `world.boundaries` with:

   ```ts
   setWorldSummary(world.summary());
   ```

6. Replace the fixed-step accumulator inside the animation frame. The engine
   owns accumulation, the `1/120` step, and the five-step frame cap:

   ```ts
   const elapsedMilliseconds = Math.min(50, now - previous);
   previous = now;
   world.flushSpawnQueue();
   if (world.playing) world.advance(elapsedMilliseconds);
   world.render(context, reducedMotion, draftRef.current);
   summaryClock += elapsedMilliseconds / 1000;
   ```

   Remove the local `accumulator` and every call to `world.step(...)`.

7. Spawning remains the same call shape. The imported species now contains its
   explicit numeric engine id:

   ```ts
   world.enqueueSpawn(species, quantity, point.x, point.y);
   ```

8. Prefer the semantic play command in `togglePlaying`:

   ```ts
   const nextPlaying = !world.playing;
   world.setPlaying(nextPlaying);
   setPlaying(nextPlaying);
   ```

   `world.playing = nextPlaying` also routes through that command, but the
   method makes the backend boundary visible at the call site.

9. Temperature, reset, camera transforms, boundary creation, selection,
   resize, and removal keep their existing call shapes. `addBoundary` now
   returns a boolean rather than a mutable boundary object, which is already
   compatible with `Boolean(created)`.

10. `MoleculeThumbnail` can keep its current implementation. Its atom
    coordinates and `ELEMENTS` radii are presentation-only; the engine owns the
    actual species templates.

11. If `world.status === "error"`, leave the canvas inert and use
    `world.summary()` for the polite live region. Do not keep accepting UI
    actions after a load error: guard handlers or disable their controls. The
    adapter intentionally throws if a semantic command is sent after a fatal
    engine validation/runtime error.

No CSS changes are required. Canvas grid, bond-strain colors, atom colors and
highlights, boundary glow/handles, draft geometry, card previews, quantities,
and responsive layout remain unchanged.
