import { createAnnotator, type Tool } from './annotator';
import { createModal, redactionNoteHtml } from './ui';

export function showAnnotationStep(
  root: HTMLElement,
  screenshot: string,
  redactionCount = 0,
  opts?: {
    redactionUnavailable?: boolean;
    redactionLimitations?: boolean;
    selectedElementCapture?: boolean;
  }
): Promise<string | 'retake' | 'cancel'> {
  return new Promise(resolve => {
    const redactionMessages: string[] = [];
    if (opts?.redactionUnavailable) {
      redactionMessages.push(
        'Non è stato possibile oscurare automaticamente i campi privati in questa schermata. Controlla e copri le aree sensibili prima di inviare.'
      );
    } else {
      if (redactionCount > 0) {
        redactionMessages.push(
          `${redactionCount} ${redactionCount === 1 ? 'campo privato è stato oscurato' : 'campi privati sono stati oscurati'} in questo screenshot. Controlla prima di inviare.`
        );
      }
      if (opts?.redactionLimitations) {
        redactionMessages.push(
          'Sono state coperte solo le aree contrassegnate. Controlla che il riquadro nero copra davvero le informazioni sensibili prima di inviare.'
        );
      }
    }
    const redactionNote = redactionMessages.length
      ? redactionNoteHtml(redactionMessages.join(' '))
      : '';
    const selectedElementNote = opts?.selectedElementCapture
      ? `
        <p class="bd-selected-element-note" style="margin: -4px 0 12px; color: var(--bd-text-secondary); font-size: 13px;">
          Vuoi includere più area attorno all'elemento? Seleziona un'area più ampia.
        </p>
      `
      : '';
    const modal = createModal(
      root,
      'Controlla lo screenshot',
      `
        ${redactionNote}
        <p style="margin: 0 0 12px; color: var(--bd-text-secondary); font-size: 13px;">
          Controlla che non siano visibili informazioni sensibili prima di inviare. Copri le aree riservate: le coperture vengono salvate nell'immagine.
        </p>
        ${selectedElementNote}
        <div class="bd-tools">
          <button class="bd-tool active" data-tool="draw">✏️ Disegna</button>
          <button class="bd-tool" data-tool="arrow">➡️ Freccia</button>
          <button class="bd-tool" data-tool="rect">▢ Rettangolo</button>
          <button class="bd-tool" data-tool="redact">Oscura</button>
          <button class="bd-tool" data-action="undo">↶ Annulla</button>
        </div>
        <div id="annotation-canvas" class="bd-annotation-stage"></div>
        <div class="bd-actions">
          <button class="bd-btn bd-btn-secondary" data-action="retake">Rifai</button>
          <button class="bd-btn bd-btn-primary" data-action="done">Invia feedback</button>
        </div>
      `,
      false,
      'bd-modal--annotator'
    );

    const canvasContainer = modal.querySelector('#annotation-canvas') as HTMLElement;
    const annotator = createAnnotator(canvasContainer, screenshot);

    const toolButtons = modal.querySelectorAll('[data-tool]');
    toolButtons.forEach(btn => {
      btn.addEventListener('click', e => {
        const target = e.currentTarget as HTMLElement;
        const tool = target.dataset.tool;

        if (tool) {
          toolButtons.forEach(b => b.classList.remove('active'));
          target.classList.add('active');
          annotator.setTool(tool as Tool);
        }
      });
    });

    const undoBtn = modal.querySelector('[data-action="undo"]') as HTMLElement | null;
    undoBtn?.addEventListener('click', () => annotator.undo());

    const closeBtn = modal.querySelector('.bd-close') as HTMLElement;
    const retakeBtn = modal.querySelector('[data-action="retake"]') as HTMLElement;
    const doneBtn = modal.querySelector('[data-action="done"]') as HTMLElement;

    closeBtn?.addEventListener('click', () => {
      annotator.destroy();
      modal.remove();
      resolve('cancel');
    });

    retakeBtn?.addEventListener('click', () => {
      annotator.destroy();
      modal.remove();
      resolve('retake');
    });

    doneBtn?.addEventListener('click', () => {
      const annotated = annotator.getImageData();
      annotator.destroy();
      modal.remove();
      resolve(annotated);
    });
  });
}
