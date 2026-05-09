type Tool = 'draw' | 'arrow' | 'rect' | 'text';

interface Point {
  x: number;
  y: number;
}

const ANNOTATION_COLOR = '#ff0000';
const VISIBLE_ANNOTATION_LINE_WIDTH = 5.5;
const ARROW_HEAD_ANGLE = Math.PI / 7;

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

    // Save initial state
    saveState();
  };
  img.src = imageData;

  container.appendChild(canvas);

  function saveState() {
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
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

  // Event handlers
  canvas.addEventListener('mousedown', e => {
    isDrawing = true;
    points = [getCanvasPoint(e)];
    saveState();
  });

  canvas.addEventListener('mousemove', e => {
    if (!isDrawing) return;

    const point = getCanvasPoint(e);

    if (currentTool === 'draw') {
      drawLine(points[points.length - 1], point);
      points.push(point);
    } else {
      // Preview for arrow/rect
      ctx.putImageData(history[history.length - 1], 0, 0);

      if (currentTool === 'arrow') {
        drawArrow(points[0], point);
      } else if (currentTool === 'rect') {
        drawRect(points[0], point);
      }
    }
  });

  canvas.addEventListener('mouseup', e => {
    if (!isDrawing) return;
    isDrawing = false;

    const point = getCanvasPoint(e);

    if (currentTool === 'arrow') {
      drawArrow(points[0], point);
    } else if (currentTool === 'rect') {
      drawRect(points[0], point);
    }

    points = [];
  });

  return {
    setTool(tool: Tool) {
      currentTool = tool;
    },

    undo() {
      if (history.length > 1) {
        history.pop();
        ctx.putImageData(history[history.length - 1], 0, 0);
      }
    },

    getImageData(): string {
      return canvas.toDataURL('image/png');
    },

    destroy() {
      canvas.remove();
    },
  };
}
