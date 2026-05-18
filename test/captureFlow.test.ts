// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EmptyCaptureReason } from '../src/widget/capture-flow';
import type { ScreenshotChoice } from '../src/widget/screenshot-options';
import type { CaptureWithLoadingResult } from '../src/widget/capture-loading';

const baseConfig = {
  screenshotMode: 'optional' as const,
  theme: 'light' as const,
};

async function loadCaptureFlowWithMocks(opts: {
  screenshotChoice?: ScreenshotChoice;
  screenshotChoices?: ScreenshotChoice[];
  pickedElement?: Element | null;
  pickedElements?: Array<Element | null>;
  captureResult?: CaptureWithLoadingResult;
  captureResults?: CaptureWithLoadingResult[];
  annotationResult?: string | 'retake' | 'cancel';
  annotationResults?: Array<string | 'retake' | 'cancel'>;
}) {
  vi.resetModules();
  const screenshotOptionsMock = vi.fn();
  for (const choice of opts.screenshotChoices ?? []) {
    screenshotOptionsMock.mockResolvedValueOnce(choice);
  }
  screenshotOptionsMock.mockResolvedValue(opts.screenshotChoice ?? { kind: 'skip' });

  const elementPickerMock = vi.fn();
  for (const element of opts.pickedElements ?? []) {
    elementPickerMock.mockResolvedValueOnce(element);
  }
  elementPickerMock.mockResolvedValue(opts.pickedElement ?? null);

  const captureMock = vi.fn();
  for (const result of opts.captureResults ?? []) {
    captureMock.mockResolvedValueOnce(result);
  }
  captureMock.mockResolvedValue(opts.captureResult ?? { kind: 'skipped' });

  const annotationMock = vi.fn();
  for (const result of opts.annotationResults ?? []) {
    annotationMock.mockResolvedValueOnce(result);
  }
  annotationMock.mockResolvedValue(opts.annotationResult ?? 'annotated-image');

  vi.doMock('../src/widget/screenshot-options', () => ({
    showScreenshotOptions: screenshotOptionsMock,
  }));
  vi.doMock('../src/widget/picker', () => ({
    createElementPicker: elementPickerMock,
  }));
  vi.doMock('../src/widget/area-picker', () => ({
    createAreaPicker: vi.fn(),
  }));
  vi.doMock('../src/widget/capture-loading', () => ({
    captureWithLoading: captureMock,
    captureAreaWithLoading: vi.fn(),
    capturePromiseWithLoading: captureMock,
  }));
  vi.doMock('../src/widget/annotation-flow', () => ({
    showAnnotationStep: annotationMock,
  }));
  vi.doMock('../src/widget/screenshot', () => ({
    beginViewportCapture: vi.fn(),
    getRedactionCount: vi.fn().mockReturnValue(0),
    isFullPageDisabled: vi.fn().mockReturnValue(false),
  }));

  return import('../src/widget/capture-flow');
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.doUnmock('../src/widget/screenshot-options');
  vi.doUnmock('../src/widget/picker');
  vi.doUnmock('../src/widget/area-picker');
  vi.doUnmock('../src/widget/capture-loading');
  vi.doUnmock('../src/widget/annotation-flow');
  vi.doUnmock('../src/widget/screenshot');
  vi.resetModules();
});

