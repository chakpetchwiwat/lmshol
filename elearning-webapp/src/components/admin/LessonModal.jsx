import React from 'react';
import { X, Upload, FileText, Play, ClipboardCheck } from 'lucide-react';
import QuizBuilder from './QuizBuilder';
import ModalPortal from '../common/ModalPortal';
import RichTextEditor from '../common/RichTextEditor';
import CustomSelect from '../common/CustomSelect';
import MediaLibraryModal from '../common/MediaLibraryModal';

const LessonModal = ({
  isOpen,
  onClose,
  onSave,
  lessonForm,
  setLessonForm,
  uploading,
  editorImageUploading,
  onDocUpload,
  onEditorImageUpload,
  isEditing = false,
}) => {
  const docInputRef = React.useRef(null);
  const videoInputRef = React.useRef(null);
  const [sourceMode, setSourceMode] = React.useState('link');
  const [mediaLibrary, setMediaLibrary] = React.useState({
    isOpen: false,
    allowedTypes: 'all',
    onSelect: null
  });

  React.useEffect(() => {
    if (isOpen) {
      const url = lessonForm.contentUrl || '';
      const isVideo = lessonForm.type === 'video';
      
      if (isVideo) {
        const isMoodleOrYoutube = url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
        if (url && !isMoodleOrYoutube && (url.startsWith('/uploads/') || url.includes('/uploads/'))) {
          setSourceMode('upload');
        } else {
          setSourceMode('link');
        }
      } else if (lessonForm.type === 'pdf') {
        if (url && !url.startsWith('/uploads/') && !url.includes('/uploads/')) {
          setSourceMode('link');
        } else {
          setSourceMode('upload');
        }
      }
    }
  }, [isOpen, lessonForm.type, lessonForm.contentUrl]);

  if (!isOpen) return null;

  const handleTypeChange = (event) => {
    const nextType = event.target.value;
    setLessonForm({
      ...lessonForm,
      type: nextType,
      points: nextType === 'assessment' && !lessonForm.points ? 10 : lessonForm.points,
      passScore: ['quiz', 'assessment'].includes(nextType) && !lessonForm.passScore ? 60 : lessonForm.passScore,
      questions: nextType === 'quiz' ? lessonForm.questions : [],
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave(event);
  };

  const renderLessonSourceField = () => {
    if (lessonForm.type === 'video') {
      return (
        <div className="md:col-span-2 space-y-3">
          <label className="mb-1 block text-sm font-bold text-gray-700">
            แหล่งที่มาวิดีโอ
          </label>
          <div className="flex gap-4 mb-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="videoSourceMode"
                value="link"
                checked={sourceMode === 'link'}
                onChange={() => setSourceMode('link')}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-sm font-bold text-slate-700">ลิงก์วิดีโอ (YouTube / Vimeo / URL)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="videoSourceMode"
                value="upload"
                checked={sourceMode === 'upload'}
                onChange={() => setSourceMode('upload')}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-sm font-bold text-slate-700">อัปโหลดไฟล์วิดีโอ (MP4/WebM)</span>
            </label>
          </div>

          {sourceMode === 'link' ? (
            <div className="flex flex-col gap-1.5">
              <input
                type="text"
                className="form-input w-full"
                value={lessonForm.contentUrl}
                onChange={(event) => setLessonForm({ ...lessonForm, contentUrl: event.target.value })}
                placeholder="https://www.youtube.com/watch?v=... หรือ https://vimeo.com/..."
              />
              <p className="flex items-center gap-1 text-[10px] text-muted">
                <Play size={10} /> รองรับลิงก์ YouTube และ Vimeo หรือ URL วิดีโอโดยตรง
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                type="file"
                ref={videoInputRef}
                onChange={onDocUpload}
                className="hidden"
                accept="video/mp4,video/webm,video/ogg"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  className="form-input flex-1 font-mono text-xs"
                  value={lessonForm.contentUrl}
                  onChange={(event) => setLessonForm({ ...lessonForm, contentUrl: event.target.value })}
                  placeholder="URL หรืออัปโหลดไฟล์วิดีโอ"
                  readOnly={uploading}
                />
                <button
                  type="button"
                  onClick={() => setMediaLibrary({
                    isOpen: true,
                    allowedTypes: 'video',
                    onSelect: (file) => setLessonForm({ ...lessonForm, contentUrl: file.fileUrl })
                  })}
                  className="btn btn-outline btn-sm shrink-0"
                >
                  เลือกจากคลังสื่อ
                </button>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={uploading}
                  className="btn btn-outline btn-sm shrink-0 gap-1"
                >
                  {uploading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                  ) : (
                    <Upload size={14} />
                  )}
                  อัปโหลด
                </button>
              </div>
              {lessonForm.contentUrl && (
                <p className="flex items-center gap-1 text-[10px] font-bold text-green-600">
                  <Play size={12} className="text-green-600" /> เลือกวิดีโอแล้ว
                </p>
              )}
            </div>
          )}
        </div>
      );
    }

    if (lessonForm.type === 'pdf') {
      return (
        <div className="md:col-span-2 space-y-3">
          <label className="mb-1 block text-sm font-bold text-gray-700">
            แหล่งที่มาเอกสาร
          </label>
          <div className="flex gap-4 mb-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="pdfSourceMode"
                value="upload"
                checked={sourceMode === 'upload'}
                onChange={() => setSourceMode('upload')}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-sm font-bold text-slate-700">อัปโหลดไฟล์เอกสาร (PDF/Word/Excel)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="pdfSourceMode"
                value="link"
                checked={sourceMode === 'link'}
                onChange={() => setSourceMode('link')}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-sm font-bold text-slate-700">ลิงก์เอกสารภายนอก (Direct URL)</span>
            </label>
          </div>

          {sourceMode === 'link' ? (
            <div className="flex flex-col gap-1.5">
              <input
                type="text"
                className="form-input w-full"
                value={lessonForm.contentUrl}
                onChange={(event) => setLessonForm({ ...lessonForm, contentUrl: event.target.value })}
                placeholder="https://example.com/document.pdf"
              />
              <p className="flex items-center gap-1 text-[10px] text-muted">
                <FileText size={10} /> ระบุลิงก์ตรงไปยังเอกสาร PDF หรือเอกสารอื่น ๆ
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                type="file"
                ref={docInputRef}
                onChange={onDocUpload}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  className="form-input flex-1 font-mono text-xs"
                  value={lessonForm.contentUrl}
                  onChange={(event) => setLessonForm({ ...lessonForm, contentUrl: event.target.value })}
                  placeholder="URL หรืออัปโหลดไฟล์"
                  readOnly={uploading}
                />
                <button
                  type="button"
                  onClick={() => setMediaLibrary({
                    isOpen: true,
                    allowedTypes: 'document',
                    onSelect: (file) => setLessonForm({ ...lessonForm, contentUrl: file.fileUrl })
                  })}
                  className="btn btn-outline btn-sm shrink-0"
                >
                  เลือกจากคลังสื่อ
                </button>
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  disabled={uploading}
                  className="btn btn-outline btn-sm shrink-0 gap-1"
                >
                  {uploading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                  ) : (
                    <Upload size={14} />
                  )}
                  อัปโหลด
                </button>
              </div>
              {lessonForm.contentUrl && (
                <p className="flex items-center gap-1 text-[10px] font-bold text-green-600">
                  <FileText size={12} /> เลือกเอกสารแล้ว
                </p>
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="md:col-span-2 rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3">
        <p className="text-sm font-bold text-primary">บทความจะแสดงจากเนื้อหาด้านล่างเป็นหลัก</p>
        <p className="mt-1 text-xs text-muted">
          คุณสามารถจัดรูปแบบข้อความ ใส่ลิงก์ และปรับสีข้อความได้จาก editor นี้
        </p>
      </div>
    );
  };

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
        <div className="card flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden border border-gray-100 bg-white p-0 shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
            <h4 className="text-lg font-bold">{isEditing ? 'แก้ไขบทเรียน' : 'เพิ่มบทเรียนใหม่'}</h4>
            <button type="button" onClick={onClose} className="text-muted hover:text-gray-900">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-bold text-gray-700">ชื่อบทเรียน/บทที่</label>
                  <input
                    required
                    type="text"
                    className="form-input w-full"
                    value={lessonForm.title}
                    onChange={(event) => setLessonForm({ ...lessonForm, title: event.target.value })}
                    placeholder="เช่น บทนำเครื่องจักร"
                  />
                </div>

                <CustomSelect
                  label="ประเภทเนื้อหา"
                  value={lessonForm.type}
                  onChange={handleTypeChange}
                  options={[
                    { value: 'video', label: 'วิดีโอ (YouTube / Vimeo)' },
                    { value: 'pdf', label: 'เอกสาร (PDF/Link)' },
                    { value: 'article', label: 'บทความเนื้อหา' },
                    { value: 'quiz', label: 'แบบทดสอบ (Quiz)' },
                    { value: 'assessment', label: 'Assessment Upload' }
                  ]}
                />

                <div>
                  <label className="mb-1 block text-sm font-bold text-gray-700">ระยะเวลา (นาที)</label>
                  <div className="relative">
                    <input
                      type="number"
                      className="form-input w-full"
                      value={lessonForm.duration || 0}
                      onChange={(event) => setLessonForm({ 
                        ...lessonForm, 
                        duration: parseInt(event.target.value, 10) || 0 
                      })}
                      min="0"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      นาที
                    </div>
                  </div>
                </div>

                {lessonForm.type === 'assessment' ? (
                  <div className="md:col-span-2 space-y-6">
                    <div className="relative p-6 rounded-[2rem] border border-slate-200 bg-slate-50/50">
                      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                        <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                          <ClipboardCheck size={20} />
                        </div>
                        <div>
                          <h5 className="text-base font-black text-slate-900">การตั้งค่าการส่งงาน (Assessment)</h5>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">กำหนดเกณฑ์การประเมินและคำแนะนำ</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider ml-1">
                            คะแนนเต็ม (Max Score)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              className="w-full bg-white border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                              value={lessonForm.points}
                              min="1"
                              onChange={(event) => setLessonForm({
                                ...lessonForm,
                                points: parseInt(event.target.value, 10) || 10,
                              })}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">POINTS</div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider ml-1">
                            เกณฑ์ผ่าน (Pass Score %)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              className="w-full bg-white border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                              value={lessonForm.passScore}
                              min="0"
                              max="100"
                              onChange={(event) => setLessonForm({
                                ...lessonForm,
                                passScore: parseInt(event.target.value, 10) || 0,
                              })}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">%</div>
                          </div>
                        </div>

                        <div className="md:col-span-2 space-y-1.5">
                          <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider ml-1">
                            คำอธิบายและโจทย์ (Instructions)
                          </label>
                          <div className="rounded-[1.5rem] border border-slate-200 bg-white overflow-hidden focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary transition-all">
                            <RichTextEditor
                              label="Assessment instruction editor"
                              value={lessonForm.content || ''}
                              onChange={(content) => setLessonForm({ ...lessonForm, content })}
                              onImageUpload={onEditorImageUpload}
                              imageUploading={editorImageUploading}
                              minHeight={260}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : lessonForm.type !== 'quiz' ? (
                  <>
                    {renderLessonSourceField()}

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-bold text-gray-700">
                        เนื้อหาบทเรียน (Text/Content)
                      </label>
                      <RichTextEditor
                        label="Lesson content editor"
                        value={lessonForm.content || ''}
                        onChange={(content) => setLessonForm({ ...lessonForm, content })}
                        onImageUpload={onEditorImageUpload}
                        imageUploading={editorImageUploading}
                        minHeight={260}
                      />
                      <p className="mt-1 text-[10px] text-muted">
                        รองรับตัวหนา ตัวเอียง ขีดเส้นใต้ ลิงก์ สีข้อความ อัปโหลดรูป และล้างรูปแบบข้อความ โดยจะบันทึกเป็น HTML ที่พร้อมแสดงผลในหน้าเรียน
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="relative mt-2 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:col-span-2">
                    <div className="flex items-center justify-between border-b pb-3">
                      <h5 className="text-lg font-bold text-primary">สเปกแบบทดสอบ (Quiz Builder)</h5>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">
                          คะแนนรวมที่จะได้รับ (Points)
                        </label>
                        <input
                          type="number"
                          className="form-input w-full"
                          value={lessonForm.points}
                          onChange={(event) => setLessonForm({
                            ...lessonForm,
                            points: parseInt(event.target.value, 10) || 0,
                          })}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-bold text-gray-700">
                          เกณฑ์สอบผ่าน (Pass Score %)
                        </label>
                        <input
                          type="number"
                          className="form-input w-full"
                          value={lessonForm.passScore}
                          onChange={(event) => setLessonForm({
                            ...lessonForm,
                            passScore: parseInt(event.target.value, 10) || 0,
                          })}
                        />
                      </div>
                    </div>

                    <QuizBuilder
                      questions={lessonForm.questions}
                      onChange={(questions) => setLessonForm({ ...lessonForm, questions })}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 border-t border-gray-100 bg-gray-50 p-4">
              <button type="button" onClick={onClose} className="btn btn-outline flex-1 py-3">
                ยกเลิก
              </button>
              <button type="submit" className="btn btn-primary flex-1 py-3 font-bold">
                บันทึกบทเรียน
              </button>
            </div>
          </form>
        </div>
      </div>
      <MediaLibraryModal
        isOpen={mediaLibrary.isOpen}
        allowedTypes={mediaLibrary.allowedTypes}
        onClose={() => setMediaLibrary(prev => ({ ...prev, isOpen: false }))}
        onSelect={mediaLibrary.onSelect}
      />
    </ModalPortal>
  );
};

export default LessonModal;
