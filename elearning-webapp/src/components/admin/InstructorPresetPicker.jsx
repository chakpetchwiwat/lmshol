import React, { useMemo, useState } from 'react';
import { Search, UserRound, X } from 'lucide-react';
import { getFullUrl } from '../../utils/api';

const InstructorPresetPicker = ({
  presets = [],
  selectedPresetId = '',
  onSelect,
  disabled = false,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === selectedPresetId) || null,
    [presets, selectedPresetId]
  );

  const filteredPresets = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return presets.slice(0, 8);
    }

    return presets
      .filter((preset) => `${preset.name} ${preset.role || ''}`.toLowerCase().includes(keyword))
      .slice(0, 8);
  }, [presets, query]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-black uppercase tracking-wider text-slate-500">เลือกจากวิทยากรที่บันทึกไว้</label>
        {selectedPreset && (
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setQuery('');
            }}
            className="text-xs font-bold text-slate-400 transition-colors hover:text-danger"
          >
            ล้างการเลือก
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          disabled={disabled}
          className="form-input w-full bg-white pl-10 text-sm"
          value={isOpen ? query : selectedPreset?.name || query}
          onFocus={() => {
            setIsOpen(true);
            setQuery('');
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          placeholder="พิมพ์ชื่อวิทยากรเพื่อค้นหา..."
        />

        {selectedPreset && !isOpen && (
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setQuery('');
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-danger"
          >
            <X size={14} />
          </button>
        )}

        {isOpen && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_-24px_rgba(15,23,42,0.28)]">
            {filteredPresets.length === 0 ? (
              <div className="px-4 py-5 text-sm text-slate-500">ไม่พบวิทยากรที่ตรงกับคำค้น</div>
            ) : (
              filteredPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onSelect(preset);
                    setQuery(preset.name);
                    setIsOpen(false);
                  }}
                  className="flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50"
                >
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    {preset.avatar ? (
                      <img src={getFullUrl(preset.avatar)} alt={preset.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <UserRound size={18} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">{preset.name}</p>
                    <p className="mt-0.5 truncate text-xs font-medium text-primary">{preset.role || 'ไม่ได้ระบุตำแหน่ง'}</p>
                    {preset.bio && (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{preset.bio}</p>
                    )}
                  </div>
                </button>
              ))
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"
            >
              ปิดรายการค้นหา
            </button>
          </div>
        )}
      </div>

      {selectedPreset && (
        <div className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm">
          <p className="font-black text-slate-900">{selectedPreset.name}</p>
          <p className="mt-1 font-medium text-primary">{selectedPreset.role || 'ไม่ได้ระบุตำแหน่ง'}</p>
        </div>
      )}
    </div>
  );
};

export default InstructorPresetPicker;
