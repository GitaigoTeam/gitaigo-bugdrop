export type Tool = 'draw' | 'arrow' | 'rect' | 'text';

interface Point {
  x: number;
  y: number;
}

const ANNOTATION_COLOR = '#ff0000';
const VISIBLE_ANNOTATION_LINE_WIDTH = 5.5;
const ARROW_HEAD_ANGLE = Math.PI / 7;
const MIN_ANNOTATION_DISTANCE = 2;

export function createAnnotator(
  container: HTMLElement,
  imageData: string
): {
  setTool: (tool: Tool) => void;
  undo: () => void;
  getImageData: () => string;
  destroy: () => void;
} {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  let currentTool: Tool = 'draw';
  let isDrawing = false;
  let points: Point[] = [];
  let draftBase: ImageData | null = null;
  let hasDrawnStroke = false;
  const history: ImageData[] = [];

  // Load image
  const img = new Image();
  img.onload = () => {
    // Keep full resolution in canvas, scale display via CSS
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.style.maxWidth = '100%';
    canvas.style.height = 'auto';
    canvas.style.cursor = 'crosshair';

    ctx.drawImage(img, 0, 0);

    // Commit the unannotated screenshot as the undo floor.
    commitState();
  };
  img.src = imageData;

  container.appendChild(canvas);

  function commitState() {
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  }

  function restoreState(state: ImageData) {
    ctx.putImageData(state, 0, 0);
  }

  function getLatestState() {
    return history[history.length - 1] ?? null;
  }

  function getDistance(from: Point, to: Point) {
    return Math.hypot(to.x - from.x, to.y - from.y);
  }

  function resetDraft() {
    window.removeEventListener('mouseup', handleMouseUp);
    isDrawing = false;
    points = [];
    draftBase = null;
    hasDrawnStroke = false;
  }

  function cancelDraft() {
    if (draftBase) restoreState(draftBase);
    resetDraft();
  }

  function getCanvasPoint(e: MouseEvent): Point {
    const rect = canvas.getBoundingClientRect();
    const scaleX = img.width / rect.width;
    const scaleY = img.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function getLineWidth() {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.max(canvas.width / rect.width, canvas.height / rect.height, 1);
    return Math.round(VISIBLE_ANNOTATION_LINE_WIDTH * scale);
  }

  function drawLine(from: Point, to: Point) {
    const lineWidth = getLineWidth();

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = ANNOTATION_COLOR;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  function drawArrow(from: Point, to: Point) {
    // Line
    drawLine(from, to);

    // Arrowhead
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const headLength = getLineWidth() * 5;

    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLength * Math.cos(angle - ARROW_HEAD_ANGLE),
      to.y - headLength * Math.sin(angle - ARROW_HEAD_ANGLE)
    );
    ctx.lineTo(
      to.x - headLength * Math.cos(angle + ARROW_HEAD_ANGLE),
      to.y - headLength * Math.sin(angle + ARROW_HEAD_ANGLE)
    );
    ctx.closePath();
    ctx.fillStyle = ANNOTATION_COLOR;
    ctx.fill();
  }

  function drawRect(from: Point, to: Point) {
    ctx.strokeStyle = ANNOTATION_COLOR;
    ctx.lineWidth = getLineWidth();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeRect(from.x, from.y, to.x - from.x, to.y - from.y);
  }

  function handleMouseDown(e: MouseEvent) {
    const base = getLatestState();
    if (!base) return;

    isDrawing = true;
    points = [getCanvasPoint(e)];
    draftBase = base;
    hasDrawnStroke = false;
    window.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDrawing || !draftBase) return;

    const point = getCanvasPoint(e);

    if (currentTool === 'draw') {
      drawLine(points[points.length - 1], point);
      points.push(point);
      hasDrawnStroke = hasDrawnStroke || getDistance(points[0], point) >= MIN_ANNOTATION_DISTANCE;
    } else {
      // Preview for arrow/rect
      restoreState(draftBase);

      if (currentTool === 'arrow') {
        drawArrow(points[0], point);
      } else if (currentTool === 'rect') {
        drawRect(points[0], point);
      }
    }
  }

  function handleMouseUp(e: MouseEvent) {
    if (!isDrawing || !draftBase) {
      resetDraft();
      return;
    }

    const point = getCanvasPoint(e);
    const start = points[0];
    const isMeaningfulAnnotation =
      hasDrawnStroke || getDistance(start, point) >= MIN_ANNOTATION_DISTANCE;

    if (!isMeaningfulAnnotation) {
      restoreState(draftBase);
      resetDraft();
      return;
    }

    if (currentTool === 'arrow') {
      restoreState(draftBase);
      drawArrow(start, point);
    } else if (currentTool === 'rect') {
      restoreState(draftBase);
      drawRect(start, point);
    } else if (currentTool === 'draw' && !hasDrawnStroke) {
      drawLine(start, point);
    }

    commitState();
    resetDraft();
  }

  // Event handlers
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);

  return {
    setTool(tool: Tool) {
      cancelDraft();
      currentTool = tool;
    },

    undo() {
      if (draftBase) {
        cancelDraft();
        return;
      }

      if (history.length <= 1) return;

      resetDraft();
      history.pop();
      const previousState = getLatestState();
      if (previousState) restoreState(previousState);
    },

    getImageData(): string {
      return canvas.toDataURL('image/png');
    },

    destroy() {
      resetDraft();
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.remove();
    },
  };
}
