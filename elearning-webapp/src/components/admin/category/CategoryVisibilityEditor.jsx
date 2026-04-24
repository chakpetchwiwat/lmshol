const toggleId = (ids = [], id) => (
  ids.includes(id)
    ? ids.filter((itemId) => itemId !== id)
    : [...ids, id]
);

const CategoryVisibilityEditor = ({
  categoryForm,
  departments,
  tiers,
  setCategoryForm,
}) => (
  <>
    <div>
      <p className="mb-2 text-xs font-bold uppercase text-muted">เธชเธดเธ—เธเธดเนเธเธฒเธฃเธกเธญเธเน€เธซเนเธ</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setCategoryForm({ ...categoryForm, visibleToAll: true, visibleDepartmentIds: [], visibleTierIds: [] })}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
            categoryForm.visibleToAll
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
          }`}
        >
          เธ—เธธเธเธเธ (ALL)
        </button>
        <button
          type="button"
          onClick={() => setCategoryForm({ ...categoryForm, visibleToAll: false })}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
            !categoryForm.visibleToAll
              ? 'bg-primary text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
          }`}
        >
          เน€เธฅเธทเธญเธเน€เธเธเธฒเธฐเธเธฅเธธเนเธก
        </button>
      </div>
    </div>

    {!categoryForm.visibleToAll && (
      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">เนเธเธเธ (Department)</p>
          <div className="flex flex-wrap gap-1.5">
            {departments.map((department) => {
              const isSelected = (categoryForm.visibleDepartmentIds || []).includes(department.id);

              return (
                <button
                  key={department.id}
                  type="button"
                  onClick={() => setCategoryForm({
                    ...categoryForm,
                    visibleDepartmentIds: toggleId(categoryForm.visibleDepartmentIds, department.id),
                  })}
                  className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                    isSelected
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {department.name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">เธฃเธฐเธ”เธฑเธเธเธนเนเนเธเนเธเธฒเธ (Tier)</p>
          <div className="flex flex-wrap gap-1.5">
            {tiers.map((tier) => {
              const isSelected = (categoryForm.visibleTierIds || []).includes(tier.id);

              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setCategoryForm({
                    ...categoryForm,
                    visibleTierIds: toggleId(categoryForm.visibleTierIds, tier.id),
                  })}
                  className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                    isSelected
                      ? 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/30'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {tier.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    )}
  </>
);

export default CategoryVisibilityEditor;
