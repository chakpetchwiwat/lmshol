import React from 'react';
import { LayoutGrid, Archive, Search } from 'lucide-react';
import { FILTER_VALUES } from '../../utils/constants/filters';
import { ENTITY_VIEW_STATUS } from '../../utils/constants/statuses';
import ViewToggleTabs from '../common/ViewToggleTabs';
import CustomSelect from '../common/CustomSelect';

const CourseFilters = ({
  courseView,
  setCourseView,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  selectedModuleGroup,
  setSelectedModuleGroup,
  categories,
  moduleGroupOptions,
  activeCount,
  archivedCount,
}) => {
  return (
    <div className="space-y-6">
      <ViewToggleTabs
        viewMode={courseView}
        setViewMode={setCourseView}
        tabs={[
          { key: ENTITY_VIEW_STATUS.ACTIVE, label: `คอร์สที่เผยแพร่อยู่ (${activeCount})`, icon: LayoutGrid },
          { key: ENTITY_VIEW_STATUS.ARCHIVED, label: `Archive (${archivedCount})`, icon: Archive },
        ]}
      />

      <div className="card !overflow-visible">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-4">
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              type="text"
              placeholder="ค้นหาคอร์ส..."
              className="w-full rounded-md border border-border bg-gray-50 py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div className="grid w-full gap-4 sm:grid-cols-2 lg:w-auto">
            <CustomSelect
              size="sm"
              className="w-full sm:w-64"
              value={selectedModuleGroup}
              onChange={(event) => setSelectedModuleGroup(event.target.value)}
              options={moduleGroupOptions}
            />

            <CustomSelect
              size="sm"
              className="w-full sm:w-64"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              options={[
                { value: FILTER_VALUES.ALL, label: 'ทุกหมวดหมู่' },
                ...(categories || [])
                  .filter((category) => !category.isArchived)
                  .map((category) => ({ value: category.id, label: category.name })),
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseFilters;
