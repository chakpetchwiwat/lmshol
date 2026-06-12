import React from 'react';
import { Book, Trophy, Clock, Plus, ImageIcon, Upload, Trash2, FileText, Layers, Users, GraduationCap, Video, Award, CheckCircle2, Building2 } from 'lucide-react';
import OutcomeListEditor from './OutcomeListEditor';
import BenefitListEditor from './BenefitListEditor';
import InstructorPresetPicker from './InstructorPresetPicker';
import CertificateTemplateSelector from './CertificateTemplateSelector';
import MediaLibraryModal from '../common/MediaLibraryModal';
import CustomDateTimePicker from '../common/CustomDateTimePicker';
import CustomSelect from '../common/CustomSelect';
import { adminAPI, getFullUrl, DEFAULT_COURSE_IMAGE } from '../../utils/api';
import CourseBuilderFooter from './course-builder/CourseBuilderFooter';
import SignatureImage from '../common/SignatureImage';
import CompetencyMappingSelector from './CompetencyMappingSelector';

const CourseBasicInfoForm = ({
  isPersisted,
  lessonCount,
  courseForm,
  setCourseForm,
  categories,
  instructorPresets,
  organizationPresets = [],
  departments,
  tiers,
  cohortRoles = [],
  competencies = [],
  onSaveCourse,
  onImageUpload,
  uploading,
  imageInputRef,
  onClose,
  readOnly
}) => {
  const signatureUploadRefs = React.useRef({});
  const [targetMode, setTargetMode] = React.useState(
    Array.isArray(courseForm.visibleCohortRoleIds) && courseForm.visibleCohortRoleIds.length > 0 ? 'cohortRole' : 'department'
  );
  const [mediaLibrary, setMediaLibrary] = React.useState({
    isOpen: false,
    allowedTypes: 'all',
    onSelect: null
  });

  const signatureSlots = Array.isArray(courseForm.certificateSignatureSlots) && courseForm.certificateSignatureSlots.length > 0
    ? courseForm.certificateSignatureSlots
    : [
        { id: 'organization', label: 'Signature 1', type: 'ORGANIZATION', enabled: true, organizationPresetId: '', name: '', title: '', signatureImageUrl: '', stampImageUrl: '' },
        { id: 'instructor', label: 'Signature 2', type: 'INSTRUCTOR', enabled: true, name: '', title: '', signatureImageUrl: '' },
      ];

  const updateSignatureSlot = (index, changes) => {
    const nextSlots = signatureSlots.map((slot, slotIndex) => (
      slotIndex === index ? { ...slot, ...changes } : slot
    ));
    setCourseForm({ ...courseForm, certificateSignatureSlots: nextSlots });
  };

  const handleSignatureUpload = async (index, file) => {
    if (!file) return;

    try {
      const response = await adminAPI.uploadSignatureFile(file);
      updateSignatureSlot(index, { signatureImageUrl: response.data.fileUrl || response.data.fileKey });
    } catch (error) {
      console.error('Upload certificate signature error:', error);
      window.alert(error.response?.data?.message || 'Unable to upload signature image.');
    } finally {
      if (signatureUploadRefs.current[index]) {
        signatureUploadRefs.current[index].value = '';
      }
    }
  };

  return (
    <form onSubmit={onSaveCourse} className="flex flex-col gap-4">
      <fieldset disabled={readOnly} className="contents">
      <div className="space-y-1.5">
        <label className="ml-1 block text-sm font-black uppercase tracking-wider text-slate-700">ชื่อคอร์ส</label>
        <div className="relative group">
          <Book className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" size={18} />
          <input
            required
            type="text"
            className="form-input w-full pl-12"
            placeholder="ตั้งชื่อคอร์สให้น่าสนใจ..."
            value={courseForm.title}
            onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CustomSelect
          label="หมวดหมู่"
          placeholder="เลือกหมวดหมู่..."
          value={courseForm.categoryId}
          onChange={(e) => setCourseForm({ ...courseForm, categoryId: e.target.value })}
          options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
        />

        <div className="space-y-1.5">
          <label className="ml-1 block text-sm font-black uppercase tracking-wider text-slate-700">แต้มรางวัล (Points)</label>
          <div className="relative group">
            <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-amber-500" size={18} />
            <input
              type="number"
              className="form-input w-full pl-12"
              value={courseForm.points}
              onChange={(e) => setCourseForm({ ...courseForm, points: parseInt(e.target.value || 0, 10) })}
            />
          </div>
        </div>
      </div>

      <CompetencyMappingSelector
        competencies={competencies}
        value={courseForm.competencies || []}
        onChange={(nextCompetencies) => setCourseForm({ ...courseForm, competencies: nextCompetencies })}
        readOnly={readOnly}
        title="Competency Mapping"
        description="เลือกหัวข้อ competency ที่คอร์สนี้เกี่ยวข้อง และกำหนดระดับที่ต้องการต่อหัวข้อ"
      />

      <div>
        <div className="relative mb-6 overflow-hidden rounded-[2rem] border border-amber-200/50 bg-gradient-to-br from-amber-50/80 to-amber-100/40 p-6 shadow-sm backdrop-blur-md transition-all hover:shadow-md">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-400/10 blur-2xl animate-pulse"></div>
          <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-amber-300/10 blur-2xl animate-pulse delay-700"></div>

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-700 shadow-inner">
                <Clock size={24} className="animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-black uppercase tracking-widest text-amber-900/70">คอร์สชั่วคราว</p>
                  <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                </div>
                <p className="mt-1.5 text-sm font-medium leading-relaxed text-amber-900/80">
                  คอร์สนี้จะถูกซ่อน <span className="font-bold">อัตโนมัติ</span> เมื่อถึงวันเวลาที่ตั้งไว้
                </p>
              </div>
            </div>

            <label className="group flex cursor-pointer select-none items-center gap-3 self-end rounded-2xl border border-amber-300/40 bg-white/80 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-amber-900 shadow-sm transition-all hover:bg-white hover:shadow-md active:scale-95 md:self-start">
              <div className="relative inline-flex h-5 w-5 items-center justify-center">
                <input
                  type="checkbox"
                  checked={Boolean(courseForm.isTemporary)}
                  onChange={(event) =>
                    setCourseForm({
                      ...courseForm,
                      isTemporary: event.target.checked,
                      expiredAt: event.target.checked ? courseForm.expiredAt : '',
                    })
                  }
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border-2 border-amber-300 transition-all checked:border-transparent checked:bg-amber-500"
                />
                <Plus size={14} className="absolute rotate-45 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
              </div>
              ใช้งานแบบชั่วคราว
            </label>
          </div>

          {courseForm.isTemporary && (
            <div className="mt-6 animate-in slide-in-from-top-2 fade-in duration-300">
              <CustomDateTimePicker
                value={courseForm.expiredAt}
                onChange={(e) => setCourseForm({ ...courseForm, expiredAt: e.target.value })}
                label="กำหนดวันและเวลาหมดอายุ"
              />
            </div>
          )}
        </div>

        <label className="mb-1 block text-sm font-bold text-gray-700">รูปหน้าปกคอร์ส</label>
        <input type="file" ref={imageInputRef} accept="image/*" onChange={onImageUpload} className="hidden" />

        {courseForm.image ? (
          <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            <img
              src={getFullUrl(courseForm.image) || DEFAULT_COURSE_IMAGE}
              alt="Course thumbnail"
              className="h-40 w-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="flex gap-2 border-t border-gray-100 bg-white p-2">
              <button type="button" onClick={() => imageInputRef.current?.click()} className="btn btn-outline btn-sm flex-1 text-xs" disabled={uploading}>
                <Upload size={14} /> เปลี่ยนรูป
              </button>
              <button
                type="button"
                onClick={() => setMediaLibrary({
                  isOpen: true,
                  allowedTypes: 'image',
                  onSelect: (file) => setCourseForm({ ...courseForm, image: file.fileUrl })
                })}
                className="btn btn-outline btn-sm flex-1 text-xs"
              >
                เลือกจากคลังสื่อ
              </button>
              <button type="button" onClick={() => setCourseForm({ ...courseForm, image: '' })} className="btn btn-outline btn-sm border-danger/30 text-xs text-danger">
                <Trash2 size={14} /> ลบ
              </button>
            </div>
          </div>
        ) : (
          <div className="flex h-40 w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 text-gray-400 p-4">
            {uploading ? (
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary"></div>
                <span className="text-xs font-bold">กำลังอัปโหลด...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <ImageIcon size={24} />
                  <span className="text-xs font-bold">ยังไม่มีรูปหน้าปกคอร์ส</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="btn btn-outline btn-sm gap-1 text-xs"
                  >
                    <Upload size={12} /> อัปโหลดรูปใหม่
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaLibrary({
                      isOpen: true,
                      allowedTypes: 'image',
                      onSelect: (file) => setCourseForm({ ...courseForm, image: file.fileUrl })
                    })}
                    className="btn btn-primary btn-sm gap-1 text-xs"
                  >
                    เลือกจากคลังสื่อ
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="ml-1 block text-sm font-black uppercase tracking-wider text-slate-700">รายละเอียด (Description)</label>
        <div className="relative group">
          <FileText className="absolute left-4 top-4 text-slate-400 transition-colors group-focus-within:text-primary" size={18} />
          <textarea
            rows={4}
            className="form-input w-full resize-none pl-12"
            value={courseForm.description}
            onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
            placeholder="เขียนรายละเอียดหลักสูตร เพื่อให้พนักงานเข้าใจว่าได้เรียนอะไรบ้าง..."
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
        <div className="flex flex-col gap-1">
          <h4 className="text-base font-black text-slate-900">สิทธิ์การมองเห็นคอร์ส</h4>
          <p className="text-sm text-slate-500">
            กำหนดได้ว่าแผนกไหนหรือ Role ไหนจะเห็นคอร์สนี้ ถ้าไม่จำกัด ระบบจะแสดงคอร์สให้ทุกคน
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={courseForm.visibleToAll}
              onChange={(event) =>
                setCourseForm({
                  ...courseForm,
                  visibleToAll: event.target.checked,
                  visibleDepartmentIds: [],
                  visibleTierIds: [],
                  visibleCohortRoleIds: [],
                })
              }
              className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <span>
              <span className="block text-sm font-bold text-slate-900">เปิดให้ทุกคนเห็นคอร์สนี้</span>
              <span className="block text-xs text-slate-500">
                ถ้าปิดตัวเลือกนี้ ระบบจะใช้แผนกหรือ Role ในการควบคุมการมองเห็น
              </span>
            </span>
          </label>
        </div>

        {!courseForm.visibleToAll && (
          <div className="mt-4 space-y-4">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => {
                  setTargetMode('department');
                  setCourseForm({
                    ...courseForm,
                    visibleCohortRoleIds: [],
                    visibleTierIds: [],
                  });
                }}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${
                  targetMode === 'department'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Building2 size={15} />
                แผนก
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetMode('cohortRole');
                  setCourseForm({
                    ...courseForm,
                    visibleDepartmentIds: [],
                    visibleTierIds: [],
                  });
                }}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${
                  targetMode === 'cohortRole'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Users size={15} />
                Role (Cohort Role)
              </button>
            </div>

            {targetMode === 'department' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3">
                  <h5 className="text-sm font-black text-slate-900">แผนกที่เห็นคอร์สได้</h5>
                  <p className="text-xs text-slate-500">พนักงานในแผนกที่เลือกจะสามารถมองเห็นและเข้าเรียนคอร์สนี้ได้</p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {departments.length === 0 ? (
                    <p className="text-sm text-slate-500 col-span-full">ยังไม่มีแผนกในระบบ กรุณาไปเพิ่มจากหน้าผู้ใช้งานก่อน</p>
                  ) : (
                    departments.map((department) => (
                      <label key={department.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Array.isArray(courseForm.visibleDepartmentIds) && courseForm.visibleDepartmentIds.includes(department.id)}
                          onChange={(event) => {
                            const currentIds = Array.isArray(courseForm.visibleDepartmentIds) ? courseForm.visibleDepartmentIds : [];
                            const nextIds = event.target.checked
                              ? [...currentIds, department.id]
                              : currentIds.filter((id) => id !== department.id);

                            setCourseForm({
                              ...courseForm,
                              visibleDepartmentIds: nextIds,
                            });
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span className="font-bold truncate">{department.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {targetMode === 'cohortRole' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3">
                  <h5 className="text-sm font-black text-slate-900">Role ที่เห็นคอร์สได้</h5>
                  <p className="text-xs text-slate-500">พนักงานที่มี Role ตามที่เลือกจะสามารถมองเห็นและเข้าเรียนคอร์สนี้ได้</p>
                </div>
                <div className="max-h-[350px] overflow-y-auto pr-1 space-y-4">
                  {cohortRoles.length === 0 ? (
                    <p className="text-sm text-slate-500 col-span-full">ยังไม่มี Role ในระบบ กรุณาไปเพิ่มจากหน้าผู้ใช้งานก่อน</p>
                  ) : (
                    Object.entries(
                      cohortRoles.reduce((acc, role) => {
                        const groupName = role.group || 'ทั่วไป';
                        if (!acc[groupName]) acc[groupName] = [];
                        acc[groupName].push(role);
                        return acc;
                      }, {})
                    ).map(([groupName, roles]) => (
                      <div key={groupName} className="space-y-2 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                        <h6 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                          {groupName} ({roles.length})
                        </h6>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {roles.map((role) => (
                            <label key={role.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer bg-white">
                              <input
                                type="checkbox"
                                checked={Array.isArray(courseForm.visibleCohortRoleIds) && courseForm.visibleCohortRoleIds.includes(role.id)}
                                onChange={(event) => {
                                  const currentIds = Array.isArray(courseForm.visibleCohortRoleIds) ? courseForm.visibleCohortRoleIds : [];
                                  const nextIds = event.target.checked
                                    ? [...currentIds, role.id]
                                    : currentIds.filter((id) => id !== role.id);

                                  setCourseForm({
                                    ...courseForm,
                                    visibleCohortRoleIds: nextIds,
                                  });
                                }}
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                              />
                              <span className="font-bold truncate">{role.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-slate-100 pt-6">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-primary">
          <Layers size={16} /> รายละเอียดหลักสูตรเพิ่มเติม (Premium Display)
        </h4>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-xs font-black uppercase text-slate-400">ข้อมูลผู้สอน</p>

            <InstructorPresetPicker
              presets={instructorPresets}
              selectedPresetId={courseForm.instructorPresetId}
              onSelect={(preset) =>
                setCourseForm({
                  ...courseForm,
                  instructorPresetId: preset?.id || '',
                  instructorName: preset?.name || '',
                  instructorRole: preset?.role || '',
                  instructorAvatar: preset?.avatar || '',
                  instructorBio: preset?.bio || '',
                })
              }
            />

            {(courseForm.instructorAvatar || courseForm.instructorBio) && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                    {courseForm.instructorAvatar ? (
                      <img
                        src={getFullUrl(courseForm.instructorAvatar)}
                        alt={courseForm.instructorName || 'Instructor'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-200 text-lg font-bold uppercase text-slate-400">
                        {courseForm.instructorName?.charAt(0) || 'I'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">{courseForm.instructorName || 'ยังไม่ได้เลือกวิทยากร'}</p>
                    <p className="mt-1 text-xs font-medium text-primary">{courseForm.instructorRole || 'ยังไม่ได้ระบุตำแหน่ง'}</p>
                    {courseForm.instructorBio && (
                      <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">{courseForm.instructorBio}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 ml-1 block text-xs font-black text-slate-500">ชื่อผู้สอน</label>
              <div className="relative group">
                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" size={16} />
                <input
                  type="text"
                  placeholder="ระบุชื่อ-นามสกุล..."
                  className="form-input w-full bg-white py-2.5 pl-10 text-sm"
                  value={courseForm.instructorName}
                  onChange={(e) =>
                    setCourseForm({
                      ...courseForm,
                      instructorPresetId: '',
                      instructorName: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 ml-1 block text-xs font-black text-slate-500">ตำแหน่ง (Role)</label>
              <div className="relative group">
                <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" size={16} />
                <input
                  type="text"
                  placeholder="เช่น ผู้เชี่ยวชาญด้าน..."
                  className="form-input w-full bg-white py-2.5 pl-10 text-sm"
                  value={courseForm.instructorRole}
                  onChange={(e) =>
                    setCourseForm({
                      ...courseForm,
                      instructorPresetId: '',
                      instructorRole: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50 p-6">
            <p className="mb-3 text-sm font-black uppercase text-slate-400">สื่อและสถิติหลักสูตร</p>
            <div>
              <label className="mb-2 ml-1 block text-sm font-black text-slate-600">วิดีโอตัวอย่าง (YouTube URL)</label>
              <div className="relative group">
                <Video size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" />
                <input
                  type="text"
                  placeholder="https://youtube.com/..."
                  className="form-input w-full bg-white py-3 pl-10 text-sm"
                  value={courseForm.previewVideoUrl}
                  onChange={(e) => setCourseForm({ ...courseForm, previewVideoUrl: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="mb-2 ml-1 block text-sm font-black text-slate-600">ความยาวคอร์สทั้งหมด</label>
              <div className="relative group">
                <Clock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" />
                <input
                  type="text"
                  placeholder="เช่น 24 ชั่วโมง หรือ 120 นาที"
                  className="form-input w-full bg-white py-3 pl-10 text-sm"
                  value={courseForm.totalDuration}
                  onChange={(e) => setCourseForm({ ...courseForm, totalDuration: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-8 rounded-2xl border-2 border-slate-100 bg-slate-50 p-8 md:col-span-2 md:grid-cols-2">
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-xl font-black text-slate-900">
                <Plus size={22} className="text-emerald-500" /> สิ่งที่จะได้เรียนรู้ (Outcomes)
              </label>
              <OutcomeListEditor
                value={courseForm.whatYouWillLearn}
                onChange={(val) => setCourseForm({ ...courseForm, whatYouWillLearn: val })}
              />
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-2 text-xl font-black text-slate-900">
                <Layers size={22} className="text-primary" /> สิ่งที่จะได้รับพิเศษ (Benefits)
              </label>
              <BenefitListEditor
                value={courseForm.whatYouWillGet}
                onChange={(val) => setCourseForm({ ...courseForm, whatYouWillGet: val })}
              />
            </div>
          </div>

          {/* Certificate Configuration Section */}
          <div className="mt-8 overflow-hidden rounded-[2rem] border border-indigo-100 bg-white shadow-sm transition-all hover:shadow-md md:col-span-2">
            <div className="bg-gradient-to-r from-indigo-50/50 to-white px-8 py-6 border-b border-indigo-50">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 shadow-sm">
                  <Award size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">การตั้งค่าเกียรติบัตร</h4>
                  <p className="text-sm font-medium text-slate-500">กำหนดเงื่อนไขการรับใบรับรองเมื่อจบหลักสูตร</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="max-w-md">
                  <h5 className="font-black text-slate-900">เปิดใช้งานเกียรติบัตร</h5>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                    หากเปิดใช้งาน ผู้เรียนจะได้รับเกียรติบัตรโดยอัตโนมัติเมื่อผ่านเกณฑ์ที่กำหนด
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={Boolean(courseForm.certificateEnabled)}
                    onChange={(e) => setCourseForm({ ...courseForm, certificateEnabled: e.target.checked })}
                  />
                  <div className="h-7 w-12 rounded-full bg-slate-200 transition-all after:absolute after:top-[4px] after:left-[4px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-5"></div>
                </label>
              </div>

              {courseForm.certificateEnabled && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="rounded-2xl bg-indigo-50/50 p-6 border border-indigo-100/50">
                    <div className="flex flex-col gap-6 md:flex-row md:items-center">
                      <div className="flex-1">
                        <label className="mb-2 block text-sm font-black text-indigo-900">เกณฑ์คะแนนสอบที่ผ่าน (%)</label>
                        <p className="mb-4 text-xs font-medium text-indigo-700/70 leading-relaxed">
                          ผู้เรียนต้องทำคะแนนสอบรวมให้ได้อย่างน้อยตามที่กำหนดเพื่อรับเกียรติบัตร
                        </p>
                        <div className="relative max-w-[200px]">
                          <Trophy size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" />
                          <input
                            type="number"
                            min="0"
                            max="100"
                            className="form-input w-full pl-10 border-indigo-200 bg-white focus:border-primary"
                            value={courseForm.certificatePassingScore}
                            onChange={(e) => setCourseForm({ ...courseForm, certificatePassingScore: parseInt(e.target.value || 0, 10) })}
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
                        </div>
                      </div>
                      <div className="hidden h-20 w-px bg-indigo-100 md:block"></div>
                      <div className="flex-1">
                        <p className="text-xs font-black uppercase tracking-wider text-indigo-900/60 mb-2">ข้อมูลเพิ่มเติม</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            <CheckCircle2 size={14} className="text-emerald-500" /> 
                            <span>รูปแบบ: แนวนอน (Landscape)</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            <CheckCircle2 size={14} className="text-emerald-500" /> 
                            <span>ขนาด: A4</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            <CheckCircle2 size={14} className="text-emerald-500" /> 
                            <span>ออกให้โดย: ระบบอัตโนมัติ</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 border-t border-indigo-100 pt-8">
                    <div className="mb-8">
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                          <h5 className="text-sm font-black text-indigo-900">Certificate Signatures</h5>
                          <p className="mt-1 text-xs font-medium text-slate-500">กำหนดผู้ลงนามได้สูงสุด 2 ช่อง เช่น องค์กร + วิทยากร</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase text-slate-500">
                          2 slots
                        </span>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        {signatureSlots.slice(0, 2).map((slot, index) => {
                          return (
                            <div key={slot.id || index} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                              <div className="mb-4 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${slot.type === 'INSTRUCTOR' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {slot.type === 'INSTRUCTOR' ? <GraduationCap size={18} /> : <Building2 size={18} />}
                                  </div>
                                  <div>
                                    <p className="text-sm font-black text-slate-900">{slot.label || `Signature ${index + 1}`}</p>
                                    <p className="text-[11px] font-bold uppercase text-slate-400">{slot.type === 'INSTRUCTOR' ? 'Instructor' : 'Organization'}</p>
                                  </div>
                                </div>
                                <label className="relative inline-flex cursor-pointer items-center">
                                  <input
                                    type="checkbox"
                                    className="peer sr-only"
                                    checked={slot.enabled !== false}
                                    onChange={(event) => updateSignatureSlot(index, { enabled: event.target.checked })}
                                  />
                                  <div className="h-6 w-11 rounded-full bg-slate-200 transition-all after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-5"></div>
                                </label>
                              </div>

                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <button
                                    type="button"
                                    onClick={() => updateSignatureSlot(index, { type: 'ORGANIZATION', instructorPresetId: '' })}
                                    className={`rounded-xl border px-3 py-2 text-xs font-black transition-all ${slot.type === 'ORGANIZATION' ? 'border-emerald-300 bg-white text-emerald-700 shadow-sm' : 'border-slate-200 bg-white/60 text-slate-500 hover:bg-white'}`}
                                  >
                                    Org. Signature
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateSignatureSlot(index, {
                                        type: 'INSTRUCTOR',
                                        instructorPresetId: '',
                                        organizationPresetId: '',
                                        name: '',
                                        title: 'Instructor',
                                        signatureImageUrl: '',
                                        stampImageUrl: '',
                                      });
                                    }}
                                    className={`rounded-xl border px-3 py-2 text-xs font-black transition-all ${slot.type === 'INSTRUCTOR' ? 'border-indigo-300 bg-white text-indigo-700 shadow-sm' : 'border-slate-200 bg-white/60 text-slate-500 hover:bg-white'}`}
                                  >
                                    Instructor
                                  </button>
                                </div>

                                {slot.type === 'ORGANIZATION' && (
                                  <div>
                                    <label className="mb-1.5 block text-xs font-black text-slate-500">เลือกพรีเซ็ตหน่วยงาน</label>
                                    <select
                                      className="form-input w-full bg-white text-sm"
                                      value={slot.organizationPresetId || ''}
                                      onChange={(event) => {
                                        const preset = organizationPresets.find((item) => item.id === event.target.value);
                                        updateSignatureSlot(index, {
                                          organizationPresetId: event.target.value,
                                          name: preset?.name || '',
                                          title: preset?.signatureTitle || '',
                                          signatureImageUrl: preset?.signatureImageUrl || '',
                                          stampImageUrl: preset?.stampImageUrl || '',
                                        });
                                      }}
                                    >
                                      <option value="">-- ไม่ใช้พรีเซ็ต (ระบุเอง) --</option>
                                      {organizationPresets.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {slot.type === 'INSTRUCTOR' && (
                                  <div>
                                    <label className="mb-1.5 block text-xs font-black text-slate-500">เลือกวิทยากร preset</label>
                                    <select
                                      className="form-input w-full bg-white text-sm"
                                      value={slot.instructorPresetId || ''}
                                      onChange={(event) => {
                                        const preset = instructorPresets.find((item) => item.id === event.target.value);
                                        updateSignatureSlot(index, {
                                          instructorPresetId: event.target.value,
                                          name: preset?.name || '',
                                          title: preset?.signatureTitle || preset?.role || 'Instructor',
                                          signatureImageUrl: preset?.signatureImageUrl || '',
                                          stampImageUrl: '',
                                        });
                                      }}
                                    >
                                      <option value="">-- ไม่ใช้ preset (ระบุเอง) --</option>
                                      {instructorPresets.map((preset) => (
                                        <option key={preset.id} value={preset.id}>
                                          {preset.name}{preset.role ? ` - ${preset.role}` : ''}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                <div>
                                  <label className="mb-1.5 block text-xs font-black text-slate-500">ชื่อผู้ลงนาม</label>
                                  <input
                                    type="text"
                                    className="form-input w-full bg-white"
                                    value={slot.name || ''}
                                    onChange={(event) => updateSignatureSlot(index, { name: event.target.value })}
                                    placeholder={slot.type === 'INSTRUCTOR' ? 'เว้นว่างเพื่อใช้ชื่อวิทยากร' : 'เช่น ScaleUp Academy'}
                                  />
                                </div>

                                <div>
                                  <label className="mb-1.5 block text-xs font-black text-slate-500">ตำแหน่ง / คำอธิบาย</label>
                                  <input
                                    type="text"
                                    className="form-input w-full bg-white"
                                    value={slot.title || ''}
                                    onChange={(event) => updateSignatureSlot(index, { title: event.target.value })}
                                    placeholder={slot.type === 'INSTRUCTOR' ? 'Instructor' : 'Organization Signature'}
                                  />
                                </div>

                                <div>
                                  <label className="mb-1.5 block text-xs font-black text-slate-500">ลายเซ็น</label>
                                  <input
                                    ref={(node) => { signatureUploadRefs.current[index] = node; }}
                                    type="file"
                                    accept="image/png,image/webp"
                                    className="hidden"
                                    onChange={(event) => handleSignatureUpload(index, event.target.files?.[0])}
                                  />
                                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7.5rem]">
                                    <input
                                      type="text"
                                      className="form-input min-w-0 bg-white"
                                      value={slot.signatureImageUrl || ''}
                                      onChange={(event) => updateSignatureSlot(index, { signatureImageUrl: event.target.value })}
                                      placeholder="URL หรือ PNG/WebP 1000 x 300"
                                    />
                                    <div className="grid gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setMediaLibrary({
                                          isOpen: true,
                                          allowedTypes: 'image',
                                          onSelect: (file) => updateSignatureSlot(index, { signatureImageUrl: file.fileUrl })
                                        })}
                                        className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-[11px] font-black leading-tight text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                      >
                                        <ImageIcon size={14} className="shrink-0" />
                                        <span>คลังสื่อ</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => signatureUploadRefs.current[index]?.click()}
                                        className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-[11px] font-black leading-tight text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                      >
                                        <Upload size={14} className="shrink-0" />
                                        <span>อัปโหลด</span>
                                      </button>
                                    </div>
                                  </div>
                                  {slot.signatureImageUrl && (
                                    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                                      <SignatureImage src={slot.signatureImageUrl} alt={`${slot.label || 'Signature'} preview`} className="h-14 max-w-full object-contain" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <CertificateTemplateSelector 
                      selectedId={courseForm.certificateTemplateId || 'CLASSIC_001'}
                      onSelect={(id) => setCourseForm({ ...courseForm, certificateTemplateId: id })}
                      signatureSlots={signatureSlots}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      </fieldset>
      <CourseBuilderFooter
        courseStatus={courseForm.status}
        isPersisted={isPersisted}
        lessonCount={lessonCount}
        onClose={onClose}
        readOnly={readOnly}
      />
      <MediaLibraryModal
        isOpen={mediaLibrary.isOpen}
        allowedTypes={mediaLibrary.allowedTypes}
        onClose={() => setMediaLibrary(prev => ({ ...prev, isOpen: false }))}
        onSelect={mediaLibrary.onSelect}
      />
    </form>
  );
};

export default CourseBasicInfoForm;