describe('capture flow state decisions', () => {
  it.each([
    ['explicit-skip', true],
    ['capture-failure-skip', true],
    ['selection-cancelled', false],
    ['none', false],
  ] satisfies Array<[EmptyCaptureReason, boolean]>)(
    'complex screenshot skip persistence for %s is %s',
    async (reason, expected) => {
      const { shouldRememberComplexScreenshotSkip } = await import('../src/widget/capture-flow');
      expect(shouldRememberComplexScreenshotSkip(reason)).toBe(expected);
    }
  );

  it('remembers complex screenshot skip for an explicit optional skip', async () => {
    const { runScreenshotCaptureFlow } = await loadCaptureFlowWithMocks({
      screenshotChoice: { kind: 'skip' },
    });
    const onComplexScreenshotSkipped = vi.fn();

    const result = await runScreenshotCaptureFlow(
      document.createElement('div'),
      baseConfig,
      true,
      onComplexScreenshotSkipped
    );

    expect(result).toEqual({
      screenshot: null,
      elementSelector: null,
      fullElementSelector: null,
      returnToForm: false,
    });
    expect(onComplexScreenshotSkipped).toHaveBeenCalledTimes(1);
  });

  it('does not remember complex screenshot skip when element selection is cancelled', async () => {
    const { runScreenshotCaptureFlow } = await loadCaptureFlowWithMocks({
      screenshotChoice: { kind: 'element' },
      pickedElement: null,
    });
    const onComplexScreenshotSkipped = vi.fn();

    const result = await runScreenshotCaptureFlow(
      document.createElement('div'),
      baseConfig,
      true,
      onComplexScreenshotSkipped
    );

    expect(result).toEqual({
      screenshot: null,
      elementSelector: null,
      fullElementSelector: null,
      returnToForm: false,
    });
    expect(onComplexScreenshotSkipped).not.toHaveBeenCalled();
  });

  it('keeps selected element metadata when element capture is skipped after failure', async () => {
    document.body.innerHTML = `
      <div class="injected-before-page"></div>
      <div class="another-injected-wrapper"></div>
      <div id="page" class="site">
        <div id="content" class="site-content">
          <div id="primary" class="content-area">
            <main id="main" class="site-main">
              <article id="post-27" class="post-27 page">
                <div class="inside-article">
                  <div class="entry-content">
                    <div class="gb-container gb-container-f0cc8c05"></div>
                    <div class="gb-container gb-container-928af62b"></div>
                  </div>
                </div>
              </article>
            </main>
          </div>
        </div>
      </div>
    `;
    const element = document.querySelector('.gb-container-928af62b')!;
    const { runScreenshotCaptureFlow } = await loadCaptureFlowWithMocks({
      screenshotChoice: { kind: 'element' },
      pickedElement: element,
      captureResult: { kind: 'skipped' },
    });
    const onComplexScreenshotSkipped = vi.fn();

    const result = await runScreenshotCaptureFlow(
      document.createElement('div'),
      baseConfig,
      true,
      onComplexScreenshotSkipped
    );

    expect(result).toEqual({
      screenshot: null,
      elementSelector:
        '#post-27 > div.inside-article > div.entry-content > div.gb-container.gb-container-928af62b',
      fullElementSelector:
        'html > body > div#page.site > div#content.site-content > div#primary.content-area > main#main.site-main > article#post-27.post-27.page > div.inside-article > div.entry-content > div.gb-container.gb-container-928af62b:nth-of-type(2)',
      returnToForm: false,
    });
    expect(document.querySelector(result.fullElementSelector!)).toBe(element);
    expect(onComplexScreenshotSkipped).toHaveBeenCalledTimes(1);
  });

  it('keeps full selected element metadata after successful element capture', async () => {
    document.body.innerHTML = `
      <main id="content">
        <section class="card">
          <button id="save-button" class="primary action">Save</button>
        </section>
      </main>
    `;
    const element = document.querySelector('#save-button')!;
    const { runScreenshotCaptureFlow } = await loadCaptureFlowWithMocks({
      screenshotChoice: { kind: 'element' },
      pickedElement: element,
      captureResult: { kind: 'ok', dataUrl: 'data:image/png;base64,BBBB' },
      annotationResult: 'data:image/png;base64,ANNOTATED',
    });
    const onComplexScreenshotSkipped = vi.fn();

    const result = await runScreenshotCaptureFlow(
      document.createElement('div'),
      baseConfig,
      true,
      onComplexScreenshotSkipped
    );

    expect(result).toEqual({
      screenshot: 'data:image/png;base64,ANNOTATED',
      elementSelector: '#save-button',
      fullElementSelector:
        'html > body > main#content > section.card > button#save-button.primary.action',
      returnToForm: false,
    });
    expect(document.querySelector(result.fullElementSelector!)).toBe(element);
    expect(onComplexScreenshotSkipped).not.toHaveBeenCalled();
  });

  it('uses the latest selected element metadata after annotation retake', async () => {
    document.body.innerHTML = `
      <main>
        <button id="first-button" class="primary">First</button>
        <button id="second-button" class="secondary">Second</button>
      </main>
    `;
    const firstElement = document.querySelector('#first-button')!;
    const secondElement = document.querySelector('#second-button')!;
    const { runScreenshotCaptureFlow } = await loadCaptureFlowWithMocks({
      screenshotChoices: [{ kind: 'element' }, { kind: 'element' }],
      pickedElements: [firstElement, secondElement],
      captureResults: [
        { kind: 'ok', dataUrl: 'data:image/png;base64,FIRST' },
        { kind: 'ok', dataUrl: 'data:image/png;base64,SECOND' },
      ],
      annotationResults: ['retake', 'data:image/png;base64,ANNOTATED_SECOND'],
    });
    const onComplexScreenshotSkipped = vi.fn();

    const result = await runScreenshotCaptureFlow(
      document.createElement('div'),
      baseConfig,
      true,
      onComplexScreenshotSkipped
    );

    expect(result).toEqual({
      screenshot: 'data:image/png;base64,ANNOTATED_SECOND',
      elementSelector: '#second-button',
      fullElementSelector: 'html > body > main > button#second-button.secondary',
      returnToForm: false,
    });
    expect(result.fullElementSelector).not.toContain('first-button');
    expect(document.querySelector(result.fullElementSelector!)).toBe(secondElement);
    expect(onComplexScreenshotSkipped).not.toHaveBeenCalled();
  });

  it('drops selected element metadata when element capture is cancelled', async () => {
    document.body.innerHTML = `
      <main>
        <button id="cancelled-button" class="primary">Cancel target</button>
      </main>
    `;
    const element = document.querySelector('#cancelled-button')!;
    const { runScreenshotCaptureFlow } = await loadCaptureFlowWithMocks({
      screenshotChoice: { kind: 'element' },
      pickedElement: element,
      captureResult: { kind: 'cancelled' },
    });
    const onComplexScreenshotSkipped = vi.fn();

    const result = await runScreenshotCaptureFlow(
      document.createElement('div'),
      baseConfig,
      true,
      onComplexScreenshotSkipped
    );

    expect(result).toEqual({
      screenshot: null,
      elementSelector: null,
      fullElementSelector: null,
      returnToForm: true,
    });
    expect(onComplexScreenshotSkipped).not.toHaveBeenCalled();
  });

  it('returns to form when the user dismisses the screenshot options modal', async () => {
    const { runScreenshotCaptureFlow } = await loadCaptureFlowWithMocks({
      screenshotChoice: { kind: 'cancel' },
    });
    const onComplexScreenshotSkipped = vi.fn();

    const result = await runScreenshotCaptureFlow(
      document.createElement('div'),
      baseConfig,
      true,
      onComplexScreenshotSkipped
    );

    expect(result).toEqual({
      screenshot: null,
      elementSelector: null,
      fullElementSelector: null,
      returnToForm: true,
    });
    expect(onComplexScreenshotSkipped).not.toHaveBeenCalled();
  });

  it('returns to form when the capture-failure modal is cancelled mid-capture', async () => {
    const { runScreenshotCaptureFlow } = await loadCaptureFlowWithMocks({
      screenshotChoice: { kind: 'capture' },
      captureResult: { kind: 'cancelled' },
    });
    const onComplexScreenshotSkipped = vi.fn();

    const result = await runScreenshotCaptureFlow(
      document.createElement('div'),
      baseConfig,
      true,
      onComplexScreenshotSkipped
    );

    expect(result).toEqual({
      screenshot: null,
      elementSelector: null,
      fullElementSelector: null,
      returnToForm: true,
    });
    expect(onComplexScreenshotSkipped).not.toHaveBeenCalled();
  });

  it('returns to form when the annotation step is cancelled', async () => {
    const { runScreenshotCaptureFlow } = await loadCaptureFlowWithMocks({
      screenshotChoice: { kind: 'capture' },
      captureResult: { kind: 'ok', dataUrl: 'data:image/png;base64,AAAA' },
      annotationResult: 'cancel',
    });
    const onComplexScreenshotSkipped = vi.fn();

    const result = await runScreenshotCaptureFlow(
      document.createElement('div'),
      baseConfig,
      true,
      onComplexScreenshotSkipped
    );

    expect(result).toEqual({
      screenshot: null,
      elementSelector: null,
      fullElementSelector: null,
      returnToForm: true,
    });
    expect(onComplexScreenshotSkipped).not.toHaveBeenCalled();
  });

  it('flags redactionUnavailable on the annotation step for native viewport captures', async () => {
    const annotationMock = vi.fn().mockResolvedValue('annotated-image');
    vi.resetModules();
    vi.doMock('../src/widget/screenshot-options', () => ({
      showScreenshotOptions: vi.fn().mockResolvedValue({
        kind: 'viewport',
        capture: Promise.resolve('data:image/png;base64,VVVV'),
      } satisfies ScreenshotChoice),
    }));
    vi.doMock('../src/widget/picker', () => ({ createElementPicker: vi.fn() }));
    vi.doMock('../src/widget/area-picker', () => ({ createAreaPicker: vi.fn() }));
    vi.doMock('../src/widget/capture-loading', () => ({
      captureWithLoading: vi.fn(),
      captureAreaWithLoading: vi.fn(),
      capturePromiseWithLoading: vi
        .fn()
        .mockResolvedValue({ kind: 'ok', dataUrl: 'data:image/png;base64,VVVV' }),
    }));
    vi.doMock('../src/widget/annotation-flow', () => ({ showAnnotationStep: annotationMock }));
    vi.doMock('../src/widget/screenshot', () => ({
      beginViewportCapture: vi.fn(),
      getRedactionCount: vi.fn().mockReturnValue(0),
      isFullPageDisabled: vi.fn().mockReturnValue(true),
    }));

    const { runScreenshotCaptureFlow } = await import('../src/widget/capture-flow');
    const onComplexScreenshotSkipped = vi.fn();

    const result = await runScreenshotCaptureFlow(
      document.createElement('div'),
      baseConfig,
      true,
      onComplexScreenshotSkipped
    );

    expect(result.screenshot).toBe('annotated-image');
    expect(annotationMock).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      'data:image/png;base64,VVVV',
      0,
      { redactionUnavailable: true }
    );
  });
});
