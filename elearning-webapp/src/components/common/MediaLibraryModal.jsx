import React, { useState, useEffect } from 'react';
import { X, Search, FileText, Image, Upload, Check, Loader2, RefreshCw } from 'lucide-react';
import ModalPortal from './ModalPortal';
import { adminAPI, getFullUrl } from '../../utils/api';

const MediaLibraryModal = ({ isOpen, onClose, onSelect, allowedTypes = 'all' }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, image, document
  const [selectedItem, setSelectedItem] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Fetch items from API
  const fetchMedia = async (search = '') => {
    setLoading(true);
    try {
      const response = await adminAPI.getMediaLibrary({ search });
      setItems(response.data || []);
    } catch (err) {
      console.error('Failed to load media library:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
      setSelectedItem(null);
      setUploadError('');
    }
  }, [isOpen]);

  // Handle Search
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMedia(searchQuery);
  };

  // Filtered items (on frontend for quick response, in addition to backend search)
  const filteredItems = items.filter((item) => {
    const mime = String(item.fileMimeType || '').toLowerCase();
    const isImage = mime.startsWith('image/');
    
    // Check type constraints (e.g. if allowedTypes is 'image', only show images)
    if (allowedTypes === 'image' && !isImage) return false;
    if (allowedTypes === 'document' && isImage) return false;

    // Apply quick filters
    if (filterType === 'image') return isImage;
    if (filterType === 'document') return !isImage;
    return true;
  });

  // Handle local file upload inside media library
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');
    try {
      const response = await adminAPI.uploadFile(file);
      if (response?.data) {
        const newItem = {
          fileKey: response.data.fileKey,
          fileUrl: response.data.fileUrl,
          fileName: file.name,
          fileMimeType: file.type || response.data.fileMimeType,
          createdAt: new Date().toISOString()
        };
        // Add to items state at the top
        setItems((prev) => [newItem, ...prev]);
        setSelectedItem(newItem);
      }
    } catch (err) {
      console.error('Upload inside media library failed:', err);
      setUploadError(err.response?.data?.message || 'อัปโหลดไฟล์ล้มเหลว');
    } finally {
      setUploading(false);
      // Clear input
      e.target.value = '';
    }
  };

  // Confirm selection
  const handleConfirm = () => {
    if (selectedItem) {
      onSelect(selectedItem);
      onClose();
    }
  };

  // Double click auto-select
  const handleDoubleClick = (item) => {
    onSelect(item);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
        <div className="card flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden border border-slate-100 bg-white p-0 shadow-2xl rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
            <div>
              <h4 className="text-lg font-bold text-slate-800">คลังสื่อ (Media Library)</h4>
              <p className="text-xs text-slate-500">เลือกไฟล์จากการอัปโหลดครั้งก่อน หรืออัปโหลดไฟล์ใหม่</p>
            </div>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Search, Filter & Upload Toolbar */}
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-white p-6 md:flex-row md:items-center md:justify-between">
            <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อไฟล์ที่เคยอัปโหลด..."
                  className="form-input w-full pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary px-5">ค้นหา</button>
              <button 
                type="button" 
                onClick={() => { setSearchQuery(''); fetchMedia(''); }} 
                className="btn btn-outline p-2.5" 
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </form>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Category Quick Filter */}
              {allowedTypes === 'all' && (
                <div className="flex rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      filterType === 'all' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('image')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      filterType === 'image' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    รูปภาพ
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('document')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      filterType === 'document' ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    เอกสาร
                  </button>
                </div>
              )}

              {/* Direct upload inside library */}
              <label className="btn btn-outline btn-sm gap-1.5 cursor-pointer bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
                {uploading ? (
                  <Loader2 size={14} className="animate-spin text-slate-500" />
                ) : (
                  <Upload size={14} className="text-slate-500" />
                )}
                <span>อัปโหลดใหม่</span>
                <input
                  type="file"
                  accept={allowedTypes === 'image' ? 'image/*' : (allowedTypes === 'document' ? '.pdf' : '*')}
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          {/* Upload Error Banner */}
          {uploadError && (
            <div className="bg-red-50 px-6 py-2.5 text-sm text-red-600 border-b border-red-100 flex items-center justify-between">
              <span>⚠️ {uploadError}</span>
              <button onClick={() => setUploadError('')} className="text-red-400 hover:text-red-600">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Media Grid / List */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
            {loading ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2">
                <Loader2 size={32} className="animate-spin text-primary" />
                <p className="text-sm text-slate-500 font-bold">กำลังโหลดคลังสื่อ...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
                <FileText size={48} className="mb-3 text-slate-300" />
                <h5 className="text-sm font-bold text-slate-700">ไม่พบไฟล์ในคลังสื่อ</h5>
                <p className="mt-1 text-xs text-slate-400">อัปโหลดไฟล์ใหม่โดยคลิกปุ่มอัปโหลดด้านบน</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {filteredItems.map((item) => {
                  const isImage = String(item.fileMimeType || '').startsWith('image/');
                  const isSelected = selectedItem?.fileKey === item.fileKey;

                  return (
                    <div
                      key={item.fileKey}
                      onClick={() => setSelectedItem(item)}
                      onDoubleClick={() => handleDoubleClick(item)}
                      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-white transition-all select-none ${
                        isSelected
                          ? 'border-primary ring-2 ring-primary/20 shadow-md'
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      {/* Selection Badge */}
                      {isSelected && (
                        <div className="absolute right-2 top-2 z-10 rounded-full bg-primary p-1 text-white shadow-sm">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}

                      {/* Thumbnail Container */}
                      <div className="relative flex aspect-video w-full items-center justify-center bg-slate-100 overflow-hidden border-b border-slate-100">
                        {isImage ? (
                          <img
                            src={getFullUrl(item.fileUrl)}
                            alt={item.fileName}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
                            <FileText size={32} />
                            <span className="text-[9px] uppercase tracking-wider font-bold">PDF</span>
                          </div>
                        )}
                      </div>

                      {/* Info Panel */}
                      <div className="p-3">
                        <p className="truncate text-xs font-bold text-slate-700" title={item.fileName}>
                          {item.fileName}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('th-TH') : '-'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button type="button" onClick={onClose} className="btn btn-outline px-5">
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedItem}
              className="btn btn-primary px-6"
            >
              เลือกไฟล์
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default MediaLibraryModal;
