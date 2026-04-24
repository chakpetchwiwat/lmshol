export const CATEGORY_TYPE_OPTIONS = [
  { value: 'STRAT_BUSINESS', label: 'Business Acumen / Corporate Knowledge' },
  { value: 'STRAT_CORE', label: 'Core / Soft Skills' },
  { value: 'STRAT_FUNCTIONAL', label: 'Functional Skills' },
  { value: 'STRAT_LEADERSHIP', label: 'Leadership Skills' },
  { value: 'STRAT_COMPLIANCE', label: 'Compliance' },
  { value: 'STRAT_DIGITAL', label: 'Digital / Future Skills' },
];

export const getDefaultCategoryForm = () => ({
  name: '',
  icon: 'Grid',
  type: 'STRAT_BUSINESS',
  order: 0,
  visibleToAll: true,
  visibleDepartmentIds: [],
  visibleTierIds: [],
  isTemporary: false,
  expiredAt: '',
});

export const categoryTypeBadgeClass = (type) => {
  if (type === 'STRAT_BUSINESS') return 'bg-indigo-50 text-indigo-600 ring-indigo-200';
  if (type === 'STRAT_CORE') return 'bg-emerald-50 text-emerald-600 ring-emerald-200';
  if (type === 'STRAT_FUNCTIONAL') return 'bg-amber-50 text-amber-600 ring-amber-200';
  if (type === 'STRAT_LEADERSHIP') return 'bg-blue-50 text-blue-600 ring-blue-200';
  if (type === 'STRAT_COMPLIANCE') return 'bg-purple-50 text-purple-600 ring-purple-200';
  if (type === 'STRAT_DIGITAL') return 'bg-rose-50 text-rose-600 ring-rose-200';
  return 'bg-slate-50 text-slate-500 ring-slate-200';
};

export const categoryTypeLabel = (type) => {
  if (type === 'STRAT_BUSINESS') return 'Business / Corporate';
  if (type === 'STRAT_CORE') return 'Core / Soft';
  if (type === 'STRAT_FUNCTIONAL') return 'Functional';
  if (type === 'STRAT_LEADERSHIP') return 'Leadership';
  if (type === 'STRAT_COMPLIANCE') return 'Compliance';
  if (type === 'STRAT_DIGITAL') return 'Digital';
  return type;
};
