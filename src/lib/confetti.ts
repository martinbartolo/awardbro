/**
 * The winner's confetti: the show's shape set (circles, triangles and squiggles), drawn on a
 * canvas. Every piece flies on any capable machine. Only when the first half second's frames
 * run long, on a device that is visibly struggling, are half the pieces dropped.
 */

type Shape = "circle" | "triangle" | "squiggle";
const SHAPES: Shape[] = ["circle", "triangle", "squiggle"];

type Piece = {
  shape: Shape;
  colour: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  /** Size in canvas pixels */
  size: number;
  /** Phase of the side-to-side flutter */
  flutter: number;
};

/** Pieces in one burst, at full strength */
export const PIECES = 220;
/** How long the frame times are watched before deciding whether to thin out */
const MEASURE_MS = 500;
/** An average frame longer than this (under ~40 fps) counts as struggling */
const SLOW_FRAME_MS = 25;

export type ConfettiOptions = {
  /** The shape set's colours, read from the theme */
  colours: string[];
  /** Where the burst starts, as a share of the canvas's width and height */
  origin: { x: number; y: number };
  pieces?: number;
};

/** Hits the canvas with one burst of confetti; returns a function that stops it */
export function launchConfetti(
  canvas: HTMLCanvasElement,
  { colours, origin, pieces = PIECES }: ConfettiOptions,
): () => void {
  const context = canvas.getContext("2d");
  if (!context || colours.length === 0) return () => undefined;

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = canvas.clientWidth * ratio;
  const height = canvas.clientHeight * ratio;
  canvas.width = width;
  canvas.height = height;
  // Pieces and speeds scale with the screen, so a projector and a laptop see the same burst
  const unit = Math.min(width, height * (16 / 9)) / 1440;

  const random = (min: number, max: number) =>
    min + Math.random() * (max - min);
  let alive: Piece[] = Array.from({ length: pieces }, (_, i) => {
    // Mostly upwards, fanned out to both sides
    const direction = random(-Math.PI * 0.85, -Math.PI * 0.15);
    const speed = random(14, 34) * unit;
    return {
      shape: SHAPES[i % SHAPES.length]!,
      colour: colours[i % colours.length]!,
      x: origin.x * width + random(-60, 60) * unit,
      y: origin.y * height,
      vx: Math.cos(direction) * speed,
      vy: Math.sin(direction) * speed,
      angle: random(0, Math.PI * 2),
      spin: random(-0.2, 0.2),
      size: random(14, 24) * unit,
      flutter: random(0, Math.PI * 2),
    };
  });

  const gravity = 0.55 * unit;
  const drag = 0.985;
  const started = performance.now();
  let last = started;
  let frames = 0;
  let measuring = true;
  let frame = 0;

  const draw = (piece: Piece) => {
    context.save();
    context.translate(piece.x, piece.y);
    context.rotate(piece.angle);
    context.fillStyle = piece.colour;
    context.strokeStyle = piece.colour;
    const s = piece.size;
    if (piece.shape === "circle") {
      context.beginPath();
      context.arc(0, 0, s / 2, 0, Math.PI * 2);
      context.fill();
    } else if (piece.shape === "triangle") {
      context.beginPath();
      context.moveTo(0, -s / 2);
      context.lineTo(s / 2, s / 2);
      context.lineTo(-s / 2, s / 2);
      context.closePath();
      context.fill();
    } else {
      // Three waves, like the squiggle in the shape set
      context.lineWidth = s / 4;
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(-s, 0);
      for (let i = 0; i < 3; i++) {
        const x = -s + (i * 2 * s) / 3;
        context.quadraticCurveTo(x + s / 6, -s / 3, x + s / 3, 0);
        context.quadraticCurveTo(x + s / 2, s / 3, x + (2 * s) / 3, 0);
      }
      context.stroke();
    }
    context.restore();
  };

  const tick = (now: number) => {
    // Steps are measured in 60 fps frames, so a slow device's pieces still move at the same pace
    const step = Math.min((now - last) / (1000 / 60), 3);
    last = now;
    frames++;

    if (measuring && now - started > MEASURE_MS) {
      measuring = false;
      if ((now - started) / frames > SLOW_FRAME_MS) {
        alive = alive.filter((_, i) => i % 2 === 0);
      }
    }

    context.clearRect(0, 0, width, height);
    for (const piece of alive) {
      piece.vx *= drag ** step;
      piece.vy = piece.vy * drag ** step + gravity * step;
      piece.flutter += 0.12 * step;
      piece.x += (piece.vx + Math.sin(piece.flutter) * unit) * step;
      piece.y += piece.vy * step;
      piece.angle += piece.spin * step;
      draw(piece);
    }
    alive = alive.filter(p => p.y < height + 40 * unit);
    frame = alive.length > 0 ? requestAnimationFrame(tick) : 0;
  };
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    context.clearRect(0, 0, width, height);
  };
}
