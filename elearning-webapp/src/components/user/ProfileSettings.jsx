import React from 'react';
import { Settings, ChevronRight, Bell, Shield, PenLine, Upload, PencilLine, Eraser, CheckCircle2 } from 'lucide-react';

const SIGNATURE_WIDTH = 1000;
const SIGNATURE_HEIGHT = 300;

const fileToImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();

  image.onload = () => {
    URL.revokeObjectURL(url);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('Unable to read image.'));
  };
  image.src = url;
});

const canvasToFile = (canvas) => new Promise((resolve) => {
  canvas.toBlob((blob) => {
    resolve(new File([blob], `signature-${Date.now()}.png`, { type: 'image/png' }));
  }, 'image/png');
});

const normalizeSignatureFile = async (file) => {
  const image = await fileToImage(file);
  if (image.naturalWidth !== SIGNATURE_WIDTH || image.naturalHeight !== SIGNATURE_HEIGHT) {
    throw new Error('Signature image must be exactly 1000 x 300 px.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = SIGNATURE_WIDTH;
  canvas.height = SIGNATURE_HEIGHT;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, SIGNATURE_WIDTH, SIGNATURE_HEIGHT);
  ctx.drawImage(image, 0, 0);

  const pixels = ctx.getImageData(0, 0, SIGNATURE_WIDTH, SIGNATURE_HEIGHT).data;
  let hasTransparentPixel = false;
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] < 255) {
      hasTransparentPixel = true;
      break;
    }
  }

  if (!hasTransparentPixel) {
    throw new Error('Signature image must have a transparent background.');
  }

  return canvasToFile(canvas);
};

