import React from 'react';
import { FileText, Loader2, ZoomIn, ZoomOut, ScanSearch } from 'lucide-react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.2;
const VIEWPORT_PADDING = 32;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const PdfPageCanvas = ({ pdfDocument, pageNumber, scale }) => {
  const canvasRef = React.useRef(null);
  const renderTaskRef = React.useRef(null);

  React.useEffect(() => {
    let cancelled = false;

    const renderPage = async () => {
      if (!pdfDocument || !canvasRef.current) {
        return;
      }

      const page = await pdfDocument.getPage(pageNumber);

      if (cancelled || !canvasRef.current) {
        return;
      }

      const viewport = page.getViewport({ scale });
      const outputScale = window.devicePixelRatio || 1;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { alpha: false });

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
      renderTaskRef.current?.cancel();
      renderTaskRef.current = page.render({
        canvasContext: context,
        viewport,
      });

      try {
        await renderTaskRef.current.promise;
      } catch (error) {
        if (error?.name !== 'RenderingCancelledException') {
          throw error;
        }
      }
    };

    renderPage().catch((error) => {
      if (error?.name !== 'RenderingCancelledException') {
        console.error(`PDF page ${pageNumber} render error:`, error);
      }
    });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [pageNumber, pdfDocument, scale]);

  return (
    <canvas
      ref={canvasRef}
      className="mx-auto block max-w-full rounded-2xl bg-white shadow-[0_20px_50px_-30px_rgba(15,23,42,0.4)]"
    />
  );
};

const PdfCanvasViewerContent = ({ url, onLoad, onError }) => {
  const containerRef = React.useRef(null);
  const manualZoomRef = React.useRef(false);
  const onLoadRef = React.useRef(onLoad);
  const onErrorRef = React.useRef(onError);
  const [pdfDocument, setPdfDocument] = React.useState(null);
  const [pageCount, setPageCount] = React.useState(0);
  const [fitZoom, setFitZoom] = React.useState(1);
  const [zoom, setZoom] = React.useState(null);
  const [isLoadingDocument, setIsLoadingDocument] = React.useState(true);
  const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);

  React.useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  React.useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    const updateSize = () => {
      setContainerSize({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const loadingTask = getDocument({
      url,
      withCredentials: false,
    });

    loadingTask.promise
      .then((loadedPdf) => {
        if (cancelled) {
          loadedPdf.destroy();
          return;
        }

        setPdfDocument(loadedPdf);
        setPageCount(loadedPdf.numPages);
        setIsLoadingDocument(false);
        onLoadRef.current?.();
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        console.error('PDF load error:', error);
        setIsLoadingDocument(false);
        onErrorRef.current?.('ไม่สามารถเปิดเอกสาร PDF ได้ในขณะนี้');
      });

    return () => {
      cancelled = true;
      loadingTask.destroy();
    };
  }, [url]);

  React.useEffect(() => {
    let active = true;

    if (!pdfDocument || !containerSize.width || !containerSize.height) {
      return undefined;
    }

    pdfDocument.getPage(1).then((page) => {
      if (!active) {
        return;
      }

      const viewport = page.getViewport({ scale: 1 });
      const widthScale = (containerSize.width - VIEWPORT_PADDING) / viewport.width;
      const heightScale = (containerSize.height - VIEWPORT_PADDING) / viewport.height;
      const nextFitZoom = clamp(Math.min(widthScale, heightScale), MIN_ZOOM, 1.5);

      setFitZoom(nextFitZoom);

      if (!manualZoomRef.current) {
        setZoom(nextFitZoom);
      }
    }).catch((error) => {
      console.error('PDF fit calculation error:', error);
    });

    return () => {
      active = false;
    };
  }, [containerSize.height, containerSize.width, pdfDocument]);

  const currentZoom = zoom ?? fitZoom;

  const updateZoom = (nextZoom) => {
    manualZoomRef.current = true;
    setZoom(clamp(nextZoom, MIN_ZOOM, MAX_ZOOM));
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-100">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.04em] text-slate-500">PDF Viewer</p>
          <p className="text-xs font-semibold text-slate-600">{pageCount > 0 ? `${pageCount} หน้า` : 'กำลังเตรียมเอกสาร'}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateZoom(currentZoom - ZOOM_STEP)}
            disabled={isLoadingDocument || currentZoom <= MIN_ZOOM}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          >
            <ZoomOut size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              manualZoomRef.current = false;
              setZoom(fitZoom);
            }}
            disabled={isLoadingDocument}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          >
            <ScanSearch size={14} />
            {Math.round(currentZoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => updateZoom(currentZoom + ZOOM_STEP)}
            disabled={isLoadingDocument || currentZoom >= MAX_ZOOM}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      <div ref={containerRef} className="min-h-0 flex-1 overflow-auto bg-[linear-gradient(180deg,#e2e8f0_0%,#f8fafc_100%)] px-3 py-4">
        {isLoadingDocument ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-3 text-slate-600">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-semibold">กำลังเตรียมหน้าเอกสาร...</p>
          </div>
        ) : pdfDocument ? (
          <div className="mx-auto flex w-full flex-col gap-4">
            {Array.from({ length: pageCount }, (_, index) => (
              <div key={`pdf-page-${index + 1}`} className="flex flex-col items-center gap-2">
                <PdfPageCanvas
                  pdfDocument={pdfDocument}
                  pageNumber={index + 1}
                  scale={currentZoom}
                />
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-bold text-white shadow-sm">
                  <FileText size={12} />
                  หน้า {index + 1}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const PdfCanvasViewer = ({ url, onLoad, onError }) => (
  <PdfCanvasViewerContent
    key={url || 'pdf-viewer'}
    url={url}
    onLoad={onLoad}
    onError={onError}
  />
);

export default PdfCanvasViewer;
