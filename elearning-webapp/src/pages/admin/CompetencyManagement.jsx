import React from 'react';
import { Target, Layers, FileSpreadsheet, Plus, Edit, Trash2, X, Search, RefreshCw, Upload, ChevronDown, ChevronRight, AlertCircle, Save, HelpCircle, Check, Info } from 'lucide-react';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { adminAPI } from '../../utils/api';
import { useToast } from '../../context/useToast';

const defaultCompetencyForm = {
  categoryId: '',
  code: '',
  name: '',
  description: '',
  gbtLevel: '',
  competencyType: '',
  sourceRole: '',
  measurementLevelCount: 3,
  conditionsNote: '',
  measurementDescription: '',
  legacyCodes: [],
  levels: [
    { level: 1, label: 'Level 1', description: '', displayOrder: 0 },
    { level: 2, label: 'Level 2', description: '', displayOrder: 1 },
    { level: 3, label: 'Level 3', description: '', displayOrder: 2 }
  ]
};

const CompetencyManagement = () => {
  const toast = useToast();
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('competencies'); // 'competencies' | 'hierarchy' | 'import'
  const [tree, setTree] = React.useState([]);
  const [competencies, setCompetencies] = React.useState([]);
  
  // Filtering & Search
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterGroup, setFilterGroup] = React.useState('');
  const [filterCategory, setFilterCategory] = React.useState('');

  // GBT Import state
  const [importFile, setImportFile] = React.useState(null);
  const [importing, setImporting] = React.useState(false);
  const [importSummary, setImportSummary] = React.useState(null);

  // Competency Drawer state
  const [competencyDrawer, setCompetencyDrawer] = React.useState({
    isOpen: false,
    mode: 'create', // 'create' | 'edit'
    id: null,
    form: { ...defaultCompetencyForm }
  });
  const [legacyInput, setLegacyInput] = React.useState('');

  // Group Modal state
  const [groupModal, setGroupModal] = React.useState({
    isOpen: false,
    mode: 'create', // 'create' | 'edit'
    id: null,
    form: { code: '', name: '', description: '', displayOrder: 0 }
  });

  // Category Modal state
  const [categoryModal, setCategoryModal] = React.useState({
    isOpen: false,
    mode: 'create', // 'create' | 'edit'
    id: null,
    form: { groupId: '', code: '', name: '', description: '', displayOrder: 0 }
  });

  // Expanded Groups in Hierarchy Tab
  const [expandedGroups, setExpandedGroups] = React.useState({});

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [treeRes, competenciesRes] = await Promise.all([
        adminAPI.getCompetencyTree(),
        adminAPI.getCompetencies()
      ]);
      setTree(Array.isArray(treeRes.data) ? treeRes.data : []);
      setCompetencies(Array.isArray(competenciesRes.data) ? competenciesRes.data : []);
    } catch (error) {
      console.error('Fetch competency data error:', error);
      toast.error('โหลดข้อมูล competency ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Flattened categories for selection options
  const categoryOptions = React.useMemo(() => (
    tree.flatMap((group) => (group.categories || []).map((category) => ({
      ...category,
      groupName: group.name
    })))
  ), [tree]);

  // Filters categories based on selected group in dropdowns/forms
  const filteredCategoryOptions = React.useMemo(() => {
    if (!filterGroup) return categoryOptions;
    const group = tree.find(g => g.id === filterGroup);
    return group ? (group.categories || []).map(c => ({ ...c, groupName: group.name })) : [];
  }, [tree, filterGroup, categoryOptions]);

  // Filtered Competency List
  const filteredCompetencies = React.useMemo(() => {
    let result = competencies;

    if (filterGroup) {
      result = result.filter(c => c.groupId === filterGroup);
    }
    if (filterCategory) {
      result = result.filter(c => c.categoryId === filterCategory);
    }

    const keyword = searchTerm.trim().toLowerCase();
    if (keyword) {
      result = result.filter((competency) => {
        const matchesMainInfo = [
          competency.code,
          competency.name,
          competency.categoryName,
          competency.groupName,
          competency.measurementDescription
        ].filter(Boolean).some((value) => String(value).toLowerCase().includes(keyword));

        const matchesLegacy = Array.isArray(competency.legacyCodes) 
          ? competency.legacyCodes.some(lc => lc.toLowerCase().includes(keyword))
          : String(competency.legacyCode || '').toLowerCase().includes(keyword);

        return matchesMainInfo || matchesLegacy;
      });
    }

    return result;
  }, [competencies, searchTerm, filterGroup, filterCategory]);

  // Group Expand/Collapse toggle in Hierarchy tree
  const toggleGroupExpand = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // --- CRUD Functions for Competency Group ---
  const openCreateGroup = () => {
    setGroupModal({
      isOpen: true,
      mode: 'create',
      id: null,
      form: { code: '', name: '', description: '', displayOrder: tree.length }
    });
  };

  const openEditGroup = (group) => {
    setGroupModal({
      isOpen: true,
      mode: 'edit',
      id: group.id,
      form: {
        code: group.code,
        name: group.name,
        description: group.description || '',
        displayOrder: group.displayOrder || 0
      }
    });
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    try {
      if (groupModal.mode === 'create') {
        await adminAPI.createCompetencyGroup(groupModal.form);
        toast.success('สร้างกลุ่มสมรรถนะสำเร็จ');
      } else {
        await adminAPI.updateCompetencyGroup(groupModal.id, groupModal.form);
        toast.success('แก้ไขข้อมูลกลุ่มสมรรถนะสำเร็จ');
      }
      setGroupModal(prev => ({ ...prev, isOpen: false }));
      await fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'บันทึกข้อมูลกลุ่มสมรรถนะไม่สำเร็จ');
    }
  };

  const handleDeleteGroup = async (id, name) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบกลุ่มสมรรถนะ "${name}"?\n(การดำเนินการนี้จะลบหมวดหมู่ย่อยและหัวข้อสมรรถนะทั้งหมดภายใต้กลุ่มนี้ด้วย!)`)) {
      return;
    }
    try {
      await adminAPI.deleteCompetencyGroup(id);
      toast.success('ลบกลุ่มสมรรถนะเรียบร้อยแล้ว');
      await fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'ลบกลุ่มสมรรถนะไม่สำเร็จ');
    }
  };

  // --- CRUD Functions for Competency Category ---
  const openCreateCategory = (groupId = '') => {
    setCategoryModal({
      isOpen: true,
      mode: 'create',
      id: null,
      form: { groupId, code: '', name: '', description: '', displayOrder: 0 }
    });
  };

  const openEditCategory = (category) => {
    setCategoryModal({
      isOpen: true,
      mode: 'edit',
      id: category.id,
      form: {
        groupId: category.groupId,
        code: category.code,
        name: category.name,
        description: category.description || '',
        displayOrder: category.displayOrder || 0
      }
    });
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      if (categoryModal.mode === 'create') {
        await adminAPI.createCompetencyCategory(categoryModal.form);
        toast.success('สร้างหมวดหมู่สมรรถนะสำเร็จ');
      } else {
        await adminAPI.updateCompetencyCategory(categoryModal.id, categoryModal.form);
        toast.success('แก้ไขข้อมูลหมวดหมู่สมรรถนะสำเร็จ');
      }
      setCategoryModal(prev => ({ ...prev, isOpen: false }));
      await fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'บันทึกข้อมูลหมวดหมู่ไม่สำเร็จ');
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบหมวดหมู่สมรรถนะ "${name}"?\n(การดำเนินการนี้จะลบหัวข้อสมรรถนะทั้งหมดภายใต้หมวดหมู่นี้ด้วย!)`)) {
      return;
    }
    try {
      await adminAPI.deleteCompetencyCategory(id);
      toast.success('ลบหมวดหมู่สมรรถนะเรียบร้อยแล้ว');
      await fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'ลบหมวดหมู่สมรรถนะไม่สำเร็จ');
    }
  };

  // --- CRUD Functions for Competency Items ---
  const handleLevelCountChange = (value) => {
    setCompetencyDrawer(prev => {
      const updatedForm = { ...prev.form, measurementLevelCount: value };
      
      const numVal = parseInt(value, 10);
      if (!isNaN(numVal) && numVal >= 1 && numVal <= 10) {
        const currentLevels = prev.form.levels || [];
        updatedForm.levels = Array.from({ length: numVal }, (_, i) => {
          const levelNum = i + 1;
          const existing = currentLevels.find(l => l.level === levelNum);
          return existing || {
            level: levelNum,
            label: `Level ${levelNum}`,
            description: '',
            displayOrder: i
          };
        });
      }
      return {
        ...prev,
        form: updatedForm
      };
    });
  };

  const handleLevelCountBlur = () => {
    setCompetencyDrawer(prev => {
      const currentVal = parseInt(prev.form.measurementLevelCount, 10);
      const clampedVal = isNaN(currentVal) ? 3 : Math.max(1, Math.min(10, currentVal));
      
      const currentLevels = prev.form.levels || [];
      const updatedLevels = Array.from({ length: clampedVal }, (_, i) => {
        const levelNum = i + 1;
        const existing = currentLevels.find(l => l.level === levelNum);
        return existing || {
          level: levelNum,
          label: `Level ${levelNum}`,
          description: '',
          displayOrder: i
        };
      });

      return {
        ...prev,
        form: {
          ...prev.form,
          measurementLevelCount: clampedVal,
          levels: updatedLevels
        }
      };
    });
  };


  const addLegacyCode = () => {
    const trimmed = legacyInput.trim().toUpperCase();
    if (!trimmed) return;
    
    // Validate character format
    if (!/^[\w.-]+$/.test(trimmed)) {
      toast.error('รหัส Legacy Code ต้องประกอบด้วยภาษาอังกฤษ ตัวเลข ขีด (-) หรือจุด (.) เท่านั้น');
      return;
    }

    if (competencyDrawer.form.legacyCodes.includes(trimmed)) {
      toast.warning('รหัส Legacy Code นี้มีอยู่แล้ว');
      return;
    }
    setCompetencyDrawer(prev => ({
      ...prev,
      form: {
        ...prev.form,
        legacyCodes: [...prev.form.legacyCodes, trimmed]
      }
    }));
    setLegacyInput('');
  };

  const removeLegacyCode = (codeToRemove) => {
    setCompetencyDrawer(prev => ({
      ...prev,
      form: {
        ...prev.form,
        legacyCodes: prev.form.legacyCodes.filter(c => c !== codeToRemove)
      }
    }));
  };

  const openCreateCompetency = () => {
    setCompetencyDrawer({
      isOpen: true,
      mode: 'create',
      id: null,
      form: {
        categoryId: categoryOptions[0]?.id || '',
        code: '',
        name: '',
        description: '',
        gbtLevel: '',
        competencyType: '',
        sourceRole: '',
        measurementLevelCount: 3,
        conditionsNote: '',
        measurementDescription: '',
        legacyCodes: [],
        levels: [
          { level: 1, label: 'Level 1', description: '', displayOrder: 0 },
          { level: 2, label: 'Level 2', description: '', displayOrder: 1 },
          { level: 3, label: 'Level 3', description: '', displayOrder: 2 }
        ]
      }
    });
    setLegacyInput('');
  };

  const openEditCompetency = (competency) => {
    setCompetencyDrawer({
      isOpen: true,
      mode: 'edit',
      id: competency.id,
      form: {
        categoryId: competency.categoryId,
        code: competency.code,
        name: competency.name,
        description: competency.description || '',
        gbtLevel: competency.gbtLevel || '',
        competencyType: competency.competencyType || '',
        sourceRole: competency.sourceRole || '',
        measurementLevelCount: competency.measurementLevelCount || 3,
        conditionsNote: competency.conditionsNote || '',
        measurementDescription: competency.measurementDescription || '',
        legacyCodes: competency.legacyCodes || [],
        levels: Array.isArray(competency.levels) && competency.levels.length > 0
          ? competency.levels.map(l => ({
              level: l.level,
              label: l.label || `Level ${l.level}`,
              description: l.description || '',
              displayOrder: l.displayOrder ?? (l.level - 1)
            }))
          : Array.from({ length: competency.measurementLevelCount || 3 }, (_, i) => ({
              level: i + 1,
              label: `Level ${i + 1}`,
              description: '',
              displayOrder: i
            }))
      }
    });
    setLegacyInput('');
  };

  const handleSaveCompetency = async (e) => {
    e.preventDefault();
    const { form, mode, id } = competencyDrawer;
    
    if (!form.categoryId) {
      toast.error('กรุณาเลือกหมวดหมู่สมรรถนะ');
      return;
    }

    try {
      const payload = {
        ...form,
        levels: form.levels.map(l => ({
          ...l,
          measurementCriteria: l.description // map description to measurementCriteria for backend
        }))
      };

      if (mode === 'create') {
        await adminAPI.createCompetency(payload);
        toast.success('สร้างสมรรถนะใหม่สำเร็จ');
      } else {
        await adminAPI.updateCompetency(id, payload);
        toast.success('แก้ไขข้อมูลสมรรถนะสำเร็จ');
      }
      setCompetencyDrawer(prev => ({ ...prev, isOpen: false }));
      await fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'บันทึกข้อมูลไม่สำเร็จ');
    }
  };

  const handleDeleteCompetency = async (id, code, name) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบสมรรถนะ "${code} - ${name}"?`)) {
      return;
    }
    try {
      await adminAPI.deleteCompetency(id);
      toast.success('ลบสมรรถนะเรียบร้อยแล้ว');
      await fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'ลบสมรรถนะไม่สำเร็จ');
    }
  };

  // --- GBT Excel Import ---
  const handleImportGbt = async (event) => {
    event.preventDefault();
    if (!importFile) {
      toast.error('กรุณาเลือกไฟล์ GBT Excel');
      return;
    }

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', importFile);
      const response = await adminAPI.importGbtCompetencies(formData);
      setImportSummary(response.data);
      toast.success('นำเข้าข้อมูล GBT Competency สำเร็จ');
      setImportFile(null);
      await fetchData();
    } catch (error) {
      console.error('Import GBT competency error:', error);
      toast.error(error.response?.data?.message || 'นำเข้าข้อมูลไม่สำเร็จ');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <AdminPageHeader
        title="Competency Framework"
        subtitle="จัดการแผนผังและรายการ Competency Master Data ทั้งหมดขององค์กร เพื่อเชื่อมโยงคอร์สและประวัติอบรม"
        icon={<Target size={24} />}
        actions={(
          <button type="button" onClick={fetchData} className="btn btn-outline hover:bg-slate-50 transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        )}
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/50 p-1.5 rounded-xl gap-2 w-fit">
        <button
          onClick={() => setActiveTab('competencies')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-lg transition-all ${
            activeTab === 'competencies'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Target size={15} />
          Competencies List
        </button>
        <button
          onClick={() => setActiveTab('hierarchy')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-lg transition-all ${
            activeTab === 'hierarchy'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers size={15} />
          Hierarchy Settings
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-lg transition-all ${
            activeTab === 'import'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet size={15} />
          Import Excel
        </button>
      </div>

      {/* Loading state */}
      {loading && tree.length === 0 && (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="animate-spin text-indigo-600" size={32} />
            <span className="text-sm font-bold text-slate-500">กำลังโหลดข้อมูล...</span>
          </div>
        </div>
      )}

      {/* TAB 1: COMPETENCIES LIST */}
      {activeTab === 'competencies' && (!loading || tree.length > 0) && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                className="form-input w-full pl-10 h-10 text-sm focus:border-indigo-500"
                placeholder="ค้นหาด้วยรหัสหลัก, รหัสเดิม หรือชื่อ competency..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <select 
                className="form-select h-10 text-sm focus:border-indigo-500 min-w-44"
                value={filterGroup} 
                onChange={(e) => { setFilterGroup(e.target.value); setFilterCategory(''); }}
              >
                <option value="">กลุ่มสมรรถนะทั้งหมด</option>
                {tree.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>

              <select 
                className="form-select h-10 text-sm focus:border-indigo-500 min-w-44"
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)}
                disabled={!filterGroup}
              >
                <option value="">หมวดหมู่ย่อยทั้งหมด</option>
                {filteredCategoryOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <button
                onClick={openCreateCompetency}
                className="btn btn-primary h-10 px-4 text-xs font-black shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5 col-span-2 sm:col-span-1"
              >
                <Plus size={16} />
                เพิ่ม Competency
              </button>
            </div>
          </div>

          {/* List Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4 w-40">รหัสหลัก (Code)</th>
                    <th className="py-3.5 px-4 w-48">รหัสเดิม (Legacy)</th>
                    <th className="py-3.5 px-4 min-w-[20rem]">ชื่อและคำอธิบายสมรรถนะ</th>
                    <th className="py-3.5 px-4 w-52">กลุ่ม / หมวดหมู่ย่อย</th>
                    <th className="py-3.5 px-4 w-40 text-center">ระดับ Rubric</th>
                    <th className="py-3.5 px-4 w-28 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredCompetencies.map((comp) => (
                    <tr key={comp.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 px-4 align-top">
                        <span className="font-mono font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50">
                          {comp.code}
                        </span>
                      </td>
                      <td className="py-4 px-4 align-top">
                        {comp.legacyCodes && comp.legacyCodes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {comp.legacyCodes.map(code => (
                              <span key={code} className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/20">
                                {code}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="font-bold text-slate-900 leading-snug">{comp.name}</div>
                        {comp.description && (
                          <div className="mt-1 text-xs text-slate-500 font-medium line-clamp-2" title={comp.description}>
                            {comp.description}
                          </div>
                        )}
                        {comp.conditionsNote && (
                          <div className="mt-1.5 flex items-start gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200/50 w-fit">
                            <Info size={12} className="mt-0.5 shrink-0" />
                            <span className="font-semibold">{comp.conditionsNote}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="text-xs font-black text-slate-700 leading-none">{comp.groupName}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-400">{comp.categoryName}</div>
                      </td>
                      <td className="py-4 px-4 align-top text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {(comp.levels || []).map((level) => (
                            <span 
                              key={level.id} 
                              className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-700 hover:bg-indigo-100 transition-colors"
                              title={level.description || 'ไม่มีคำอธิบาย'}
                            >
                              L{level.level}
                            </span>
                          ))}
                          {(comp.levels || []).length === 0 && (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditCompetency(comp)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="แก้ไขข้อมูล"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteCompetency(comp.id, comp.code, comp.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="ลบข้อมูล"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCompetencies.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400 font-bold">
                        <AlertCircle className="mx-auto mb-2 text-slate-300" size={32} />
                        ไม่พบข้อมูลสมรรถนะ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HIERARCHY TREE MANAGEMENT */}
      {activeTab === 'hierarchy' && (!loading || tree.length > 0) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
            <div>
              <h3 className="text-sm font-black text-slate-900">จัดการโครงสร้าง Framework</h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                จัดกลุ่มสมรรถนะตามกลุ่มโมดูล (Group) และหมวดหมู่ย่อย (Category)
              </p>
            </div>
            <button
              onClick={openCreateGroup}
              className="btn btn-primary text-xs font-black flex items-center gap-1.5"
            >
              <Plus size={16} />
              เพิ่มกลุ่มสมรรถนะ
            </button>
          </div>

          <div className="space-y-3">
            {tree.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-400 font-bold">
                <Layers className="mx-auto mb-2 text-slate-300" size={32} />
                ยังไม่มีข้อมูลโครงสร้าง Framework
              </div>
            ) : tree.map((group) => {
              const isExpanded = expandedGroups[group.id];
              const categories = group.categories || [];
              
              return (
                <div key={group.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                  {/* Group Header */}
                  <div className="flex items-center justify-between p-4 bg-slate-50/50 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => toggleGroupExpand(group.id)}
                        className="p-1 hover:bg-slate-200/50 rounded-lg text-slate-500 transition-colors"
                      >
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-900 text-sm">{group.name}</h4>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded border border-slate-300/30">
                            {group.code}
                          </span>
                        </div>
                        {group.description && (
                          <p className="text-xs text-slate-500 font-medium mt-0.5">{group.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openCreateCategory(group.id)}
                        className="btn btn-outline text-[11px] font-black h-8 px-2.5 flex items-center gap-1 hover:bg-white"
                      >
                        <Plus size={14} />
                        เพิ่มหมวดหมู่ย่อย
                      </button>
                      <button
                        onClick={() => openEditGroup(group)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200/50 transition-all"
                        title="แก้ไขกลุ่ม"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id, group.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200/50 transition-all"
                        title="ลบกลุ่ม"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Categories List (collapsible) */}
                  {isExpanded && (
                    <div className="divide-y divide-slate-100 bg-white">
                      {categories.length === 0 ? (
                        <div className="py-4 px-12 text-xs font-bold text-slate-400 italic">
                          ยังไม่มีหมวดหมู่ย่อยในกลุ่มนี้
                        </div>
                      ) : categories.map((cat) => (
                        <div key={cat.id} className="flex items-center justify-between py-3 px-6 hover:bg-slate-50/30 transition-colors">
                          <div className="flex items-start gap-2.5">
                            <div className="mt-1 flex h-2 w-2 rounded-full bg-slate-300" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-xs">{cat.name}</span>
                                <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                                  {cat.code}
                                </span>
                              </div>
                              {cat.description && (
                                <p className="text-xs text-slate-400 font-medium mt-0.5">{cat.description}</p>
                              )}
                              <p className="text-[10px] text-indigo-600 font-bold mt-1">
                                มี {cat.competencies?.length || 0} หัวข้อสมรรถนะ
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openEditCategory(cat)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
                              title="แก้ไขหมวดหมู่"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg transition-all"
                              title="ลบหมวดหมู่"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: IMPORT GBT EXCEL */}
      {activeTab === 'import' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Upload card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <FileSpreadsheet size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">นำเข้า GBT Excel Master Data</h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">นำเข้าชุดข้อมูลโครงสร้างสมรรถนะและรูบริคระดับ (คอลัมน์ A ถึง K)</p>
                  </div>
                </div>
                <a
                  href="/templates/gbt_competency_template.xlsx"
                  download="gbt_competency_template.xlsx"
                  className="btn btn-outline h-9 px-3 text-xs font-black flex items-center gap-1.5 hover:bg-slate-50 shrink-0 shadow-sm"
                >
                  <FileSpreadsheet size={15} className="text-emerald-600" />
                  ดาวน์โหลด Template
                </a>
              </div>
              
              <div className="border border-slate-100 rounded-xl bg-slate-50/50 p-4 space-y-2 mb-6">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">เงื่อนไขคอลัมน์ใน Excel:</h4>
                <ul className="text-xs font-semibold text-slate-500 list-disc list-inside space-y-1">
                  <li>คอลัมน์ A (A-Group): กลุ่มระดับ GBT (เช่น 01-TOP Organisation Level)</li>
                  <li>คอลัมน์ B (B-Type): ชนิดสมรรถนะ (เช่น สมรรถนะ หรือ ความรู้)</li>
                  <li>คอลัมน์ C (C-Category): ชื่อหมวดหมู่ย่อย</li>
                  <li>คอลัมน์ D (D-Code): รหัสสมรรถนะหลัก (ห้ามซ้ำกัน)</li>
                  <li>คอลัมน์ E (E-Role): บทบาท/กลุ่มงานที่เกี่ยวข้อง</li>
                  <li>คอลัมน์ F (F-Legacy): รหัสสมรรถนะเดิม (คั่นด้วย comma , รองรับหลายรหัส)</li>
                  <li>คอลัมน์ G (G-Name): ชื่อของสมรรถนะ</li>
                  <li>คอลัมน์ H (H-Desc): คำอธิบายหัวข้อสมรรถนะ</li>
                  <li>คอลัมน์ I (I-Note): หมายเหตุและเกณฑ์การเทียบเคียง</li>
                  <li>คอลัมน์ J (J-Count): จำนวนระดับการประเมิน (เช่น 3 หรือ 5)</li>
                  <li>คอลัมน์ K (K-Rubric): คำอธิบายแต่ละระดับ (แบ่งด้วยเครื่องหมาย pipe | )</li>
                </ul>
              </div>
            </div>

            <form onSubmit={handleImportGbt} className="space-y-4">
              <div className="border border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-400 bg-slate-50/20 hover:bg-indigo-50/5 transition-all">
                <input
                  type="file"
                  id="excel-file-uploader"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(event) => setImportFile(event.target.files?.[0] || null)}
                />
                <label htmlFor="excel-file-uploader" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload size={32} className="text-slate-400" />
                  <span className="text-sm font-bold text-slate-600">
                    {importFile ? importFile.name : 'คลิกเพื่อเลือกไฟล์ Excel หรือลากวางไฟล์ที่นี่'}
                  </span>
                  <span className="text-xs font-medium text-slate-400">รองรับไฟล์สกุล .xlsx หรือ .xls เท่านั้น</span>
                </label>
              </div>

              <button 
                type="submit" 
                disabled={importing || !importFile} 
                className="btn btn-primary w-full h-11 text-xs font-black shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    กำลังประมวลผลและนำเข้า...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    เริ่มนำเข้า Excel
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Summary / Result card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 mb-4">รายงานสรุปผลการนำเข้า</h3>
            
            {importSummary ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-600">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <span className="block text-slate-400">จำนวนแถวทั้งหมด:</span>
                    <span className="text-xl font-black text-slate-800">{importSummary.importedRows}</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <span className="block text-slate-400">กลุ่มสมรรถนะ:</span>
                    <span className="text-sm font-black text-emerald-600">+{importSummary.groupsCreated}</span>
                    <span className="text-[10px] text-slate-400 ml-1">/{importSummary.groupsUpdated} อัปเดต</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <span className="block text-slate-400">หมวดหมู่ย่อย:</span>
                    <span className="text-sm font-black text-emerald-600">+{importSummary.categoriesCreated}</span>
                    <span className="text-[10px] text-slate-400 ml-1">/{importSummary.categoriesUpdated} อัปเดต</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <span className="block text-slate-400">หัวข้อ Competency:</span>
                    <span className="text-sm font-black text-emerald-600">+{importSummary.competenciesCreated}</span>
                    <span className="text-[10px] text-slate-400 ml-1">/{importSummary.competenciesUpdated} อัปเดต</span>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-xl p-4">
                  <h4 className="text-xs font-black text-slate-700 mb-2">บันทึกขั้นตอนการนำเข้า (Logs)</h4>
                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-2 font-mono text-[10px] text-slate-500">
                    {(importSummary.logs || []).map((log, index) => (
                      <div key={index} className="flex gap-2 border-b border-slate-50 pb-1">
                        <span className="text-indigo-500 font-bold shrink-0">[{index + 1}]</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center text-center text-slate-400 font-bold">
                <HelpCircle size={32} className="mb-2 text-slate-300" />
                ยังไม่มีข้อมูลการนำเข้าล่าสุด
                <p className="text-xs font-semibold text-slate-400 mt-1 max-w-xs leading-relaxed">
                  เลือกไฟล์ GBT Excel และกดปุ่มนำเข้าเพื่อประมวลผลข้อมูล
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SLIDE-OUT DRAWER FOR COMPETENCY ADD/EDIT */}
      {competencyDrawer.isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300" 
            onClick={() => setCompetencyDrawer(prev => ({ ...prev, isOpen: false }))} 
          />
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col divide-y divide-slate-100 animate-slide-in relative">
              
              {/* Drawer Header */}
              <div className="px-6 py-5 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {competencyDrawer.mode === 'create' ? 'เพิ่ม Competency ใหม่' : 'แก้ไขข้อมูล Competency'}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    กรอกข้อมูลรายละเอียดของหัวข้อสมรรถนะและคำอธิบายแต่ละระดับการวัดผล
                  </p>
                </div>
                <button 
                  onClick={() => setCompetencyDrawer(prev => ({ ...prev, isOpen: false }))}
                  className="p-1.5 hover:bg-slate-200/50 rounded-lg text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Body Form */}
              <form onSubmit={handleSaveCompetency} className="flex-1 overflow-y-auto p-6 space-y-5">
                
                {/* 1. Category Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">หมวดหมู่ย่อย (Category)</label>
                  <select 
                    required 
                    className="form-select w-full focus:border-indigo-500 h-10 text-sm" 
                    value={competencyDrawer.form.categoryId} 
                    onChange={(e) => setCompetencyDrawer(prev => ({
                      ...prev,
                      form: { ...prev.form, categoryId: e.target.value }
                    }))}
                  >
                    <option value="">เลือกหมวดหมู่ย่อย</option>
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>{category.groupName} / {category.name}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Main Code & Name */}
                <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">รหัสหลัก (Main Code)</label>
                    <input 
                      required 
                      className="form-input w-full focus:border-indigo-500 h-10 text-sm font-mono uppercase" 
                      placeholder="เช่น FDA-C1" 
                      value={competencyDrawer.form.code} 
                      onChange={(e) => setCompetencyDrawer(prev => ({
                        ...prev,
                        form: { ...prev.form, code: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">ชื่อสมรรถนะ (Name)</label>
                    <input 
                      required 
                      className="form-input w-full focus:border-indigo-500 h-10 text-sm" 
                      placeholder="เช่น การทำงานที่เป็นเลิศ" 
                      value={competencyDrawer.form.name} 
                      onChange={(e) => setCompetencyDrawer(prev => ({
                        ...prev,
                        form: { ...prev.form, name: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                {/* 3. Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">คำอธิบายสมรรถนะ (Description)</label>
                  <textarea 
                    className="form-input w-full focus:border-indigo-500 min-h-20 text-sm py-2" 
                    placeholder="รายละเอียดพฤติกรรมหรือนิยามของสมรรถนะนี้..." 
                    value={competencyDrawer.form.description} 
                    onChange={(e) => setCompetencyDrawer(prev => ({
                      ...prev,
                      form: { ...prev.form, description: e.target.value }
                    }))}
                  />
                </div>

                {/* 4. Legacy Codes Chip Input */}
                <div className="space-y-1.5 border border-slate-200 p-4 rounded-xl bg-slate-50/30">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">รหัสสมรรถนะเดิม (Legacy Codes)</label>
                  <div className="flex gap-2">
                    <input 
                      className="form-input flex-1 focus:border-indigo-500 h-10 text-sm font-mono uppercase" 
                      placeholder="พิมพ์รหัสเดิม เช่น OCSC-C1 แล้วกด Enter หรือคลิกปุ่ม Add" 
                      value={legacyInput}
                      onChange={(e) => setLegacyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addLegacyCode();
                        }
                      }}
                    />
                    <button 
                      type="button"
                      onClick={addLegacyCode}
                      className="btn btn-outline text-xs h-10 px-3 bg-white"
                    >
                      Add
                    </button>
                  </div>

                  {/* Chips Tag Display */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {competencyDrawer.form.legacyCodes.map(code => (
                      <span 
                        key={code} 
                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-300/50 pl-2.5 pr-1 py-1 rounded-full shadow-sm"
                      >
                        {code}
                        <button
                          type="button"
                          onClick={() => removeLegacyCode(code)}
                          className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    {competencyDrawer.form.legacyCodes.length === 0 && (
                      <span className="text-xs text-slate-400 font-medium italic">ไม่มีรหัสสมรรถนะเดิม</span>
                    )}
                  </div>
                </div>

                {/* 5. GBT Metadata Fields (gbtLevel, competencyType, sourceRole) */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">ระดับ GBT (GBT Level)</label>
                    <input 
                      className="form-input w-full focus:border-indigo-500 h-9 text-xs" 
                      placeholder="เช่น 01-TOP Organisation" 
                      value={competencyDrawer.form.gbtLevel} 
                      onChange={(e) => setCompetencyDrawer(prev => ({
                        ...prev,
                        form: { ...prev.form, gbtLevel: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">ชนิดสมรรถนะ (Type)</label>
                    <input 
                      className="form-input w-full focus:border-indigo-500 h-9 text-xs" 
                      placeholder="เช่น สมรรถนะ / ความรู้" 
                      value={competencyDrawer.form.competencyType} 
                      onChange={(e) => setCompetencyDrawer(prev => ({
                        ...prev,
                        form: { ...prev.form, competencyType: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">บทบาทงาน (Source Role)</label>
                    <input 
                      className="form-input w-full focus:border-indigo-500 h-9 text-xs" 
                      placeholder="เช่น อย. ทุกหน่วยงาน" 
                      value={competencyDrawer.form.sourceRole} 
                      onChange={(e) => setCompetencyDrawer(prev => ({
                        ...prev,
                        form: { ...prev.form, sourceRole: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                {/* 6. Conditions & Measurement Summary Description */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">หมายเหตุเทียบเคียง (Conditions Note)</label>
                    <textarea 
                      className="form-input w-full focus:border-indigo-500 min-h-16 text-xs py-1.5" 
                      placeholder="หมายเหตุหรือเงื่อนไขการเทียบเคียง..." 
                      value={competencyDrawer.form.conditionsNote} 
                      onChange={(e) => setCompetencyDrawer(prev => ({
                        ...prev,
                        form: { ...prev.form, conditionsNote: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">สรุปการวัดผล (Measurement Desc)</label>
                    <textarea 
                      className="form-input w-full focus:border-indigo-500 min-h-16 text-xs py-1.5" 
                      placeholder="คำอธิบายเกณฑ์การผ่านของแต่ละระดับรวม..." 
                      value={competencyDrawer.form.measurementDescription} 
                      onChange={(e) => setCompetencyDrawer(prev => ({
                        ...prev,
                        form: { ...prev.form, measurementDescription: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                {/* 7. Rubrics Levels List */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">การกำหนดเกณฑ์ในแต่ละระดับ (Rubrics)</label>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-semibold text-slate-500">จำนวนระดับ:</span>
                      <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                        <button
                          type="button"
                          onClick={() => {
                            const currentVal = parseInt(competencyDrawer.form.measurementLevelCount, 10) || 1;
                            if (currentVal > 1) {
                              handleLevelCountChange(String(currentVal - 1));
                            }
                          }}
                          className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 transition-colors font-bold text-sm"
                        >
                          -
                        </button>
                        <input 
                          type="number" 
                          min="1" 
                          max="10" 
                          className="w-8 h-6 text-center text-xs p-0 focus:outline-none focus:ring-0 font-bold border-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                          value={competencyDrawer.form.measurementLevelCount}
                          onChange={(e) => handleLevelCountChange(e.target.value)}
                          onBlur={handleLevelCountBlur}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const currentVal = parseInt(competencyDrawer.form.measurementLevelCount, 10) || 1;
                            if (currentVal < 10) {
                              handleLevelCountChange(String(currentVal + 1));
                            }
                          }}
                          className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 transition-colors font-bold text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {competencyDrawer.form.levels.map((levelItem, index) => (
                      <div key={levelItem.level} className="flex gap-3 items-start border border-slate-100 p-3 rounded-xl bg-slate-50/20 hover:border-slate-200 transition-all">
                        <div className="w-10 h-10 shrink-0 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-black text-indigo-700">
                          L{levelItem.level}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <input 
                            className="form-input w-full h-8 text-xs font-bold focus:border-indigo-500 bg-white" 
                            placeholder="ป้ายชื่อระดับ เช่น Level 1 หรือ ขั้นต้น" 
                            value={levelItem.label}
                            onChange={(e) => {
                              const updatedLevels = [...competencyDrawer.form.levels];
                              updatedLevels[index] = { ...levelItem, label: e.target.value };
                              setCompetencyDrawer(prev => ({
                                ...prev,
                                form: { ...prev.form, levels: updatedLevels }
                              }));
                            }}
                          />
                          <textarea 
                            className="form-input w-full min-h-16 text-xs py-1.5 focus:border-indigo-500 bg-white" 
                            placeholder="คำอธิบายเกณฑ์ประเมินระดับการวัดพฤติกรรม..." 
                            value={levelItem.description}
                            onChange={(e) => {
                              const updatedLevels = [...competencyDrawer.form.levels];
                              updatedLevels[index] = { ...levelItem, description: e.target.value };
                              setCompetencyDrawer(prev => ({
                                ...prev,
                                form: { ...prev.form, levels: updatedLevels }
                              }));
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </form>

              {/* Drawer Footer Actions */}
              <div className="px-6 py-4 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setCompetencyDrawer(prev => ({ ...prev, isOpen: false }))}
                  className="btn btn-outline hover:bg-slate-200/50 transition-colors h-10 text-xs font-black"
                >
                  ยกเลิก
                </button>
                <button 
                  type="button"
                  onClick={handleSaveCompetency}
                  className="btn btn-primary h-10 px-5 text-xs font-black shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 flex items-center gap-1.5"
                >
                  <Save size={15} />
                  บันทึกข้อมูล
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL FOR COMPETENCY GROUP ADD/EDIT */}
      {groupModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            onClick={() => setGroupModal(prev => ({ ...prev, isOpen: false }))} 
          />
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative z-10 border border-slate-100">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-sm">
                {groupModal.mode === 'create' ? 'เพิ่มกลุ่มสมรรถนะ' : 'แก้ไขกลุ่มสมรรถนะ'}
              </h3>
              <button onClick={() => setGroupModal(prev => ({ ...prev, isOpen: false }))} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveGroup} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-600 block">รหัสกลุ่ม (Code)</label>
                <input required className="form-input w-full uppercase" placeholder="เช่น ORG_CORE" value={groupModal.form.code} onChange={(e) => setGroupModal({ ...groupModal, form: { ...groupModal.form, code: e.target.value } })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-600 block">ชื่อกลุ่มสมรรถนะ (Name)</label>
                <input required className="form-input w-full" placeholder="เช่น กลุ่มงานหลักตามกระทรวง" value={groupModal.form.name} onChange={(e) => setGroupModal({ ...groupModal, form: { ...groupModal.form, name: e.target.value } })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-600 block">คำอธิบายกลุ่ม (Description)</label>
                <textarea className="form-input w-full min-h-20" placeholder="คำอธิบายสั้นๆ..." value={groupModal.form.description} onChange={(e) => setGroupModal({ ...groupModal, form: { ...groupModal.form, description: e.target.value } })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-600 block">ลำดับการแสดงผล (Display Order)</label>
                <input type="number" required className="form-input w-28 text-center" value={groupModal.form.displayOrder} onChange={(e) => setGroupModal({ ...groupModal, form: { ...groupModal.form, displayOrder: parseInt(e.target.value, 10) || 0 } })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setGroupModal(prev => ({ ...prev, isOpen: false }))} className="btn btn-outline h-9 text-xs">ยกเลิก</button>
                <button type="submit" className="btn btn-primary h-9 text-xs flex items-center gap-1"><Save size={14} /> บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FOR COMPETENCY CATEGORY ADD/EDIT */}
      {categoryModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            onClick={() => setCategoryModal(prev => ({ ...prev, isOpen: false }))} 
          />
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative z-10 border border-slate-100">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-sm">
                {categoryModal.mode === 'create' ? 'เพิ่มหมวดหมู่ย่อย' : 'แก้ไขหมวดหมู่ย่อย'}
              </h3>
              <button onClick={() => setCategoryModal(prev => ({ ...prev, isOpen: false }))} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-600 block">กลุ่มสมรรถนะ (Group)</label>
                <select required className="form-select w-full" value={categoryModal.form.groupId} onChange={(e) => setCategoryModal({ ...categoryModal, form: { ...categoryModal.form, groupId: e.target.value } })}>
                  <option value="">เลือกกลุ่มสมรรถนะ</option>
                  {tree.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-600 block">รหัสหมวดหมู่ (Code)</label>
                <input required className="form-input w-full uppercase" placeholder="เช่น ORG_CORE_ADMIN" value={categoryModal.form.code} onChange={(e) => setCategoryModal({ ...categoryModal, form: { ...categoryModal.form, code: e.target.value } })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-600 block">ชื่อหมวดหมู่ย่อย (Name)</label>
                <input required className="form-input w-full" placeholder="เช่น การบริหารความเสี่ยงและการประเมิน" value={categoryModal.form.name} onChange={(e) => setCategoryModal({ ...categoryModal, form: { ...categoryModal.form, name: e.target.value } })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-600 block">คำอธิบายหมวดหมู่ (Description)</label>
                <textarea className="form-input w-full min-h-20" placeholder="คำอธิบายสั้นๆ..." value={categoryModal.form.description} onChange={(e) => setCategoryModal({ ...categoryModal, form: { ...categoryModal.form, description: e.target.value } })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-600 block">ลำดับการแสดงผล (Display Order)</label>
                <input type="number" required className="form-input w-28 text-center" value={categoryModal.form.displayOrder} onChange={(e) => setCategoryModal({ ...categoryModal, form: { ...categoryModal.form, displayOrder: parseInt(e.target.value, 10) || 0 } })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setCategoryModal(prev => ({ ...prev, isOpen: false }))} className="btn btn-outline h-9 text-xs">ยกเลิก</button>
                <button type="submit" className="btn btn-primary h-9 text-xs flex items-center gap-1"><Save size={14} /> บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CompetencyManagement;
