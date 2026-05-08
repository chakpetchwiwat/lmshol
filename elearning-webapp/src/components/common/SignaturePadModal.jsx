import React from 'react';
import { X, Eraser, CheckCircle2, PenLine, Loader2 } from 'lucide-react';
import ModalPortal from './ModalPortal';

const SIGNATURE_WIDTH = 1000;
const SIGNATURE_HEIGHT = 300;

const SignaturePadModal = ({ isOpen, onClose, onSave, title = 'เซ็นชื่อบนเว็บ', initialImageUrl = null }) => {
  const canvasRef = React.useRef(null);
  const isDrawingRef = React.useRef(false);
  const lastPointRef = React.useRef(null);
  const [hasNewDrawing, setHasNewDrawing] = React.useState(false);
  const [loadingImg, setLoadingImg] = React.useState(false);
  const [showInitial, setShowInitial] = React.useState(false);

  // Initialize Canvas
  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = SIGNATURE_WIDTH;
          canvas.height = SIGNATURE_HEIGHT;
          const ctx = canvas.getContext('2d');
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 5;
          ctx.clearRect(0, 0, SIGNATURE_WIDTH, SIGNATURE_HEIGHT);
          setHasNewDrawing(false);
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle Initial Image State
  React.useEffect(() => {
    if (isOpen && initialImageUrl) {
      setLoadingImg(true);
      const img = new Image();
      img.src = initialImageUrl;
      img.onload = () => {
        setShowInitial(true);
        setLoadingImg(false);
      };
      img.onerror = () => {
        setLoadingImg(false);
        console.error('Failed to load initial signature image');
      };
    } else {
        setShowInitial(false);
    }
  }, [isOpen, initialImageUrl]);

  const getCanvasPoint = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = SIGNATURE_WIDTH / rect.width;
    const scaleY = SIGNATURE_HEIGHT / rect.height;

    const clientX = event.clientX || (event.touches && event.touches[0].clientX);
    const clientY = event.clientY || (event.touches && event.touches[0].clientY);

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (event) => {
    event.preventDefault();
    isDrawingRef.current = true;
    lastPointRef.current = getCanvasPoint(event);
    if (canvasRef.current?.setPointerCapture) {
      canvasRef.current.setPointerCapture(event.pointerId);
    }
  };

  const continueDrawing = (event) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    event.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const nextPoint = getCanvasPoint(event);

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(nextPoint.x, nextPoint.y);
    ctx.stroke();

    lastPointRef.current = nextPoint;
    if (!hasNewDrawing) setHasNewDrawing(true);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearDrawing = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, SIGNATURE_WIDTH, SIGNATURE_HEIGHT);
      setHasNewDrawing(false);
      setShowInitial(false); // Clear the reference to old signature too
    }
  };

  const handleSave = () => {
    if (!canvasRef.current) return;

    // If they drew something new, save the new one
    if (hasNewDrawing) {
        canvasRef.current.toBlob((blob) => {
            const file = new File([blob], `signature-${Date.now()}.png`, { type: 'image/png' });
            onSave(file);
            onClose();
        }, 'image/png');
    } else {
        // If they didn't draw anything, but there's an old one, just close (keep old)
        // Or if they cleared everything, they might want to save an empty one?
        // Usually, clicking save without drawing means "I'm happy with what's there"
        onClose();
    }
  };

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 backdrop-blur-xl">
        <div className="absolute inset-0 bg-slate-950/40" onClick={onClose} />
        
        <div className="relative w-full max-w-4xl overflow-hidden rounded-[2.5rem] bg-white shadow-[0_40px_120px_-20px_rgba(15,23,42,0.6)] animate-in fade-in zoom-in duration-300">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <PenLine size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">{title}</h3>
                <p className="text-sm font-medium text-slate-500">เซ็นชื่อในกรอบด้านล่าง หรือใช้ของเดิมที่มีอยู่</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-100 p-3 text-slate-400 transition-all hover:bg-slate-200 hover:text-slate-900"
            >
              <X size={20} />
            </button>
          </div>

          {/* Canvas Body */}
          <div className="p-8">
            <div className="relative aspect-[10/3] w-full overflow-hidden rounded-3xl border-2 border-slate-200 bg-white transition-all focus-within:border-primary/50 shadow-inner">
              {/* Overlay: Initial Image Background (Lower layer) */}
              {showInitial && initialImageUrl && !hasNewDrawing && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4 opacity-30">
                  <img src={initialImageUrl} alt="Existing signature" className="h-full w-full object-contain" />
                </div>
              )}

              {/* Grid Background Pattern */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]" />
              
              <canvas
                ref={canvasRef}
                className="relative z-10 block h-full w-full touch-none cursor-crosshair"
                onPointerDown={startDrawing}
                onPointerMove={continueDrawing}
                onPointerUp={stopDrawing}
                onPointerCancel={stopDrawing}
                onPointerLeave={stopDrawing}
              />
              
              {!hasNewDrawing && !loadingImg && !showInitial && (
                <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
                  <p className="text-slate-200 font-black uppercase tracking-[0.2em] text-2xl md:text-4xl opacity-30">
                    SIGN HERE
                  </p>
                </div>
              )}

              {loadingImg && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                  <Loader2 className="animate-spin text-primary" size={32} />
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  ลายเซ็นจะถูกจัดขนาดให้เหมาะสมกับเกียรติบัตรโดยอัตโนมัติ (1000 x 300 px)
                </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row gap-4 border-t border-slate-100 bg-slate-50/50 px-8 py-6">
            <button
              type="button"
              onClick={clearDrawing}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white font-black text-slate-600 transition-all hover:bg-slate-100 active:scale-95 shadow-sm"
            >
              <Eraser size={20} />
              ล้างและเซ็นใหม่
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex h-14 flex-[2] items-center justify-center gap-2 rounded-2xl bg-primary font-black text-white shadow-xl shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-2xl active:scale-95 disabled:opacity-50 disabled:shadow-none disabled:active:scale-100"
            >
              <CheckCircle2 size={20} />
              {hasNewDrawing ? 'บันทึกลายเซ็นใหม่' : (showInitial ? 'ใช้ลายเซ็นเดิม' : 'ตกลง')}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default SignaturePadModal;
