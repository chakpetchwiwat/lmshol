import React from 'react';
import ModalPortal from './ModalPortal';
import PdfCanvasViewer from './PdfCanvasViewer';

// Sub-components
import DocViewerHeader from './viewer/DocViewerHeader';
import DocViewerFooter from './viewer/DocViewerFooter';
import { DocViewerLoading, DocViewerTimeout, DocViewerError } from './viewer/DocViewerOverlays';

/**
 * SecureDocViewer - แสดงเอกสารภายในแอป แบบ Modular
 */
const DocViewer = ({
  url,
  fileName,
  viewerType,
  extension,
  title,
  onClose,
  onComplete,
  onRefreshUrl,
  isCompleted = false,
}) => {
  const overlayRef = React.useRef(null);
  const [viewerUrl, setViewerUrl] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [completionReady, setCompletionReady] = React.useState(Boolean(isCompleted));
  const [completionError, setCompletionError] = React.useState('');
  const [iframeLoaded, setIframeLoaded] = React.useState(false);
  const [hasTimedOut, setHasTimedOut] = React.useState(false);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const loadTimeoutRef = React.useRef(null);
  const autoRetryAttemptedRef = React.useRef(false);
  const iframeLoadedRef = React.useRef(false);

  const normalizedFileName = String(fileName || '').toLowerCase();
  const normalizedExtension = String(extension || '').toLowerCase();
  const effectiveViewerType = String(viewerType || '').toLowerCase();
  
  const isMobileViewport = typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false;
  const isIosDevice = typeof window !== 'undefined' ? /iPad|iPhone|iPod/i.test(window.navigator.userAgent) : false;
  
  const isPdfDocument = effectiveViewerType === 'pdf' || normalizedExtension === 'pdf' || normalizedFileName.endsWith('.pdf');
  const isIosMobilePdf = isIosDevice && isMobileViewport && isPdfDocument;
  const shouldUsePdfCanvasViewer = isPdfDocument && isMobileViewport;

  React.useEffect(() => {
    setCompletionReady(Boolean(isCompleted));
    setCompletionError('');
    setSubmitting(false);
  }, [isCompleted, url]);

  React.useEffect(() => {
    iframeLoadedRef.current = iframeLoaded;
  }, [iframeLoaded]);

  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && (event.key === 's' || event.key === 'p')) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    setLoading(true);

    if (!url) {
      setViewerUrl('');
      setError('ไม่พบ URL เอกสาร');
      setLoading(false);
      return () => document.removeEventListener('keydown', handleKeyDown, true);
    }

    const resolvedUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    const normalizedUrl = resolvedUrl.toLowerCase().split('?')[0];
    const isPdf = isPdfDocument || normalizedUrl.endsWith('.pdf') || normalizedUrl.includes('/documents/');
    const encoded = encodeURIComponent(resolvedUrl);

    autoRetryAttemptedRef.current = false;
    setIsRetrying(false);

    if (isPdf) {
      setViewerUrl(shouldUsePdfCanvasViewer || isIosMobilePdf ? resolvedUrl : `${resolvedUrl}#toolbar=0&navpanes=0&pagemode=none&zoom=page-fit`);
    } else {
      setViewerUrl(`https://docs.google.com/viewer?url=${encoded}&embedded=true`);
    }

    setError(null);
    setIframeLoaded(false);
    setHasTimedOut(false);
    setLoading(false);

    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(() => {
      if (!iframeLoadedRef.current) setHasTimedOut(true);
    }, isPdf && isMobileViewport ? 12000 : 10000);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    };
  }, [url, effectiveViewerType, normalizedExtension, normalizedFileName, isIosMobilePdf, isMobileViewport, shouldUsePdfCanvasViewer, isPdfDocument]);

  const handleClose = async () => {
    if (submitting) return;
    if (completionReady) {
      onClose();
      return;
    }
    try {
      setSubmitting(true);
      await onComplete?.();
      onClose();
    } catch (err) {
      console.error('Auto-complete on close error:', err);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishReading = async () => {
    if (submitting) return;
    if (completionReady) {
      onClose();
      return;
    }
    try {
      setSubmitting(true);
      setCompletionError('');
      const result = await onComplete?.();
      if (result === false) {
        setCompletionError('ไม่สามารถบันทึกความคืบหน้าได้ โปรดลองอีกครั้ง');
        return;
      }
      setCompletionReady(true);
      onClose();
    } catch (completionRequestError) {
      console.error('Complete document lesson error:', completionRequestError);
      setCompletionError('ไม่สามารถบันทึกความคืบหน้าได้ โปรดลองอีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetryLoad = React.useCallback(async ({ silent = false } = {}) => {
    setHasTimedOut(false);
    setIframeLoaded(false);
    setError(null);
    setIsRetrying(true);

    if (typeof onRefreshUrl === 'function') {
      if (!silent) setLoading(true);
      try {
        const refreshedUrl = await onRefreshUrl();
        if (!refreshedUrl) {
          setLoading(false);
          setError('ไม่สามารถเชื่อมต่อเอกสารได้ในขณะนี้');
        }
      } catch (refreshError) {
        console.error('Refresh document access error:', refreshError);
        setLoading(false);
        setError('ไม่สามารถเชื่อมต่อเอกสารได้ในขณะนี้');
      }
    } else {
      setViewerUrl((currentUrl) => currentUrl);
    }
    setIsRetrying(false);
  }, [onRefreshUrl]);

  React.useEffect(() => {
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, []);

  React.useEffect(() => {
    if (!hasTimedOut || autoRetryAttemptedRef.current || typeof onRefreshUrl !== 'function') return;
    autoRetryAttemptedRef.current = true;
    const retryTimer = window.setTimeout(() => handleRetryLoad({ silent: true }), 400);
    return () => window.clearTimeout(retryTimer);
  }, [handleRetryLoad, hasTimedOut, onRefreshUrl]);

  const isGoogleViewer = viewerUrl.includes('docs.google.com/viewer');

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex flex-col bg-black animate-fade-in overflow-hidden h-[100dvh]" onContextMenu={(event) => event.preventDefault()}>
        <style>{`@media print { .doc-viewer-print-guard { display: none !important; } }`}</style>

        <div className="doc-viewer-print-guard flex h-full w-full flex-col overflow-hidden">
          <DocViewerHeader title={title} onClose={handleClose} submitting={submitting} />

          <div className={`relative flex flex-1 items-center justify-center ${shouldUsePdfCanvasViewer || isIosMobilePdf ? 'overflow-auto bg-white' : 'overflow-hidden bg-slate-900'}`}>
            <DocViewerLoading show={loading} />
            
            {!loading && !iframeLoaded && (
              <DocViewerTimeout 
                show={hasTimedOut || !iframeLoaded} 
                isRetrying={isRetrying} 
                onRetry={handleRetryLoad} 
                onClose={handleClose} 
              />
            )}

            {error ? (
              <DocViewerError error={error} onClose={onClose} />
            ) : shouldUsePdfCanvasViewer ? (
              <div className={`relative h-full w-full transition-opacity duration-700 ${iframeLoaded ? 'opacity-100' : 'opacity-0'}`}>
                <PdfCanvasViewer
                  url={viewerUrl}
                  onLoad={() => {
                    setIframeLoaded(true);
                    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
                  }}
                  onError={(message) => {
                    setError(message);
                    setLoading(false);
                    setHasTimedOut(false);
                  }}
                />
              </div>
            ) : (
              <div className={`${isIosMobilePdf ? 'relative h-full w-full overflow-auto bg-white' : 'absolute inset-0 h-full w-full overflow-hidden'} transition-opacity duration-700 ${iframeLoaded ? 'opacity-100' : 'opacity-0'}`}>
                <iframe
                  key={viewerUrl}
                  src={viewerUrl}
                  scrolling={isIosMobilePdf ? 'yes' : 'auto'}
                  onLoad={() => {
                    setIframeLoaded(true);
                    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
                  }}
                  title={title || 'เอกสาร'}
                  style={isIosMobilePdf ? {
                    display: 'block', width: '100%', height: '100%', minHeight: '100%', border: 'none', background: '#ffffff', overflow: 'auto', WebkitOverflowScrolling: 'touch'
                  } : isGoogleViewer ? {
                    position: 'absolute', top: '-50px', left: 0, width: '100%', height: 'calc(100% + 50px)', border: 'none'
                  } : {
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none'
                  }}
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            <div ref={overlayRef} className="absolute inset-0 z-10" onContextMenu={(event) => event.preventDefault()} style={{ pointerEvents: 'none' }} />
          </div>

          <DocViewerFooter 
            show={!shouldUsePdfCanvasViewer}
            completionReady={completionReady}
            submitting={submitting}
            completionError={completionError}
            onFinishReading={handleFinishReading}
          />
        </div>
      </div>
    </ModalPortal>
  );
};

export default DocViewer;
