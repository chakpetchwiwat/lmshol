import React from 'react';
import { Search } from 'lucide-react';
import { FILTER_VALUES } from '../../utils/constants/filters';
import CustomSelect from '../common/CustomSelect';

const UserFilters = ({
  searchTerm,
  onSearchChange,
  selectedDepartment,
  onDepartmentChange,
  departments,
  selectedTier,
  onTierChange,
  tiers,
}) => {
  return (
    <div className="flex flex-wrap gap-4 border-b border-border p-4">
      <div className="relative w-full lg:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <input
          type="text"
          placeholder="ค้นหาชื่อ หรืออีเมล..."
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-full rounded-md border border-border bg-gray-50 py-2 pl-10 pr-4 text-sm outline-none focus:border-primary"
        />
      </div>

      <CustomSelect
        className="w-full lg:w-48"
        value={selectedDepartment}
        onChange={(event) => onDepartmentChange(event.target.value)}
        options={[
          { value: FILTER_VALUES.ALL, label: 'ทุกแผนก' },
          ...departments.map((d) => ({ value: d.id, label: d.name }))
        ]}
      />

      <CustomSelect
        className="w-full lg:w-48"
        value={selectedTier}
        onChange={(event) => onTierChange(event.target.value)}
        options={[
          { value: FILTER_VALUES.ALL, label: 'ทุกระดับ' },
          ...tiers.map((t) => ({ value: t.id, label: t.name }))
        ]}
      />
    </div>
  );
};

export default UserFilters;
