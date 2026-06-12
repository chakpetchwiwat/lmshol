import React from 'react';
import { X, Upload, FileDown, CheckCircle2, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { adminAPI } from '../../utils/api';
import { useToast } from '../../context/useToast';

const ImportModal = ({ isOpen, onClose, type = 'profiles', onImportSuccess }) => {
  const toast = useToast();
  const [file, setFile] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState(null);
  const [mustChangePassword, setMustChangePassword] = React.useState(true);
  const fileInputRef = React.useRef(null);

  if (!isOpen) return null;

  const isProfiles = type === 'profiles';
  const title = isProfiles ? 'นำเข้าประวัติผู้เรียน (Excel)' : 'นำเข้าประวัติอบรม (Excel)';

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (ext !== 'xlsx' && ext !== 'xls') {
        toast.error('กรุณาเลือกไฟล์ Excel (.xlsx หรือ .xls) เท่านั้น');
        return;
      }
      setFile(selectedFile);
      setResults(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const selectedFile = e.dataTransfer.files[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (ext !== 'xlsx' && ext !== 'xls') {
        toast.error('กรุณาเลือกไฟล์ Excel (.xlsx หรือ .xls) เท่านั้น');
        return;
      }
      setFile(selectedFile);
      setResults(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      toast.info('กำลังดาวน์โหลดแบบฟอร์ม...');
      const response = await adminAPI.downloadTemplate(type);
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', isProfiles ? 'แบบฟอร์ม_ประวัติผู้เรียน.xlsx' : 'แบบฟอร์ม_ประวัติอบรม.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('ดาวน์โหลดแบบฟอร์มสำเร็จ');
    } catch (error) {
      console.error('Download template error:', error);
      toast.error('ดาวน์โหลดแบบฟอร์มไม่สำเร็จ');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.warning('กรุณาเลือกไฟล์ก่อนทำรายการ');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    if (isProfiles) {
      formData.append('mustChangePassword', mustChangePassword);
    }

    setLoading(true);
    setResults(null);
    try {
      const response = await adminAPI.importUsers(type, formData);
      const resData = response.data?.data || response.data || response;
      setResults(resData);
      toast.success('นำเข้าข้อมูลเรียบร้อยแล้ว');
      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (error) {
      console.error('Import error:', error);
      const errMsg = error.response?.data?.message || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResults(null);
    setMustChangePassword(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl transition-all duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="text-lg font-black text-slate-900">{title}</h3>
            <p className="mt-1 text-xs text-slate-500">อัปโหลดไฟล์ Excel เพื่ออัปเดตข้อมูลระบบอย่างรวดเร็ว</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!results ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Guidelines Info */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-xs text-blue-800">
                <div className="flex gap-2">
                  <Info size={16} className="mt-0.5 shrink-0 text-blue-600" />
                  <div className="space-y-1.5">
                    <p className="font-bold">คำแนะนำในการนำเข้าข้อมูล:</p>
                    {isProfiles ? (
                      <ul className="list-disc pl-4 space-y-1">
                        <li>ระบุคอลัมน์ <span className="font-bold">Email</span> เป็นช่องหลักในการอัปเดตข้อมูล</li>
                        <li>หากพนักงานไม่มีในระบบ ระบบจะสร้างบัญชีให้ใหม่โดยใช้ Email คอลัมน์</li>
                        <li>สามารถระบุรหัสผ่านเริ่มต้นในคอลัมน์ <span className="font-bold">Password</span> หากปล่อยว่างไว้ระบบจะตั้งรหัสผ่านเริ่มต้นเป็น <code className="bg-blue-100 px-1 py-0.5 rounded font-mono font-bold text-blue-900">P@ssword123</code></li>
                        <li>หากไม่มีแผนกหรือตำแหน่งในระบบ ระบบจะสร้างให้ใหม่โดยอัตโนมัติ</li>
                      </ul>
                    ) : (
                      <ul className="list-disc pl-4 space-y-1">
                        <li>ระบุคอลัมน์ <span className="font-bold">Email</span> หรือ <span className="font-bold">Full Name</span> (ชื่อ-นามสกุล) เพื่อจับคู่ข้อมูลพนักงานในระบบ</li>
                        <li>ระบบจะจับคู่พนักงานตามชื่อจริง หากพบชื่อและหลักสูตรซ้ำกันในวันเดิมจะถูกข้ามเพื่อป้องกันข้อมูลซ้ำซ้อน</li>
                        <li>หากพบพนักงานที่ไม่มีในระบบ แถวดังกล่าวจะข้ามการนำเข้าและรายงานผลที่จุดสิ้นสุด</li>
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* Template Download Option */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="space-y-1">
                  <div className="text-sm font-black text-slate-800">ยังไม่มีแบบฟอร์มนำเข้าใช่หรือไม่?</div>
                  <div className="text-xs text-slate-500">ดาวน์โหลดฟอร์มต้นแบบเพื่อกรอกข้อมูลให้อ่านได้ถูกต้อง</div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
                >
                  <FileDown size={14} />
                  ดาวน์โหลด Template
                </button>
              </div>

              {/* File Drag & Drop Upload Zone */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
                  file
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : 'border-slate-200 bg-slate-50/50 hover:border-primary/40 hover:bg-primary/5'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls"
                  className="hidden"
                />

                <div className={`mb-3 inline-flex rounded-2xl p-4 ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  <Upload size={24} />
                </div>

                {file ? (
                  <div className="space-y-1.5">
                    <p className="text-sm font-black text-slate-800">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB · พร้อมนำเข้า</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReset();
                      }}
                      className="mt-2 text-xs font-bold text-red-500 transition-colors hover:text-red-700 hover:underline"
                    >
                      เลือกไฟล์ใหม่
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-sm font-black text-slate-800">ลากและวางไฟล์ หรือคลิกเพื่ออัปโหลด</p>
                    <p className="text-xs text-slate-500">รองรับไฟล์ Excel (.xlsx, .xls)</p>
                  </div>
                )}
              </div>

              {isProfiles && (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                  <input
                    type="checkbox"
                    id="mustChangePassword"
                    checked={mustChangePassword}
                    onChange={(e) => setMustChangePassword(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="mustChangePassword" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                    ให้เปลี่ยนรหัสผ่านเมื่อเข้าใช้งานครั้งแรก (Force password change on first login)
                  </label>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading || !file}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-dark disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none active:scale-95"
                >
                  {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {loading ? 'กำลังประมวลผล...' : 'เริ่มนำเข้าข้อมูล'}
                </button>
              </div>
            </form>
          ) : (
            // Import Result View
            <div className="space-y-5">
              
              {/* Summary Badges */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-center">
                  <div className="mx-auto mb-1 inline-flex rounded-xl bg-emerald-100 p-2 text-emerald-600">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">สำเร็จ</div>
                  <div className="mt-1 text-xl font-black text-emerald-700">{results.successCount || 0}</div>
                </div>

                {results.skippedCount !== undefined && (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 text-center">
                    <div className="mx-auto mb-1 inline-flex rounded-xl bg-amber-100 p-2 text-amber-600">
                      <AlertTriangle size={16} />
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ข้าม (ซ้ำ)</div>
                    <div className="mt-1 text-xl font-black text-amber-700">{results.skippedCount || 0}</div>
                  </div>
                )}

                <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4 text-center">
                  <div className="mx-auto mb-1 inline-flex rounded-xl bg-red-100 p-2 text-red-600">
                    <AlertCircle size={16} />
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ล้มเหลว</div>
                  <div className="mt-1 text-xl font-black text-red-700">{results.errorCount || 0}</div>
                </div>
              </div>

              {/* Logs output */}
              <div className="space-y-2">
                <div className="text-xs font-black text-slate-700">บันทึกผลการนำเข้าข้อมูล (Import Logs)</div>
                <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-4 font-mono text-[11px] leading-relaxed text-slate-600 space-y-1">
                  {results.logs && results.logs.length > 0 ? (
                    results.logs.map((log, index) => (
                      <div key={index} className={log.includes('Error') ? 'text-red-600' : log.includes('Skipped') ? 'text-amber-600' : 'text-slate-600'}>
                        {log}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 text-center py-4">ไม่มีบันทึกข้อมูล</div>
                  )}
                </div>
              </div>

              {/* Action Close */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
                >
                  นำเข้าไฟล์อื่นต่อ
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl bg-slate-800 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-slate-800/20 transition-all hover:bg-slate-900 active:scale-95"
                >
                  เสร็จสิ้น
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
