import { Clock, Plus } from 'lucide-react';
import CustomDateTimePicker from '../../common/CustomDateTimePicker';
import CustomSelect from '../../common/CustomSelect';
import CategoryIconPicker from './CategoryIconPicker';
import CategoryVisibilityEditor from './CategoryVisibilityEditor';
import { CATEGORY_TYPE_OPTIONS } from './categoryForm.utils';

const CategoryEditorForm = ({
  categoryForm,
  departments,
  editingCategoryId,
  iconPickerRef,
  onCancelEdit,
  onSave,
  setCategoryForm,
  setShowIconPicker,
  showIconPicker,
  tiers,
}) => (
  <form
    onSubmit={onSave}
    className={`mb-5 space-y-4 overflow-y-auto rounded-3xl border-2 p-5 transition-all duration-300 xl:mb-0 xl:min-h-0 xl:pr-3 ${
      editingCategoryId
        ? 'border-primary/30 bg-primary/5 shadow-inner'
        : 'border-slate-100 bg-slate-50/70'
    }`}
  >
    <div className="flex items-center justify-between px-1">
      <label className="text-xs font-black uppercase tracking-widest text-slate-400">
        {editingCategoryId ? 'กำลังแก้ไขหมวดหมู่' : 'สร้างหมวดหมู่ใหม่'}
      </label>
      {editingCategoryId && (
        <button
          type="button"
          onClick={onCancelEdit}
          className="text-xs font-bold uppercase tracking-widest text-primary hover:underline"
        >
          ยกเลิกการแก้ไข
        </button>
      )}
    </div>



    <div className="flex flex-col gap-3 md:flex-row md:items-end">
      <div className="flex-1 space-y-1.5">
        <label className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">ชื่อหมวดหมู่</label>
        <input
          required
          type="text"
          placeholder="เช่น AI, Business, ..."
          className={`form-input w-full bg-white px-4 py-3 text-sm font-bold transition-all ${
            editingCategoryId ? 'border-primary/50 ring-2 ring-primary/10' : 'border-slate-200'
          }`}
          value={categoryForm.name}
          onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })}
        />
      </div>

      <CategoryIconPicker
        categoryForm={categoryForm}
        editingCategoryId={editingCategoryId}
        iconPickerRef={iconPickerRef}
        showIconPicker={showIconPicker}
        setCategoryForm={setCategoryForm}
        setShowIconPicker={setShowIconPicker}
      />

      <button
        type="submit"
        className={`btn h-[46px] shrink-0 px-8 text-xs font-black uppercase tracking-widest shadow-lg transition-transform active:scale-95 ${editingCategoryId ? 'bg-slate-900 text-white' : 'btn-primary'}`}
      >
        {editingCategoryId ? 'บันทึก' : 'เพิ่ม'}
      </button>
    </div>

    <div className="relative overflow-hidden rounded-[2rem] border border-amber-200/50 bg-gradient-to-br from-amber-50/80 to-amber-100/40 p-6 shadow-sm transition-all hover:shadow-md">
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-400/10 blur-2xl" />
      <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-amber-300/10 blur-2xl" />

      <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-700 shadow-inner">
            <Clock size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-black uppercase tracking-widest text-amber-900/70">หมวดหมู่ชั่วคราว</p>
              <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500" />
            </div>
            <p className="mt-1.5 text-sm font-medium leading-relaxed text-amber-900/80">
              หมวดนี้จะย้ายไปยัง <span className="font-bold">Archive</span> อัตโนมัติเมื่อครบกำหนดเวลา
            </p>
          </div>
        </div>

        <label className="group flex cursor-pointer select-none items-center gap-3 self-end rounded-2xl border border-amber-300/40 bg-white/80 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-amber-900 shadow-sm transition-all hover:bg-white hover:shadow-md active:scale-95 md:self-start">
          <div className="relative inline-flex h-5 w-5 items-center justify-center">
            <input
              type="checkbox"
              checked={Boolean(categoryForm.isTemporary)}
              onChange={(event) => setCategoryForm({
                ...categoryForm,
                isTemporary: event.target.checked,
                expiredAt: event.target.checked ? categoryForm.expiredAt : '',
              })}
              className="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border-2 border-amber-300 transition-all checked:border-transparent checked:bg-amber-500"
            />
            <Plus size={14} className="absolute rotate-45 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
          </div>
          ใช้งานระบบชั่วคราว
        </label>
      </div>

      {categoryForm.isTemporary && (
        <div className="mt-6 duration-300 animate-in fade-in slide-in-from-top-2">
          <CustomDateTimePicker
            value={categoryForm.expiredAt}
            onChange={(event) => setCategoryForm({ ...categoryForm, expiredAt: event.target.value })}
            label="ระบุวันและเวลาหมดอายุ (พ.ศ.)"
          />
        </div>
      )}
    </div>

    <CategoryVisibilityEditor
      categoryForm={categoryForm}
      departments={departments}
      tiers={tiers}
      setCategoryForm={setCategoryForm}
    />
  </form>
);

export default CategoryEditorForm;
