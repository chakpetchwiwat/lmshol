import React from 'react';
import { Book, Trophy, Clock, Plus, ImageIcon, Upload, Trash2, FileText, Layers, Users, GraduationCap, Video, Award, CheckCircle2 } from 'lucide-react';
import OutcomeListEditor from './OutcomeListEditor';
import BenefitListEditor from './BenefitListEditor';
import InstructorPresetPicker from './InstructorPresetPicker';
import CustomDateTimePicker from '../common/CustomDateTimePicker';
import CustomSelect from '../common/CustomSelect';
import { getFullUrl, DEFAULT_COURSE_IMAGE } from '../../utils/api';
import CourseBuilderFooter from './course-builder/CourseBuilderFooter';

const CourseBasicInfoForm = ({
  isPersisted,
  lessonCount,
  courseForm,
  setCourseForm,
  categories,
  instructorPresets,
  departments,
  tiers,
  onSaveCourse,
  onImageUpload,
  uploading,
  imageInputRef,
  onClose,
  readOnly
}) => {
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
              <button type="button" onClick={() => setCourseForm({ ...courseForm, image: '' })} className="btn btn-outline btn-sm border-danger/30 text-xs text-danger">
                <Trash2 size={14} /> ลบ
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploading}
            className="flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 text-gray-400 transition-colors hover:border-primary hover:text-primary"
          >
            {uploading ? (
              <>
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary"></div>
                <span className="text-xs font-bold">กำลังอัปโหลด...</span>
              </>
            ) : (
              <>
                <ImageIcon size={32} />
                <span className="text-xs font-bold">คลิกเพื่ออัปโหลดรูปหน้าปก</span>
                <span className="text-[10px]">รองรับ JPG, PNG, WebP</span>
              </>
            )}
          </button>
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
            กำหนดได้ว่าแผนกไหนและระดับผู้ใช้งานไหนจะเห็นคอร์สนี้ ถ้าไม่จำกัด ระบบจะแสดงคอร์สให้ทุกคน
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
                  visibleDepartmentIds: event.target.checked ? [] : courseForm.visibleDepartmentIds,
                  visibleTierIds: event.target.checked ? [] : courseForm.visibleTierIds,
                })
              }
              className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <span>
              <span className="block text-sm font-bold text-slate-900">เปิดให้ทุกคนเห็นคอร์สนี้</span>
              <span className="block text-xs text-slate-500">
                ถ้าปิดตัวเลือกนี้ ระบบจะใช้แผนกและระดับผู้ใช้งานด้านล่างในการควบคุมการมองเห็น
              </span>
            </span>
          </label>
        </div>

        {!courseForm.visibleToAll && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3">
                <h5 className="text-sm font-black text-slate-900">แผนกที่เห็นคอร์สได้</h5>
                <p className="text-xs text-slate-500">ถ้าไม่เลือกแผนกเลย ระบบจะใช้เฉพาะระดับผู้ใช้งานในการกำหนดสิทธิ์</p>
              </div>
              <div className="space-y-2">
                {departments.length === 0 ? (
                  <p className="text-sm text-slate-500">ยังไม่มีแผนกในระบบ กรุณาไปเพิ่มจากหน้าผู้ใช้งานก่อน</p>
                ) : (
                  departments.map((department) => (
                    <label key={department.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={courseForm.visibleDepartmentIds.includes(department.id)}
                        onChange={(event) => {
                          const nextIds = event.target.checked
                            ? [...courseForm.visibleDepartmentIds, department.id]
                            : courseForm.visibleDepartmentIds.filter((id) => id !== department.id);

                          setCourseForm({
                            ...courseForm,
                            visibleDepartmentIds: nextIds,
                          });
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      {department.name}
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3">
                <h5 className="text-sm font-black text-slate-900">ระดับผู้ใช้งานที่เห็นคอร์สได้</h5>
                <p className="text-xs text-slate-500">ถ้าเลือกทั้งแผนกและระดับ ผู้ใช้ต้องผ่านทั้งสองเงื่อนไข</p>
              </div>
              <div className="space-y-2">
                {tiers.length === 0 ? (
                  <p className="text-sm text-slate-500">ยังไม่มีระดับผู้ใช้งานในระบบ กรุณาไปเพิ่มจากหน้าผู้ใช้งานก่อน</p>
                ) : (
                  tiers.map((tier) => (
                    <label key={tier.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={courseForm.visibleTierIds.includes(tier.id)}
                        onChange={(event) => {
                          const nextIds = event.target.checked
                            ? [...courseForm.visibleTierIds, tier.id]
                            : courseForm.visibleTierIds.filter((id) => id !== tier.id);

                          setCourseForm({
                            ...courseForm,
                            visibleTierIds: nextIds,
                          });
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      {tier.name}
                    </label>
                  ))
                )}
              </div>
            </div>
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
    </form>
  );
};

export default CourseBasicInfoForm;
