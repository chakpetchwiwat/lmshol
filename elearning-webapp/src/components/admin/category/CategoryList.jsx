import CategoryListItem from './CategoryListItem';

const CategoryList = ({
  categories,
  editingCategoryId,
  onArchive,
  onDelete,
  onEdit,
  onMove,
  onRepublish,
}) => (
  <section className="flex min-h-[22rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white xl:min-h-0">
    <div className="border-b border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.96))] px-4 py-4 sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">หมวดหมู่ที่จัดการได้</p>
          <h4 className="mt-1 text-base font-black tracking-tight text-slate-900">ลำดับหมวดหมู่ปัจจุบัน</h4>
          <p className="mt-1 text-sm font-medium text-slate-500">
            ขยายพื้นที่แสดงรายการเพื่อให้เห็นชื่อหมวด ป้ายสถานะ และปุ่มจัดการชัดขึ้นบนจอ notebook
          </p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          {categories.length} รายการ
        </div>
      </div>
    </div>

    <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-3">
        {categories.map((category, index) => (
          <CategoryListItem
            key={category.id}
            category={category}
            index={index}
            isEditing={editingCategoryId === category.id}
            isLast={index === categories.length - 1}
            onArchive={onArchive}
            onDelete={onDelete}
            onEdit={(formData) => onEdit(category.id, formData)}
            onMove={onMove}
            onRepublish={onRepublish}
          />
        ))}
      </div>
    </div>
  </section>
);

export default CategoryList;
