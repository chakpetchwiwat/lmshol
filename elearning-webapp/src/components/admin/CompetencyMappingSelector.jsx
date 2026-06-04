import React from 'react';
import { Trash2, Target, Search, X } from 'lucide-react';

const normalizeMappings = (value) => (Array.isArray(value) ? value : []);

const CompetencyMappingSelector = ({
  competencies = [],
  value = [],
  onChange,
  readOnly = false,
  title = 'Competency Mapping',
  description = 'เลือก competency ได้หลายรายการ และกำหนด level ต่อรายการ'
}) => {
  const mappings = normalizeMappings(value);
  const selectedIds = new Set(mappings.map((mapping) => mapping.competencyId).filter(Boolean));

  const [searchQuery, setSearchQuery] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef(null);
  const inputRef = React.useRef(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateMappings = (nextMappings) => {
    onChange?.(nextMappings);
  };

  // Filter competencies based on search query and exclude already selected ones
  const filteredOptions = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return competencies.filter((comp) => {
      // Exclude already selected
      if (selectedIds.has(comp.id)) return false;
      
      if (!query) return true; // Show all if no query
      
      const code = String(comp.code || '').toLowerCase();
      const name = String(comp.name || '').toLowerCase();
      const legacyCode = String(comp.legacyCode || '').toLowerCase();
      const catName = String(comp.categoryName || '').toLowerCase();
      const grpName = String(comp.groupName || '').toLowerCase();
      
      return code.includes(query) || 
             name.includes(query) || 
             legacyCode.includes(query) || 
             catName.includes(query) || 
             grpName.includes(query);
    });
  }, [competencies, searchQuery, selectedIds]);

  const addCompetency = (competency) => {
    if (selectedIds.has(competency.id)) return;
    
    const newMappings = [
      ...mappings,
      {
        competencyId: competency.id,
        requiredLevel: competency.levels?.[0]?.level || 1,
        note: ''
      }
    ];
    updateMappings(newMappings);

    // Calculate if we have remaining options matching the current search
    const newSelectedIds = new Set(newMappings.map((m) => m.competencyId).filter(Boolean));
    const query = searchQuery.trim().toLowerCase();
    const remainingOptionsCount = competencies.filter((comp) => {
      if (newSelectedIds.has(comp.id)) return false;
      if (!query) return true;
      const code = String(comp.code || '').toLowerCase();
      const name = String(comp.name || '').toLowerCase();
      const legacyCode = String(comp.legacyCode || '').toLowerCase();
      const catName = String(comp.categoryName || '').toLowerCase();
      const grpName = String(comp.groupName || '').toLowerCase();
      return code.includes(query) || 
             name.includes(query) || 
             legacyCode.includes(query) || 
             catName.includes(query) || 
             grpName.includes(query);
    }).length;

    // If no more results match the query, clear it so they can search for something else
    if (remainingOptionsCount === 0) {
      setSearchQuery('');
    }

    // Keep the dropdown open and refocus the input
    setIsOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const updateMapping = (index, changes) => {
    updateMappings(mappings.map((mapping, mappingIndex) => (
      mappingIndex === index ? { ...mapping, ...changes } : mapping
    )));
  };

  const removeMapping = (index) => {
    updateMappings(mappings.filter((_, mappingIndex) => mappingIndex !== index));
  };

  const findCompetency = (competencyId) => competencies.find((competency) => competency.id === competencyId);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (isOpen && filteredOptions.length > 0) {
        addCompetency(filteredOptions[0]);
      }
    } else if (event.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <section className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-5 md:p-6">
      <div className="flex gap-3 items-start mb-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm">
          <Target size={22} />
        </div>
        <div>
          <h4 className="text-base font-black text-slate-900">{title}</h4>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>

      {!readOnly && (
        <div ref={containerRef} className="relative mb-5">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="ค้นหาและเลือก Competency ด้วยรหัส หรือ ชื่อ..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-10 text-sm font-bold text-slate-900 shadow-sm transition-all focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  inputRef.current?.focus();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {isOpen && (
            <div className="absolute left-0 right-0 mt-2 z-[999] max-h-72 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-1.5 shadow-xl">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm font-bold text-slate-400">
                  ไม่พบรหัสหรือชื่อ Competency ที่ต้องการ
                </div>
              ) : (
                filteredOptions.map((comp) => (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => addCompetency(comp)}
                    className="flex w-full flex-col gap-0.5 rounded-xl px-3.5 py-2.5 text-left transition hover:bg-slate-50 active:bg-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-700 border border-emerald-100/50">
                        {comp.code}
                      </span>
                      {comp.legacyCode && (
                        <span className="text-[10px] font-bold text-slate-400">
                          (เดิม: {comp.legacyCode})
                        </span>
                      )}
                      <span className="text-sm font-bold text-slate-800 truncate">
                        {comp.name}
                      </span>
                    </div>
                    {(comp.categoryName || comp.groupName) && (
                      <span className="text-[11px] font-semibold text-slate-400 ml-1">
                        {comp.groupName ? `${comp.groupName} / ` : ''}{comp.categoryName}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Selected Competencies List */}
      <div className="space-y-4">
        {mappings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/70 px-4 py-8 text-center text-sm font-bold text-slate-400">
            ยังไม่ได้เลือก competency
          </div>
        ) : (
          mappings.map((mapping, index) => {
            const competency = findCompetency(mapping.competencyId);
            const levels = competency?.levels?.length ? competency.levels : [
              { level: 1, label: 'Level 1' },
              { level: 2, label: 'Level 2' },
              { level: 3, label: 'Level 3' },
              { level: 4, label: 'Level 4' },
              { level: 5, label: 'Level 5' },
            ];

            return (
              <div key={`${mapping.competencyId || 'new'}-${index}`} className="rounded-2xl border border-emerald-100/80 bg-white p-4 shadow-sm transition hover:shadow-md">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-700 border border-emerald-100/50">
                        {competency?.code || 'NO_CODE'}
                      </span>
                      {competency?.legacyCode && (
                        <span className="text-[10px] font-bold text-slate-400">
                          (เดิม: {competency.legacyCode})
                        </span>
                      )}
                      <h5 className="text-sm font-black text-slate-900 truncate">
                        {competency?.name || 'กำลังโหลดข้อมูล...'}
                      </h5>
                    </div>
                    {competency && (competency.categoryName || competency.groupName) && (
                      <p className="mt-1 text-[11px] font-semibold text-slate-400">
                        {competency.groupName ? `${competency.groupName} / ` : ''}{competency.categoryName}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-48">
                      <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">Required Level</span>
                      <select
                        value={mapping.requiredLevel || ''}
                        disabled={readOnly}
                        onChange={(event) => updateMapping(index, { requiredLevel: event.target.value ? parseInt(event.target.value, 10) : '' })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:bg-white"
                      >
                        <option value="">ไม่ระบุ</option>
                        {levels.map((level) => (
                          <option key={level.level} value={level.level}>
                            {level.label || `Level ${level.level}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => removeMapping(index)}
                        className="mt-4 flex h-9 w-9 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600 transition hover:bg-rose-100 active:scale-95"
                        aria-label="Remove competency"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {(competency?.measurementDescription || competency?.sourceColumnK) && (
                  <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold leading-relaxed text-amber-900/90">
                    <span className="font-black text-amber-950">คำอธิบายการวัดระดับ:</span>{' '}
                    {competency.measurementDescription || competency.sourceColumnK}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export default CompetencyMappingSelector;
