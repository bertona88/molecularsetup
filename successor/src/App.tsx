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

type CanvasGesture =
  | {
      type: "pan";
      pointerId: number;
      lastX: number;
      lastY: number;
    }
  | {
      type: "boundary";
      pointerId: number;
      startX: number;
      startY: number;
    }
  | {
      type: "resize";
      pointerId: number;
      boundaryId: number;
      edge: BoundaryEdge;
    };

type DragGhost = {
  species: Species;
  quantity: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  active: boolean;
};

type PinchGesture = {
  startDistance: number;
  startZoom: number;
  anchorX: number;
  anchorY: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const quantityFromSlider = (value: number) =>
  clamp(Math.round(10 ** ((value / 1000) * 3)), 1, 1000);

const sliderFromQuantity = (quantity: number) =>
  (Math.log10(clamp(quantity, 1, 1000)) / 3) * 1000;

const distance = (x1: number, y1: number, x2: number, y2: number) =>
  Math.hypot(x2 - x1, y2 - y1);

function MoleculeThumbnail({ species }: { species: Species }) {
  const points = species.atoms.map((atom) => ({
    ...atom,
    x: atom.x * 1.25 + 45,
    y: atom.y * 1.25 + 34,
  }));
  return (
    <span className="molecule-thumbnail" aria-hidden="true">
      <svg viewBox="0 0 90 68" role="presentation">
        {species.bonds.map(([a, b], index) => (
          <line
            key={`${a}-${b}-${index}`}
            x1={points[a].x}
            y1={points[a].y}
            x2={points[b].x}
            y2={points[b].y}
            className="thumbnail-bond"
          />
        ))}
        {points.map((atom, index) => (
          <g key={`${atom.element}-${index}`}>
            <circle
              cx={atom.x}
              cy={atom.y}
              r={Math.max(7, ELEMENTS[atom.element].radius * 0.78)}
              fill={ELEMENTS[atom.element].rim}
            />
            <circle
              cx={atom.x}
              cy={atom.y}
              r={Math.max(5.8, ELEMENTS[atom.element].radius * 0.68)}
              fill={ELEMENTS[atom.element].color}
            />
            <circle
              cx={atom.x - 2.2}
              cy={atom.y - 2.4}
              r="1.8"
              fill="rgba(255,255,255,.55)"
            />
          </g>
        ))}
      </svg>
      <span className="molecule-formula">{species.formula}</span>
    </span>
  );
}

function SnowflakeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9 4.8l3 2 3-2M9 19.2l3-2 3 2M5.6 10.8l.2-3.6 3.2-1.6M18.4 13.2l-.2 3.6-3.2 1.6M5.6 13.2l.2 3.6L9 18.4M18.4 10.8l-.2-3.6L15 5.6" />
    </svg>
  );
}

function HeatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 20c-2.1-2.2 1.4-3.8 0-6.1C5.7 11.7 7.8 10 8.6 8M12 20c-2.2-2.4 1.6-4.2 0-6.8-1.5-2.5 1-4.5 1.9-6.7M17 20c-1.9-2 1.2-3.5 0-5.6-1-1.8.7-3.3 1.3-4.8" />
    </svg>
  );
}

function PausePlayIcon({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {playing ? (
        <>
          <path d="M8 6v12" />
          <path d="M16 6v12" />
        </>
      ) : (
        <path d="m9 6 9 6-9 6Z" />
      )}
    </svg>
  );
}

function BoundaryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="3" />
      <path d="M15 7v10M12.5 9.5 15 7l2.5 2.5M12.5 14.5 15 17l2.5-2.5" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.1 8.2A7 7 0 1 1 5 14" />
      <path d="M4 5v5h5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14M9 7V4h6v3M8 10v7M12 10v7M16 10v7M7 7l1 13h8l1-13" />
    </svg>
  );
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<MolecularWorld | null>(null);
  const gestureRef = useRef<CanvasGesture | null>(null);
  const pinchRef = useRef<PinchGesture | null>(null);
  const activePointersRef = useRef(
    new Map<number, { clientX: number; clientY: number }>(),
  );
  const moleculeDragRef = useRef<DragGhost | null>(null);
  const draftRef = useRef<BoundaryDraft | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(true);
  const [temperature, setTemperature] = useState(36);
  const [boundaryMode, setBoundaryMode] = useState(false);
  const [hasSelectedBoundary, setHasSelectedBoundary] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [dragGhost, setDragGhost] = useState<DragGhost | null>(null);
  const [worldSummary, setWorldSummary] = useState(
    "Empty world. Simulation playing.",
  );
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      SPECIES.map((species) => [species.id, species.defaultQuantity]),
    ),
  );

  if (worldRef.current === null) {
    worldRef.current = new MolecularWorld();
  }

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const updateSummary = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;
    setWorldSummary(world.summary());
  }, []);

  const issueWorldCommand = useCallback(
    <Result,>(
      command: (world: MolecularWorld) => Result,
    ): Result | undefined => {
      const world = worldRef.current;
      if (!world || world.status === "error") return undefined;
      try {
        return command(world);
      } catch {
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
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    void world.initialize().catch(() => {
      setWorldSummary(world.summary());
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      world.setViewport(rect.width, rect.height);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    let previous = performance.now();
    let summaryClock = 0;
    const frame = (now: number) => {
      const elapsedMilliseconds = Math.min(50, now - previous);
      previous = now;
      issueWorldCommand((activeWorld) => {
        activeWorld.flushSpawnQueue();
        if (activeWorld.playing) {
          activeWorld.advance(elapsedMilliseconds);
        }
      });
      world.render(context, reducedMotion, draftRef.current);
      summaryClock += elapsedMilliseconds / 1000;
      if (summaryClock > 0.7) {
        updateSummary();
        summaryClock = 0;
      }
      animationRef.current = requestAnimationFrame(frame);
    };
    animationRef.current = requestAnimationFrame(frame);

    return () => {
      resizeObserver.disconnect();
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [issueWorldCommand, reducedMotion, updateSummary]);

  const spawnAt = useCallback(
    (species: Species, quantity: number, clientX?: number, clientY?: number) => {
      const canvas = canvasRef.current;
      const world = worldRef.current;
      if (!canvas || !world) return;
      const rect = canvas.getBoundingClientRect();
      const localX =
        clientX === undefined ? rect.width * 0.54 : clientX - rect.left;
      const localY =
        clientY === undefined ? rect.height * 0.5 : clientY - rect.top;
      const point = world.screenToWorld(localX, localY);
      const issued = issueWorldCommand((activeWorld) => {
        activeWorld.enqueueSpawn(species, quantity, point.x, point.y);
        return true;
      });
      if (!issued) return;
      setWorldSummary(
        `Adding ${quantity} ${species.name} ${quantity === 1 ? "molecule" : "molecules"}.`,
      );
    },
    [issueWorldCommand],
  );

  const beginMoleculeDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    species: Species,
  ) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const nextGhost = {
      species,
      quantity: quantities[species.id],
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      active: false,
    };
    moleculeDragRef.current = nextGhost;
    setDragGhost(nextGhost);
  };

  const moveMoleculeDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    species: Species,
  ) => {
    const current = moleculeDragRef.current;
    if (!current || current.species.id !== species.id) return;
    const moved = distance(
      current.startX,
      current.startY,
      event.clientX,
      event.clientY,
    );
    const nextGhost = {
      ...current,
      x: event.clientX,
      y: event.clientY,
      active: current.active || moved > 7,
    };
    moleculeDragRef.current = nextGhost;
    setDragGhost(nextGhost);
  };

  const endMoleculeDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    species: Species,
  ) => {
    const ghost = moleculeDragRef.current;
    const canvas = canvasRef.current;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!canvas || !ghost || ghost.species.id !== species.id) {
      moleculeDragRef.current = null;
      setDragGhost(null);
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const onCanvas =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (ghost.active && onCanvas) {
      spawnAt(species, ghost.quantity, event.clientX, event.clientY);
    } else if (!ghost.active) {
      spawnAt(species, ghost.quantity);
    }
    moleculeDragRef.current = null;
    setDragGhost(null);
  };

  const canvasPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const world = worldRef.current;
    if (!canvas || !world) return null;
    const rect = canvas.getBoundingClientRect();
    return world.screenToWorld(
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
  };

  const handleCanvasPointerDown = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;
    const world = worldRef.current;
    const point = canvasPoint(event);
    if (!canvas || !world || !point) return;
    canvas.setPointerCapture(event.pointerId);
    activePointersRef.current.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    });

    if (activePointersRef.current.size >= 2) {
      const pointers = Array.from(activePointersRef.current.values()).slice(0, 2);
      const rect = canvas.getBoundingClientRect();
      const centerX = (pointers[0].clientX + pointers[1].clientX) / 2 - rect.left;
      const centerY = (pointers[0].clientY + pointers[1].clientY) / 2 - rect.top;
      const anchor = world.screenToWorld(centerX, centerY);
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
      draftRef.current = null;
      gestureRef.current = null;
      return;
    }

    if (boundaryMode) {
      draftRef.current = {
        startX: point.x,
        startY: point.y,
        endX: point.x,
        endY: point.y,
      };
      gestureRef.current = {
        type: "boundary",
        pointerId: event.pointerId,
        startX: point.x,
        startY: point.y,
      };
      return;
    }

    const boundaryHit = world.selectBoundaryAt(point.x, point.y);
    setHasSelectedBoundary(Boolean(boundaryHit));
    if (boundaryHit) {
      gestureRef.current = {
        type: "resize",
        pointerId: event.pointerId,
        boundaryId: boundaryHit.boundary.id,
        edge: boundaryHit.edge,
      };
      return;
    }

    gestureRef.current = {
      type: "pan",
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
    };
  };

  const handleCanvasPointerMove = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;
    const world = worldRef.current;
    if (!canvas || !world) return;
    if (!activePointersRef.current.has(event.pointerId)) return;
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
        pinchRef.current.startZoom *
          (currentDistance / pinchRef.current.startDistance),
        0.35,
        4,
      );
      const after = world.screenToWorld(centerX, centerY);
      world.camera.x += pinchRef.current.anchorX - after.x;
      world.camera.y += pinchRef.current.anchorY - after.y;
      return;
    }

    const gesture = gestureRef.current;
    const point = canvasPoint(event);
    if (!gesture || gesture.pointerId !== event.pointerId || !point) {
      return;
    }

    if (gesture.type === "boundary") {
      draftRef.current = {
        startX: gesture.startX,
        startY: gesture.startY,
        endX: point.x,
        endY: point.y,
      };
    } else if (gesture.type === "resize") {
      issueWorldCommand((activeWorld) =>
        activeWorld.resizeBoundary(
          gesture.boundaryId,
          gesture.edge,
          point.x,
          point.y,
        ),
      );
    } else {
      const deltaX = event.clientX - gesture.lastX;
      const deltaY = event.clientY - gesture.lastY;
      world.camera.x -= deltaX / world.camera.zoom;
      world.camera.y -= deltaY / world.camera.zoom;
      gesture.lastX = event.clientX;
      gesture.lastY = event.clientY;
    }
  };

  const finishCanvasGesture = (
    event: ReactPointerEvent<HTMLCanvasElement>,
    commit: boolean,
  ) => {
    const world = worldRef.current;
    const gesture = gestureRef.current;
    activePointersRef.current.delete(event.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchRef.current = null;
    }
    if (
      world &&
      commit &&
      gesture &&
      gesture.pointerId === event.pointerId &&
      gesture.type === "boundary" &&
      draftRef.current
    ) {
      const created = issueWorldCommand((activeWorld) =>
        activeWorld.addBoundary(draftRef.current!),
      );
      setHasSelectedBoundary(Boolean(created));
      draftRef.current = null;
      setBoundaryMode(false);
    }
    if (gesture?.type === "boundary") {
      draftRef.current = null;
    }
    if (gesture?.pointerId === event.pointerId) {
      gestureRef.current = null;
    }
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
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    const before = world.screenToWorld(screenX, screenY);
    const nextZoom = clamp(
      world.camera.zoom * Math.exp(-event.deltaY * 0.0012),
      0.35,
      4,
    );
    world.camera.zoom = nextZoom;
    const after = world.screenToWorld(screenX, screenY);
    world.camera.x += before.x - after.x;
    world.camera.y += before.y - after.y;
  };

  const togglePlaying = () => {
    const world = worldRef.current;
    if (!world) return;
    const nextPlaying = !world.playing;
    const issued = issueWorldCommand((activeWorld) => {
      activeWorld.setPlaying(nextPlaying);
      return true;
    });
    if (!issued) return;
    setPlaying(nextPlaying);
    updateSummary();
  };

  const changeTemperature = (value: number) => {
    const issued = issueWorldCommand((world) => {
      world.setTemperature(value / 100);
      return true;
    });
    if (!issued) return;
    setTemperature(value);
  };

  const beginReset = () => {
    const world = worldRef.current;
    if (!world || world.status === "error") return;
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    setResetting(true);
    resetTimerRef.current = setTimeout(() => {
      const issued = issueWorldCommand((activeWorld) => {
        activeWorld.reset();
        return true;
      });
      if (!issued) {
        setResetting(false);
        return;
      }
      setPlaying(true);
      setTemperature(36);
      setBoundaryMode(false);
      setHasSelectedBoundary(false);
      setResetting(false);
      updateSummary();
    }, 720);
  };

  const cancelReset = () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = null;
    setResetting(false);
  };

  const removeBoundary = () => {
    const issued = issueWorldCommand((world) => {
      world.removeSelectedBoundary();
      return true;
    });
    if (!issued) return;
    setHasSelectedBoundary(false);
    updateSummary();
  };

  return (
    <main className="lab-shell">
      <canvas
        ref={canvasRef}
        className={`molecular-canvas ${boundaryMode ? "is-drawing-boundary" : ""}`}
        aria-label="Molecular world canvas"
        role="application"
        tabIndex={0}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={(event) => finishCanvasGesture(event, true)}
        onPointerCancel={(event) => finishCanvasGesture(event, false)}
        onWheel={handleWheel}
        onKeyDown={(event) => {
          if (event.code === "Space") {
            event.preventDefault();
            togglePlaying();
          } else if (event.code === "Escape") {
            draftRef.current = null;
            gestureRef.current = null;
            setBoundaryMode(false);
          }
        }}
      />

      <aside className="molecule-tray" aria-label="Molecules">
        <div className="tray-scroll">
          {SPECIES.map((species) => {
            const quantity = quantities[species.id];
            return (
              <div className="molecule-card" key={species.id}>
                <button
                  type="button"
                  className="molecule-button"
                  aria-label={`Add ${quantity} ${species.name} ${quantity === 1 ? "molecule" : "molecules"}`}
                  onPointerDown={(event) => beginMoleculeDrag(event, species)}
                  onPointerMove={(event) => moveMoleculeDrag(event, species)}
                  onPointerUp={(event) => endMoleculeDrag(event, species)}
                  onPointerCancel={() => {
                    moleculeDragRef.current = null;
                    setDragGhost(null);
                  }}
                >
                  <MoleculeThumbnail species={species} />
                </button>
                <label className="quantity-control">
                  <span className="sr-only">
                    Number of {species.name} molecules
                  </span>
                  <span className="quantity-bubble" aria-hidden="true">
                    {quantity}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="1"
                    value={sliderFromQuantity(quantity)}
                    aria-valuemin={1}
                    aria-valuemax={1000}
                    aria-valuenow={quantity}
                    aria-valuetext={`${quantity} molecules`}
                    onChange={(event) => {
                      const next = quantityFromSlider(
                        Number(event.currentTarget.value),
                      );
                      setQuantities((current) => ({
                        ...current,
                        [species.id]: next,
                      }));
                    }}
                    onKeyDown={(event) => {
                      const keySteps: Partial<Record<string, number>> = {
                        ArrowLeft: -1,
                        ArrowDown: -1,
                        ArrowRight: 1,
                        ArrowUp: 1,
                        PageDown: -10,
                        PageUp: 10,
                      };
                      let next: number | null = null;
                      if (event.key === "Home") next = 1;
                      else if (event.key === "End") next = 1000;
                      else if (keySteps[event.key] !== undefined) {
                        next = clamp(quantity + keySteps[event.key]!, 1, 1000);
                      }
                      if (next === null) return;
                      event.preventDefault();
                      setQuantities((current) => ({
                        ...current,
                        [species.id]: next!,
                      }));
                    }}
                  />
                  <span className="quantity-scale" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      </aside>

      <div className="utility-dock" aria-label="Simulation controls">
        <button
          type="button"
          className={`icon-button boundary-button ${boundaryMode ? "is-active" : ""}`}
          aria-label={
            boundaryMode ? "Cancel boundary drawing" : "Draw pressure boundary"
          }
          aria-pressed={boundaryMode}
          onClick={() => {
            draftRef.current = null;
            gestureRef.current = null;
            setBoundaryMode((current) => !current);
          }}
        >
          <BoundaryIcon />
        </button>
        <button
          type="button"
          className="icon-button primary-control"
          aria-label={playing ? "Pause simulation" : "Play simulation"}
          onClick={togglePlaying}
        >
          <PausePlayIcon playing={playing} />
        </button>
        {hasSelectedBoundary && (
          <button
            type="button"
            className="icon-button delete-boundary"
            aria-label="Remove selected boundary"
            onClick={removeBoundary}
          >
            <TrashIcon />
          </button>
        )}
        <button
          type="button"
          className={`icon-button reset-button ${resetting ? "is-holding" : ""}`}
          aria-label="Hold to reset the world"
          onPointerDown={beginReset}
          onPointerUp={cancelReset}
          onPointerLeave={cancelReset}
          onPointerCancel={cancelReset}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") beginReset();
          }}
          onKeyUp={cancelReset}
        >
          <ResetIcon />
          <span className="reset-progress" aria-hidden="true" />
        </button>
      </div>

      <label
        className="temperature-control"
        style={
          {
            "--temperature-position": `${1 - temperature / 100}`,
          } as CSSProperties
        }
      >
        <span className="sr-only">Temperature</span>
        <span className="temperature-icon cold" aria-hidden="true">
          <SnowflakeIcon />
        </span>
        <span className="temperature-rail">
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={temperature}
            aria-valuetext={`${temperature} percent heat`}
            onChange={(event) =>
              changeTemperature(Number(event.currentTarget.value))
            }
          />
        </span>
        <span className="temperature-icon hot" aria-hidden="true">
          <HeatIcon />
        </span>
      </label>

      {dragGhost && (
        <div
          className={`drag-ghost ${dragGhost.active ? "is-active" : ""}`}
          style={
            {
              "--ghost-x": `${dragGhost.x}px`,
              "--ghost-y": `${dragGhost.y}px`,
            } as CSSProperties
          }
          aria-hidden="true"
        >
          <MoleculeThumbnail species={dragGhost.species} />
          <span>{dragGhost.quantity}</span>
          <i />
          <i />
          <i />
          <i />
        </div>
      )}

      <div className="sr-only" aria-live="polite">
        {worldSummary}
      </div>
    </main>
  );
}
