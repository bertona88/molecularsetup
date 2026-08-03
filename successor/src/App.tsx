import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { ELEMENTS, INGREDIENTS, type Ingredient } from "@/lib/molecular-catalog";
import {
  MolecularWorld,
  type EngineLoadStatus,
  type ExperimentKey,
} from "@/lib/molecular-world";

type CanvasGesture =
  | { type: "pan"; pointerId: number; lastX: number; lastY: number }
  | { type: "atom"; pointerId: number; atomId: number }
  | { type: "piston"; pointerId: number };

type IngredientDrag = {
  pointerId: number;
  ingredient: Ingredient;
  startX: number;
  startY: number;
  x: number;
  y: number;
  active: boolean;
  streamed: boolean;
};

type PinchGesture = {
  startDistance: number;
  startZoom: number;
  anchorX: number;
  anchorY: number;
};

const EXPERIMENTS: readonly {
  id: ExperimentKey;
  label: string;
  cue: string;
  temperature: number;
}[] = [
  { id: "makeBond", label: "Make a bond", cue: "Let two atoms meet", temperature: 0 },
  { id: "breakBond", label: "Break a bond", cue: "Pull it apart or turn up the heat", temperature: 36 },
  { id: "ignite", label: "Ignite", cue: "Stable until a spark arrives", temperature: 26 },
  { id: "freePlay", label: "Free play", cue: "Mix, heat, spark, drag, compress", temperature: 38 },
];

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const distance = (x1: number, y1: number, x2: number, y2: number) =>
  Math.hypot(x2 - x1, y2 - y1);

const presentationQuality = (
  devicePixelRatio: number,
  atomCount: number,
  smoothedRenderMilliseconds: number,
) => {
  let pixelRatioCap = atomCount >= 160 ? 1 : atomCount >= 30 ? 1.25 : 1.5;
  if (smoothedRenderMilliseconds > 12) pixelRatioCap = Math.min(pixelRatioCap, 1.25);
  if (smoothedRenderMilliseconds > 18) pixelRatioCap = 1;
  const crowdedFrameDivisor = atomCount >= 600 ? 3 : atomCount >= 96 ? 2 : 1;
  return {
    pixelRatio: Math.max(0.75, Math.min(devicePixelRatio || 1, pixelRatioCap)),
    frameDivisor: Math.max(
      crowdedFrameDivisor,
      smoothedRenderMilliseconds > 18 && atomCount >= 24 ? 2 : 1,
    ),
  };
};

function IngredientThumbnail({ ingredient }: { ingredient: Ingredient }) {
  const points = ingredient.atoms.map((atom) => ({
    ...atom,
    x: atom.x * 1.12 + 36,
    y: atom.y * 1.12 + 30,
  }));
  return (
    <span className="ingredient-visual" aria-hidden="true">
      <svg viewBox="0 0 72 60" role="presentation">
        {ingredient.bonds.flatMap(([a, b, order], bondIndex) => {
          const dx = points[b].x - points[a].x;
          const dy = points[b].y - points[a].y;
          const length = Math.max(1, Math.hypot(dx, dy));
          const nx = (-dy / length) * 1.8;
          const ny = (dx / length) * 1.8;
          const lanes = order === 2 ? [-1, 1] : [0];
          return lanes.map((lane) => (
            <line
              key={`${a}-${b}-${bondIndex}-${lane}`}
              x1={points[a].x + nx * lane}
              y1={points[a].y + ny * lane}
              x2={points[b].x + nx * lane}
              y2={points[b].y + ny * lane}
              className="ingredient-bond"
            />
          ));
        })}
        {points.map((atom, index) => (
          <g key={`${atom.element}-${index}`}>
            <circle
              cx={atom.x}
              cy={atom.y}
              r={Math.max(6.4, ELEMENTS[atom.element].radius * 0.78)}
              fill={ELEMENTS[atom.element].rim}
            />
            <circle
              cx={atom.x}
              cy={atom.y}
              r={Math.max(5.2, ELEMENTS[atom.element].radius * 0.66)}
              fill={ELEMENTS[atom.element].color}
            />
            <circle cx={atom.x - 2} cy={atom.y - 2.2} r="1.55" fill="rgba(255,255,255,.55)" />
          </g>
        ))}
      </svg>
      <span>{ingredient.formula}</span>
    </span>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m13.4 2-7 11h5.1L10.7 22l7-12h-5.1l.8-8Z" />
      <path d="m5 5-1.8-1.8M19 5l1.8-1.8M4 18l-2 1M20 18l2 1" />
    </svg>
  );
}