const ProfileSettings = ({
  user,
  notificationsEnabled,
  onToggleNotifications,
  onShowPasswordModal,
  onShowPrivacyModal,
  onSaveSignature,
  onUploadSignature,
  savingSignature,
  uploadingSignature,
}) => {
  const [signatureTitle, setSignatureTitle] = React.useState(user?.signatureTitle || 'Instructor');
  const [signatureImageUrl, setSignatureImageUrl] = React.useState(user?.signatureImageUrl || '');
  const [signatureMode, setSignatureMode] = React.useState('upload');
  const [setupOpen, setSetupOpen] = React.useState(false);
  const [drawn, setDrawn] = React.useState(false);
  const canvasRef = React.useRef(null);
  const fileInputRef = React.useRef(null);
  const isDrawingRef = React.useRef(false);
  const lastPointRef = React.useRef(null);

  React.useEffect(() => {
    setSignatureTitle(user?.signatureTitle || 'Instructor');
    setSignatureImageUrl(user?.signatureImageUrl || '');
    setSetupOpen(false);
  }, [user?.signatureImageUrl, user?.signatureTitle]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = SIGNATURE_WIDTH;
    canvas.height = SIGNATURE_HEIGHT;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, SIGNATURE_WIDTH, SIGNATURE_HEIGHT);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 7;
    setDrawn(false);
  }, [signatureMode]);

  const validateSignatureFile = (file) => {
    if (!['image/png', 'image/webp'].includes(file.type)) {
      throw new Error('Signature must be PNG or WebP.');
    }
  };

  const handleSignatureFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      validateSignatureFile(file);
      const normalizedFile = await normalizeSignatureFile(file);
      const uploaded = await onUploadSignature(normalizedFile);
      if (uploaded?.fileUrl) {
        setSignatureImageUrl(uploaded.fileUrl);
      }
    } catch (error) {
      window.alert(error.message || 'Invalid signature image.');
    } finally {
      event.target.value = '';
    }
  };

  const getCanvasPoint = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * SIGNATURE_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * SIGNATURE_HEIGHT
    };
  };

  const startDrawing = (event) => {
    event.preventDefault();
    isDrawingRef.current = true;
    lastPointRef.current = getCanvasPoint(event);
    canvasRef.current?.setPointerCapture?.(event.pointerId);
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
    setDrawn(true);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearDrawing = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, SIGNATURE_WIDTH, SIGNATURE_HEIGHT);
    setDrawn(false);
  };

  const saveDrawnSignature = async () => {
    if (!drawn || !canvasRef.current) return;

    const file = await canvasToFile(canvasRef.current);
    const uploaded = await onUploadSignature(file);
    if (uploaded?.fileUrl) {
      setSignatureImageUrl(uploaded.fileUrl);
    }
  };

  return (
    <div className="mt-2 flex flex-col gap-1">
      <h4 className="mb-2 pl-2 text-xs font-bold tracking-[0.04em] text-gray-500">
        การตั้งค่า
      </h4>

      <div className="card flex flex-col divide-y divide-gray-100 overflow-hidden border border-gray-100 bg-white shadow-sm">
        <button
          type="button"
          onClick={onShowPasswordModal}
          className="group flex items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-gray-100 p-2.5 text-gray-700 transition-transform group-hover:scale-105">
              <Settings size={20} />
            </div>
            <div>
              <span className="mb-0.5 block text-sm font-bold text-gray-900">
                เปลี่ยนรหัสผ่าน
              </span>
              <span className="block text-xs font-medium text-gray-400">
                อัปเดตรหัสผ่านใหม่เพื่อความปลอดภัย
              </span>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-300 transition-colors group-hover:text-gray-500" />
        </button>

        <div className="p-4">
          <div className="mb-4 flex items-center gap-4">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <PenLine size={20} />
            </div>
            <div>
              <span className="mb-0.5 block text-sm font-bold text-gray-900">Instructor signature</span>
              <span className="block text-xs font-medium text-gray-400">
                Used when this instructor signs course certificates.
              </span>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/png,image/webp"
            onChange={handleSignatureFile}
          />

          {!setupOpen && signatureImageUrl ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400">Current signature</p>
                  <img src={signatureImageUrl} alt="Instructor signature" className="h-16 max-w-full object-contain" />
                </div>
                <button
                  type="button"
                  onClick={() => setSetupOpen(true)}
                  className="btn btn-outline btn-sm inline-flex items-center justify-center gap-2"
                >
                  <PenLine size={14} /> Change signature
                </button>
              </div>
            </div>
          ) : (
            <>
              {!signatureImageUrl && !setupOpen ? (
                <button
                  type="button"
                  onClick={() => setSetupOpen(true)}
                  className="btn btn-primary btn-sm gap-2"
                >
                  <PenLine size={14} /> Add signature
                </button>
              ) : (
                <>
                  <label className="mb-1.5 ml-1 block text-xs font-black text-slate-500">Signature title</label>
                  <input
                    type="text"
                    className="form-input w-full"
                    value={signatureTitle}
                    onChange={(event) => setSignatureTitle(event.target.value)}
                    placeholder="Instructor, Course Owner, Trainer"
                  />

                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => setSignatureMode('upload')}
                      className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition-colors ${
                        signatureMode === 'upload' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <Upload size={15} />
                      Upload image
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureMode('draw')}
                      className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition-colors ${
                        signatureMode === 'draw' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <PencilLine size={15} />
                      Sign on web
                    </button>
                  </div>

                  {signatureMode === 'upload' ? (
                    <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-slate-900">Upload transparent signature</p>
                          <p className="mt-1 text-xs font-bold leading-relaxed text-slate-500">
                            PNG or WebP only. Transparent background. Exact size: 1000 x 300 px.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingSignature}
                          className="btn btn-outline btn-sm inline-flex items-center justify-center gap-2"
                        >
                          <Upload size={14} /> {uploadingSignature ? 'Uploading...' : 'Choose file'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%),linear-gradient(-45deg,#f8fafc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8fafc_75%),linear-gradient(-45deg,transparent_75%,#f8fafc_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0]">
                        <canvas
                          ref={canvasRef}
                          className="block aspect-[10/3] w-full touch-none bg-white/70"
                          onPointerDown={startDrawing}
                          onPointerMove={continueDrawing}
                          onPointerUp={stopDrawing}
                          onPointerCancel={stopDrawing}
                          onPointerLeave={stopDrawing}
                        />
                      </div>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <button type="button" onClick={clearDrawing} className="btn btn-outline btn-sm gap-2">
                          <Eraser size={14} /> Clear
                        </button>
                        <button
                          type="button"
                          onClick={saveDrawnSignature}
                          disabled={!drawn || uploadingSignature}
                          className="btn btn-primary btn-sm gap-2"
                        >
                          <CheckCircle2 size={14} /> {uploadingSignature ? 'Saving...' : 'Use this signature'}
                        </button>
                      </div>
                    </div>
                  )}

                  {signatureImageUrl && (
                    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400">Current signature</p>
                      <img src={signatureImageUrl} alt="Instructor signature" className="h-16 max-w-full object-contain" />
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {setupOpen && (
            <button
              type="button"
              onClick={() => onSaveSignature({ signatureTitle, signatureImageUrl })}
              disabled={savingSignature || uploadingSignature}
              className="btn btn-primary btn-sm mt-3"
            >
              {savingSignature ? 'Saving...' : 'Save signature'}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleNotifications}
          aria-pressed={notificationsEnabled}
          className="group flex items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 transition-transform group-hover:scale-105">
              <Bell size={20} />
            </div>
            <div>
              <span className="mb-0.5 block text-sm font-bold text-gray-900">การแจ้งเตือน</span>
              <span className="block text-xs font-medium text-gray-400">
                {notificationsEnabled ? 'เปิดการแจ้งเตือนอยู่' : 'ปิดการแจ้งเตือนแล้ว'}
              </span>
            </div>
          </div>
          <div
            className={`flex h-6 w-12 items-center rounded-full p-1 transition-colors ${
              notificationsEnabled ? 'bg-primary' : 'bg-gray-200'
            }`}
          >
            <div
              className={`h-4 w-4 rounded-full bg-white transition-transform ${
                notificationsEnabled ? 'translate-x-6' : ''
              }`}
            />
          </div>
        </button>

        <button
          type="button"
          onClick={onShowPrivacyModal}
          className="group flex items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 transition-transform group-hover:scale-105">
              <Shield size={20} />
            </div>
            <div>
              <span className="mb-0.5 block text-sm font-bold text-gray-900">
                ความเป็นส่วนตัว
              </span>
              <span className="block text-xs font-medium text-gray-400">
                นโยบายและเงื่อนไข
              </span>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-300 transition-colors group-hover:text-gray-500" />
        </button>
      </div>
    </div>
  );
};

export default ProfileSettings;
