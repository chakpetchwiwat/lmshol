import React from 'react';
import { FileSpreadsheet, Layers, Plus, RefreshCw, Search, Target, Upload } from 'lucide-react';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { adminAPI } from '../../utils/api';
import { useToast } from '../../context/useToast';

const emptyGroupForm = { code: '', name: '', description: '' };
const emptyCategoryForm = { groupId: '', code: '', name: '', description: '' };
const emptyCompetencyForm = {
  categoryId: '',
  code: '',
  name: '',
  description: '',
  measurementDescription: '',
  levelsText: '1\n2\n3\n4\n5'
};

const CompetencyManagement = () => {
  const toast = useToast();
  const [loading, setLoading] = React.useState(true);
  const [tree, setTree] = React.useState([]);
  const [competencies, setCompetencies] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [importFile, setImportFile] = React.useState(null);
  const [importing, setImporting] = React.useState(false);
  const [importSummary, setImportSummary] = React.useState(null);
  const [groupForm, setGroupForm] = React.useState(emptyGroupForm);
  const [categoryForm, setCategoryForm] = React.useState(emptyCategoryForm);
  const [competencyForm, setCompetencyForm] = React.useState(emptyCompetencyForm);

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

  const categoryOptions = React.useMemo(() => (
    tree.flatMap((group) => (group.categories || []).map((category) => ({
      ...category,
      groupName: group.name
    })))
  ), [tree]);

  const filteredCompetencies = React.useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return competencies;
    return competencies.filter((competency) => [
      competency.code,
      competency.legacyCode,
      competency.name,
      competency.categoryName,
      competency.groupName,
      competency.measurementDescription
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(keyword)));
  }, [competencies, searchTerm]);

  const handleCreateGroup = async (event) => {
    event.preventDefault();
    try {
      await adminAPI.createCompetencyGroup(groupForm);
      setGroupForm(emptyGroupForm);
      toast.success('สร้างกลุ่มโมดูลแล้ว');
      await fetchData();
    } catch (error) {
      console.error('Create competency group error:', error);
      toast.error(error.response?.data?.message || 'สร้างกลุ่มโมดูลไม่สำเร็จ');
    }
  };

  const handleCreateCategory = async (event) => {
    event.preventDefault();
    try {
      await adminAPI.createCompetencyCategory(categoryForm);
      setCategoryForm(emptyCategoryForm);
      toast.success('สร้างหมวด competency แล้ว');
      await fetchData();
    } catch (error) {
      console.error('Create competency category error:', error);
      toast.error(error.response?.data?.message || 'สร้างหมวดไม่สำเร็จ');
    }
  };

  const handleCreateCompetency = async (event) => {
    event.preventDefault();
    try {
      const levels = competencyForm.levelsText
        .split(/\r?\n/)
        .map((line, index) => {
          const [levelText, ...descriptionParts] = line.split('|');
          const level = parseInt(levelText.trim(), 10);
          if (Number.isNaN(level)) return null;
          return {
            level,
            label: `Level ${level}`,
            description: descriptionParts.join('|').trim(),
            displayOrder: index
          };
        })
        .filter(Boolean);

      await adminAPI.createCompetency({
        ...competencyForm,
        sourceColumnK: competencyForm.measurementDescription,
        levels
      });
      setCompetencyForm(emptyCompetencyForm);
      toast.success('สร้าง competency แล้ว');
      await fetchData();
    } catch (error) {
      console.error('Create competency error:', error);
      toast.error(error.response?.data?.message || 'สร้าง competency ไม่สำเร็จ');
    }
  };

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
      toast.success('Import GBT competency สำเร็จ');
      setImportFile(null);
      await fetchData();
    } catch (error) {
      console.error('Import GBT competency error:', error);
      toast.error(error.response?.data?.message || 'Import GBT competency ไม่สำเร็จ');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title="Competency Management"
        subtitle="จัดการ Competency Framework แยกจากหมวดหมู่คอร์ส และใช้เป็น master data สำหรับคอร์ส/อบรมภายนอก/GBT"
        icon={<Target size={24} />}
        actions={(
          <button type="button" onClick={fetchData} className="btn btn-outline">
            <RefreshCw size={16} />
            Refresh
          </button>
        )}
      />

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                <Layers size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Framework Tree</h3>
                <p className="text-xs font-semibold text-slate-500">{tree.length} groups</p>
              </div>
            </div>

            <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-1">
              {loading ? (
                <div className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-400">Loading...</div>
              ) : tree.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm font-bold text-slate-400">
                  ยังไม่มี framework
                </div>
              ) : tree.map((group) => (
                <div key={group.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="text-sm font-black text-slate-900">{group.name}</div>
                  <div className="mt-1 text-[11px] font-bold uppercase text-slate-400">{group.code}</div>
                  <div className="mt-3 space-y-2">
                    {(group.categories || []).map((category) => (
                      <div key={category.id} className="rounded-lg bg-white px-3 py-2">
                        <div className="text-xs font-black text-slate-700">{category.name}</div>
                        <div className="mt-1 text-[11px] font-semibold text-slate-400">
                          {(category.competencies || []).length} competencies
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Import GBT Excel</h3>
                <p className="text-xs font-semibold text-slate-500">อ่านข้อมูล A-K และเก็บรหัสเดิมคอลัมน์ F</p>
              </div>
            </div>
            <form onSubmit={handleImportGbt} className="space-y-3">
              <input
                type="file"
                accept=".xlsx,.xls"
                className="form-input"
                onChange={(event) => setImportFile(event.target.files?.[0] || null)}
              />
              <button type="submit" disabled={importing || !importFile} className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
                <Upload size={16} />
                {importing ? 'Importing...' : 'Import GBT'}
              </button>
            </form>
            {importSummary && (
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-600">
                <div className="rounded-lg bg-slate-50 p-2">Rows: {importSummary.importedRows}</div>
                <div className="rounded-lg bg-slate-50 p-2">Competency +{importSummary.competenciesCreated} / ~{importSummary.competenciesUpdated}</div>
                <div className="rounded-lg bg-slate-50 p-2">Groups +{importSummary.groupsCreated}</div>
                <div className="rounded-lg bg-slate-50 p-2">Categories +{importSummary.categoriesCreated}</div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-black text-slate-900">เพิ่มกลุ่มโมดูล</h3>
            <form onSubmit={handleCreateGroup} className="mt-4 space-y-3">
              <input required className="form-input" placeholder="Code เช่น ORG" value={groupForm.code} onChange={(e) => setGroupForm({ ...groupForm, code: e.target.value })} />
              <input required className="form-input" placeholder="ชื่อกลุ่มโมดูล" value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} />
              <textarea className="form-input min-h-20" placeholder="รายละเอียด" value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} />
              <button type="submit" className="btn btn-primary w-full"><Plus size={16} /> Add Group</button>
            </form>
          </section>
        </aside>

        <main className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-black text-slate-900">เพิ่มหมวด Competency</h3>
              <form onSubmit={handleCreateCategory} className="mt-4 space-y-3">
                <select required className="form-input" value={categoryForm.groupId} onChange={(e) => setCategoryForm({ ...categoryForm, groupId: e.target.value })}>
                  <option value="">เลือกกลุ่มโมดูล</option>
                  {tree.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </select>
                <input required className="form-input" placeholder="Code เช่น ORG_CORE" value={categoryForm.code} onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })} />
                <input required className="form-input" placeholder="ชื่อหมวด" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} />
                <textarea className="form-input min-h-20" placeholder="รายละเอียด" value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} />
                <button type="submit" className="btn btn-primary w-full"><Plus size={16} /> Add Category</button>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-black text-slate-900">เพิ่มหัวข้อ Competency</h3>
              <form onSubmit={handleCreateCompetency} className="mt-4 space-y-3">
                <select required className="form-input" value={competencyForm.categoryId} onChange={(e) => setCompetencyForm({ ...competencyForm, categoryId: e.target.value })}>
                  <option value="">เลือกหมวด</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>{category.groupName} / {category.name}</option>
                  ))}
                </select>
                <input required className="form-input" placeholder="Code เช่น GBT-001" value={competencyForm.code} onChange={(e) => setCompetencyForm({ ...competencyForm, code: e.target.value })} />
                <input required className="form-input" placeholder="ชื่อ competency" value={competencyForm.name} onChange={(e) => setCompetencyForm({ ...competencyForm, name: e.target.value })} />
                <textarea className="form-input min-h-20" placeholder="คำอธิบายการวัดระดับจาก Excel ช่อง K" value={competencyForm.measurementDescription} onChange={(e) => setCompetencyForm({ ...competencyForm, measurementDescription: e.target.value })} />
                <textarea className="form-input min-h-24" placeholder="Levels: ใช้รูปแบบ 1|คำอธิบาย ต่อบรรทัด" value={competencyForm.levelsText} onChange={(e) => setCompetencyForm({ ...competencyForm, levelsText: e.target.value })} />
                <button type="submit" className="btn btn-primary w-full"><Plus size={16} /> Add Competency</button>
              </form>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Competency List</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">{filteredCompetencies.length} items</p>
              </div>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  className="form-input w-full pl-10"
                  placeholder="Search competency..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
              <div className="grid grid-cols-[140px_160px_1fr_180px_120px] bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-500">
                <div>Code</div>
                <div>Legacy</div>
                <div>Name</div>
                <div>Category</div>
                <div>Levels</div>
              </div>
              <div className="divide-y divide-slate-100">
                {filteredCompetencies.map((competency) => (
                  <div key={competency.id} className="grid grid-cols-[140px_160px_1fr_180px_120px] items-start gap-3 px-4 py-3 text-sm">
                    <div className="font-black text-slate-700">{competency.code}</div>
                    <div className="text-xs font-bold text-slate-500">{competency.legacyCode || '-'}</div>
                    <div>
                      <div className="font-bold text-slate-900">{competency.name}</div>
                      {competency.measurementDescription && (
                        <div className="mt-1 line-clamp-2 text-xs font-medium text-slate-500">{competency.measurementDescription}</div>
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-500">{competency.categoryName || '-'}</div>
                    <div className="flex flex-wrap gap-1">
                      {(competency.levels || []).map((level) => (
                        <span key={level.id} className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-700">L{level.level}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {filteredCompetencies.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm font-bold text-slate-400">ไม่พบ competency</div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default CompetencyManagement;