function PausePlayIcon({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {playing ? (
        <>
          <path d="M8 6v12M16 6v12" />
        </>
      ) : (
        <path d="m9 6 9 6-9 6Z" />
      )}
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.2 8.1A7 7 0 1 1 5 14" />
      <path d="M4 5v5h5" />
    </svg>
  );
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<MolecularWorld | null>(null);
  const gestureRef = useRef<CanvasGesture | null>(null);
  const pinchRef = useRef<PinchGesture | null>(null);
  const activePointersRef = useRef(new Map<number, { clientX: number; clientY: number }>());
  const ingredientDragRef = useRef<IngredientDrag | null>(null);
  const holdDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationRef = useRef<number | null>(null);
  const [engineStatus, setEngineStatus] = useState<EngineLoadStatus>("idle");
  const [experiment, setExperiment] = useState<ExperimentKey>("makeBond");
  const [playing, setPlaying] = useState(true);
  const [temperature, setTemperature] = useState(0);
  const [sparkArmed, setSparkArmed] = useState(false);
  const [ingredientDrag, setIngredientDrag] = useState<IngredientDrag | null>(null);
  const [worldSummary, setWorldSummary] = useState("Molecular engine loading.");

  if (worldRef.current === null) worldRef.current = new MolecularWorld();

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const updateSummary = useCallback(() => {
    const world = worldRef.current;
    if (world) setWorldSummary(world.summary());
  }, []);

  const issueWorldCommand = useCallback(
    <Result,>(command: (world: MolecularWorld) => Result): Result | undefined => {
      const world = worldRef.current;
      if (!world || world.status === "error") return undefined;
      try {
        return command(world);
      } catch {
        setEngineStatus("error");
        setWorldSummary(world.summary());
        return undefined;
      }
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const world = worldRef.current;
    if (!canvas || !world) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    setEngineStatus("loading");
    void world
      .initialize()
      .then(() => {
        setEngineStatus("ready");
        setWorldSummary(world.summary());
      })
      .catch(() => {
        setEngineStatus("error");
        setWorldSummary(world.summary());
      });

    let smoothedRenderMilliseconds = 0;
    let appliedPixelRatio = 0;
    let lastResolutionChange = -Infinity;
    const resize = (pixelRatio?: number) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = pixelRatio ?? presentationQuality(
        window.devicePixelRatio || 1,
        world.atomCount,
        smoothedRenderMilliseconds,
      ).pixelRatio;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      world.setViewport(rect.width, rect.height);
      appliedPixelRatio = dpr;
    };
    resize();
    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(canvas);

    let previous = performance.now();
    let summaryClock = 0;
    let frameIndex = 0;
    const frame = (now: number) => {
      const elapsedMilliseconds = Math.min(50, now - previous);
      previous = now;
      if (world.playing) issueWorldCommand((activeWorld) => activeWorld.advance(elapsedMilliseconds));
      const quality = presentationQuality(
        window.devicePixelRatio || 1,
        world.atomCount,
        smoothedRenderMilliseconds,
      );
      if (
        Math.abs(quality.pixelRatio - appliedPixelRatio) >= 0.2 &&
        now - lastResolutionChange >= 1_200
      ) {
        resize(quality.pixelRatio);
        lastResolutionChange = now;
      }
      const interacting = activePointersRef.current.size > 0 || ingredientDragRef.current !== null;
      if (interacting || frameIndex % quality.frameDivisor === 0) {
        const renderStart = performance.now();
        world.render(context, reducedMotion);
        const renderMilliseconds = performance.now() - renderStart;
        smoothedRenderMilliseconds = smoothedRenderMilliseconds === 0
          ? renderMilliseconds
          : smoothedRenderMilliseconds * 0.92 + renderMilliseconds * 0.08;
      }
      frameIndex += 1;
      summaryClock += elapsedMilliseconds;
      if (summaryClock >= 700) {
        updateSummary();
        summaryClock = 0;
      }
      animationRef.current = requestAnimationFrame(frame);
    };
    animationRef.current = requestAnimationFrame(frame);

    return () => {
      resizeObserver.disconnect();
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    };
  }, [issueWorldCommand, reducedMotion, updateSummary]);

  useEffect(
    () => () => {
      if (holdDelayRef.current) clearTimeout(holdDelayRef.current);
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    },
    [],
  );

  const canvasWorldPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const world = worldRef.current;
    if (!canvas || !world) return null;
    const rect = canvas.getBoundingClientRect();
    return world.screenToWorld(clientX - rect.left, clientY - rect.top);
  }, []);

  const pointIsOnCanvas = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }, []);

  const spawnIngredient = useCallback(
    (ingredient: Ingredient, clientX?: number, clientY?: number) => {
      const canvas = canvasRef.current;
      const world = worldRef.current;
      if (!canvas || !world) return false;
      const rect = canvas.getBoundingClientRect();
      const point =
        clientX !== undefined && clientY !== undefined && pointIsOnCanvas(clientX, clientY)
          ? world.screenToWorld(clientX - rect.left, clientY - rect.top)
          : world.screenToWorld(rect.width * 0.53, rect.height * 0.52);
      return Boolean(issueWorldCommand((activeWorld) => activeWorld.spawnIngredient(ingredient, point.x, point.y)));
    },
    [issueWorldCommand, pointIsOnCanvas],
  );

  const stopIngredientStream = useCallback(() => {
    if (holdDelayRef.current) clearTimeout(holdDelayRef.current);
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    holdDelayRef.current = null;
    streamIntervalRef.current = null;
  }, []);

  const streamCurrentIngredient = useCallback(() => {
    const current = ingredientDragRef.current;
    if (!current) return;
    const spawned = spawnIngredient(current.ingredient, current.x, current.y);
    if (!spawned) return;
    const next = { ...current, streamed: true };
    ingredientDragRef.current = next;
    setIngredientDrag(next);
  }, [spawnIngredient]);

  const beginIngredientDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    ingredient: Ingredient,
  ) => {
    if (engineStatus === "error" || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const next: IngredientDrag = {
      pointerId: event.pointerId,
      ingredient,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      active: false,
      streamed: false,
    };
    ingredientDragRef.current = next;
    setIngredientDrag(next);
    stopIngredientStream();
    holdDelayRef.current = setTimeout(() => {
      streamCurrentIngredient();
      streamIntervalRef.current = setInterval(streamCurrentIngredient, 145);
    }, 430);
  };

  const moveIngredientDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    ingredient: Ingredient,
  ) => {
    const current = ingredientDragRef.current;
    if (!current || current.pointerId !== event.pointerId || current.ingredient.id !== ingredient.id) return;
    const next = {
      ...current,
      x: event.clientX,
      y: event.clientY,
      active:
        current.active ||
        distance(current.startX, current.startY, event.clientX, event.clientY) > 7,
    };
    ingredientDragRef.current = next;
    setIngredientDrag(next);
  };

  const finishIngredientDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    ingredient: Ingredient,
    commit: boolean,
  ) => {
    const current = ingredientDragRef.current;
    stopIngredientStream();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (
      commit &&
      current &&
      current.pointerId === event.pointerId &&
      current.ingredient.id === ingredient.id &&
      !current.streamed
    ) {
      if (!current.active || pointIsOnCanvas(event.clientX, event.clientY)) {
        spawnIngredient(ingredient, event.clientX, event.clientY);
      }
    }
    ingredientDragRef.current = null;
    setIngredientDrag(null);
  };

  const beginPinch = (canvas: HTMLCanvasElement, world: MolecularWorld) => {
    const pointers = Array.from(activePointersRef.current.values()).slice(0, 2);
    if (pointers.length < 2) return;
    const rect = canvas.getBoundingClientRect();
    const centerX = (pointers[0].clientX + pointers[1].clientX) / 2 - rect.left;
    const centerY = (pointers[0].clientY + pointers[1].clientY) / 2 - rect.top;
    const anchor = world.screenToWorld(centerX, centerY);
    const gesture = gestureRef.current;
    if (gesture?.type === "atom") issueWorldCommand((activeWorld) => activeWorld.releaseAtom(gesture.atomId));
    gestureRef.current = null;
    pinchRef.current = {
      startDistance: Math.max(
        1,
        distance(
          pointers[0].clientX,
          pointers[0].clientY,
          pointers[1].clientX,
          pointers[1].clientY,
        ),
      ),
      startZoom: world.camera.zoom,
      anchorX: anchor.x,
      anchorY: anchor.y,
    };
  };

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const world = worldRef.current;
    const point = canvasWorldPoint(event.clientX, event.clientY);
    if (!canvas || !world || !point || engineStatus === "error") return;
    canvas.setPointerCapture(event.pointerId);
    activePointersRef.current.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    });
    if (activePointersRef.current.size >= 2) {
      beginPinch(canvas, world);
      return;
    }
    if (sparkArmed) {
      issueWorldCommand((activeWorld) => activeWorld.applySpark(point.x, point.y));
      setSparkArmed(false);
      return;
    }
    const atom = world.hitAtom(point.x, point.y);
    if (atom && issueWorldCommand((activeWorld) => activeWorld.grabAtom(atom.id, point.x, point.y))) {
      gestureRef.current = { type: "atom", pointerId: event.pointerId, atomId: atom.id };
      return;
    }
    if (world.hitPiston(point.x, point.y)) {
      gestureRef.current = { type: "piston", pointerId: event.pointerId };
      return;
    }
    gestureRef.current = {
      type: "pan",
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
    };
  };

  const handleCanvasPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const world = worldRef.current;
    if (!canvas || !world || !activePointersRef.current.has(event.pointerId)) return;
    activePointersRef.current.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    });

    if (pinchRef.current && activePointersRef.current.size >= 2) {
      const pointers = Array.from(activePointersRef.current.values()).slice(0, 2);
      const currentDistance = Math.max(
        1,
        distance(
          pointers[0].clientX,
          pointers[0].clientY,
          pointers[1].clientX,
          pointers[1].clientY,
        ),
      );
      const rect = canvas.getBoundingClientRect();
      const centerX = (pointers[0].clientX + pointers[1].clientX) / 2 - rect.left;
      const centerY = (pointers[0].clientY + pointers[1].clientY) / 2 - rect.top;
      world.camera.zoom = clamp(
        pinchRef.current.startZoom * (currentDistance / pinchRef.current.startDistance),
        0.45,
        3.5,
      );
      const after = world.screenToWorld(centerX, centerY);
      world.camera.x += pinchRef.current.anchorX - after.x;
      world.camera.y += pinchRef.current.anchorY - after.y;
      return;
    }

    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const point = canvasWorldPoint(event.clientX, event.clientY);
    if (!point) return;
    if (gesture.type === "atom") {
      issueWorldCommand((activeWorld) => activeWorld.dragAtom(gesture.atomId, point.x, point.y));
    } else if (gesture.type === "piston") {
      issueWorldCommand((activeWorld) => activeWorld.setPistonTarget(point.x));
    } else {
      world.camera.x -= (event.clientX - gesture.lastX) / world.camera.zoom;
      world.camera.y -= (event.clientY - gesture.lastY) / world.camera.zoom;
      gesture.lastX = event.clientX;
      gesture.lastY = event.clientY;
    }
  };

  const finishCanvasGesture = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current;
    if (gesture?.pointerId === event.pointerId && gesture.type === "atom") {
      issueWorldCommand((world) => world.releaseAtom(gesture.atomId));
    }
    activePointersRef.current.delete(event.pointerId);
    if (activePointersRef.current.size < 2) pinchRef.current = null;
    if (gesture?.pointerId === event.pointerId) gestureRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    const world = worldRef.current;
    if (!canvas || !world) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const before = world.screenToWorld(x, y);
    world.camera.zoom = clamp(world.camera.zoom * Math.exp(-event.deltaY * 0.0012), 0.45, 3.5);
    const after = world.screenToWorld(x, y);
    world.camera.x += before.x - after.x;
    world.camera.y += before.y - after.y;
  };

  const togglePlaying = () => {
    const next = !playing;
    if (issueWorldCommand((world) => world.setPlaying(next)) === undefined && engineStatus === "error") return;
    setPlaying(next);
    updateSummary();
  };

  const selectExperiment = (next: ExperimentKey) => {
    const definition = EXPERIMENTS.find((candidate) => candidate.id === next)!;
    issueWorldCommand((world) => world.loadExperiment(next));
    setExperiment(next);
    setTemperature(definition.temperature);
    setPlaying(true);
    setSparkArmed(false);
    updateSummary();
  };

  const resetExperiment = () => {
    issueWorldCommand((world) => world.reset());
    const definition = EXPERIMENTS.find((candidate) => candidate.id === experiment)!;
    setTemperature(definition.temperature);
    setPlaying(true);
    setSparkArmed(false);
    updateSummary();
  };

  const activeExperiment = EXPERIMENTS.find((candidate) => candidate.id === experiment)!;
  const controlsDisabled = engineStatus === "error";

  return (
    <main className="lab-shell">
      <canvas
        ref={canvasRef}
        className={`molecular-canvas ${sparkArmed ? "is-spark-armed" : ""}`}
        aria-label="Interactive molecular world. Drag an atom to pull it, drag empty space to pan, or drag the gold piston wall to compress."
        role="application"
        tabIndex={0}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={finishCanvasGesture}
        onPointerCancel={finishCanvasGesture}
        onWheel={handleWheel}
        onKeyDown={(event) => {
          const world = worldRef.current;
          if (!world) return;
          if (event.code === "Space") {
            event.preventDefault();
            togglePlaying();
          } else if (event.key.toLowerCase() === "s") {
            setSparkArmed(true);
          } else if (event.key === "Enter" && sparkArmed) {
            issueWorldCommand((activeWorld) => activeWorld.applySpark(world.camera.x, world.camera.y));
            setSparkArmed(false);
          } else if (event.key === "Escape") {
            setSparkArmed(false);
            const gesture = gestureRef.current;
            if (gesture?.type === "atom") issueWorldCommand((activeWorld) => activeWorld.releaseAtom(gesture.atomId));
            gestureRef.current = null;
          } else if (event.key.startsWith("Arrow")) {
            event.preventDefault();
            const delta = 28 / world.camera.zoom;
            if (event.key === "ArrowLeft") world.camera.x -= delta;
            if (event.key === "ArrowRight") world.camera.x += delta;
            if (event.key === "ArrowUp") world.camera.y -= delta;
            if (event.key === "ArrowDown") world.camera.y += delta;
          }
        }}
      />

      <header className="lab-header">
        <div className="identity" aria-label="MolecularSetup">
          <span className="identity-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>MolecularSetup</span>
        </div>
        <nav className="experiment-switcher" aria-label="Experiments">
          {EXPERIMENTS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === experiment ? "is-active" : ""}
              aria-pressed={item.id === experiment}
              disabled={controlsDisabled}
              onClick={() => selectExperiment(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="experiment-cue" aria-hidden="true">
        <span>{activeExperiment.label}</span>
        <small>{activeExperiment.cue}</small>
      </div>

      <aside className="ingredient-tray" aria-label="Ingredients">
        <span className="tray-label">Add</span>
        <div className="ingredient-list">
          {INGREDIENTS.map((ingredient) => (
            <button
              key={ingredient.id}
              type="button"
              className="ingredient-button"
              aria-label={`Add one ${ingredient.name}. Hold to add a stream.`}
              disabled={controlsDisabled}
              onPointerDown={(event) => beginIngredientDrag(event, ingredient)}
              onPointerMove={(event) => moveIngredientDrag(event, ingredient)}
              onPointerUp={(event) => finishIngredientDrag(event, ingredient, true)}
              onPointerCancel={(event) => finishIngredientDrag(event, ingredient, false)}
              onClick={(event) => {
                if (event.detail === 0) spawnIngredient(ingredient);
              }}
            >
              <IngredientThumbnail ingredient={ingredient} />
            </button>
          ))}
        </div>
      </aside>

      <div className="action-dock" aria-label="Simulation controls">
        <button
          type="button"
          className={`spark-button ${sparkArmed ? "is-active" : ""}`}
          aria-label={sparkArmed ? "Cancel spark placement" : "Place a spark"}
          aria-pressed={sparkArmed}
          disabled={controlsDisabled}
          onClick={() => setSparkArmed((current) => !current)}
        >
          <SparkIcon />
          <span>Spark</span>
        </button>
        <button
          type="button"
          className="round-control"
          aria-label={playing ? "Pause simulation" : "Play simulation"}
          disabled={controlsDisabled}
          onClick={togglePlaying}
        >
          <PausePlayIcon playing={playing} />
        </button>
        <button
          type="button"
          className="round-control"
          aria-label="Reset this experiment"
          disabled={controlsDisabled}
          onClick={resetExperiment}
        >
          <ResetIcon />
        </button>
      </div>

      <label
        className="temperature-control"
        style={{ "--heat": `${temperature}%` } as CSSProperties}
      >
        <span className="temperature-label cold">Cold</span>
        <span className="temperature-track">
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={temperature}
            disabled={controlsDisabled}
            aria-label="Temperature from cold to hot"
            aria-valuetext={temperature < 34 ? "Cold" : temperature < 68 ? "Warm" : "Hot"}
            onChange={(event) => {
              const next = Number(event.currentTarget.value);
              issueWorldCommand((world) => world.setTemperature(next / 100));
              setTemperature(next);
            }}
          />
        </span>
        <span className="temperature-label warm">Warm</span>
        <span className="temperature-label hot">Hot</span>
      </label>

      <div className="piston-hint" aria-hidden="true">
        <i />
        Drag piston
      </div>

      {ingredientDrag && (
        <div
          className={`ingredient-ghost ${ingredientDrag.active ? "is-active" : ""}`}
          style={
            {
              "--ghost-x": `${ingredientDrag.x}px`,
              "--ghost-y": `${ingredientDrag.y}px`,
            } as CSSProperties
          }
          aria-hidden="true"
        >
          <IngredientThumbnail ingredient={ingredientDrag.ingredient} />
          {ingredientDrag.streamed && <span className="stream-ripple" />}
        </div>
      )}

      {engineStatus === "loading" && (
        <div className="engine-status" role="status">
          Preparing the molecular world…
        </div>
      )}
      {engineStatus === "error" && (
        <div className="engine-status is-error" role="alert">
          The verified simulation engine could not be loaded. The world is stopped.
        </div>
      )}

      <div className="sr-only" aria-live="polite">
        {worldSummary}
      </div>
    </main>
  );
}
