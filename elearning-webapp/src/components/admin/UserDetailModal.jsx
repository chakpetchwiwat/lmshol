import React from 'react';
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coins,
  FileDown,
  FileText,
  Gift,
  GraduationCap,
  ExternalLink,
  Paperclip,
  Printer,
  TrendingDown,
  TrendingUp,
  User2,
  X,
} from 'lucide-react';
import { formatThaiDateTime } from '../../utils/dateUtils';
import ModalPortal from '../common/ModalPortal';
import CustomSelect from '../common/CustomSelect';
import { useToast } from '../../context/useToast';
import { FILTER_VALUES } from '../../utils/constants/filters';
import { ENROLLMENT_STATUS } from '../../utils/constants/statuses';
import { openPrintReport } from '../../utils/printUtils';
import { adminAPI, getFullUrl } from '../../utils/api';

const UserDetailModalContent = ({ loading, detail, onClose, cohortRoles = [] }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = React.useState('learning');
  const [filterMonth, setFilterMonth] = React.useState(FILTER_VALUES.ALL);
  const [filterYear, setFilterYear] = React.useState(FILTER_VALUES.ALL);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, index) => currentYear - index);
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];

  const enrollments = detail?.enrollments || [];
  const pointsHistory = detail?.pointsHistory || [];
  const educationHistory = Array.isArray(detail?.educationHistory) ? detail.educationHistory : [];
  const profileFiles = Array.isArray(detail?.profileFiles) ? detail.profileFiles : [];
  const profileImageUrl = detail?.profileImageUrl ? getFullUrl(detail.profileImageUrl) : '';
  const cohortRoleLabelMap = React.useMemo(
    () => Object.fromEntries(cohortRoles.map((role) => [role.key, role.name || role.key])),
    [cohortRoles]
  );

  const filteredEnrollments = enrollments.filter((enrollment) => {
    const date = new Date(enrollment.startedAt);
    const monthMatch = filterMonth === FILTER_VALUES.ALL || date.getMonth() === parseInt(filterMonth, 10);
    const yearMatch = filterYear === FILTER_VALUES.ALL || date.getFullYear() === parseInt(filterYear, 10);
    return monthMatch && yearMatch;
  });

  const filteredPointsHistory = pointsHistory.filter((entry) => {
    const date = new Date(entry.createdAt);
    const monthMatch = filterMonth === FILTER_VALUES.ALL || date.getMonth() === parseInt(filterMonth, 10);
    const yearMatch = filterYear === FILTER_VALUES.ALL || date.getFullYear() === parseInt(filterYear, 10);
    return monthMatch && yearMatch;
  });

  const getEnrollmentCompletedAtLabel = (enrollment) => (
    enrollment?.status === ENROLLMENT_STATUS.COMPLETED && enrollment?.completedAt
      ? formatThaiDateTime(enrollment.completedAt)
      : '-'
  );

  const handleOpenProfileFile = async (file) => {
    try {
      if (file?.fileUrl) {
        window.open(getFullUrl(file.fileUrl), '_blank', 'noopener,noreferrer');
        return;
      }

      if (!file?.fileKey) {
        toast.warning('ไม่พบลิงก์ไฟล์นี้');
        return;
      }

      const response = await adminAPI.getProfileFileDownloadUrl(file.fileKey);
      const url = response?.data?.url || response?.url;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }

      toast.warning('ไม่พบลิงก์ไฟล์นี้');
    } catch (error) {
      console.error('Open profile file error', error);
      toast.error('เปิดไฟล์ไม่สำเร็จ');
    }
  };

  const handleExport = () => {
    const data = activeTab === 'learning' ? filteredEnrollments : filteredPointsHistory;
    if (data.length === 0) {
      toast.info('ไม่มีข้อมูลสำหรับการส่งออก');
      return;
    }

    let csvContent = '\uFEFF';
    csvContent += `ประวัติผู้ใช้งานรายบุคคล (${activeTab === 'learning' ? 'ประวัติการเรียน' : 'ประวัติ Point'})\n`;
    csvContent += `พนักงาน,${detail.name}\n`;
    csvContent += `อีเมล,${detail.email}\n`;
    csvContent += `แผนก,${detail.department || '-'}\n`;
    csvContent += `ระดับ,${detail.tier?.name || detail.tier || '-'}\n`;
    csvContent += `แต้มคงเหลือ,${detail.pointsBalance || 0}\n`;
    csvContent += `วันที่ส่งออก,${formatThaiDateTime(new Date())}\n\n`;

    if (activeTab === 'learning') {
      csvContent += 'คอร์ส,หมวดหมู่,เริ่มเรียน,สำเร็จเมื่อ,ความคืบหน้า,สถานะ\n';
      data.forEach((item) => {
        const started = item.startedAt ? formatThaiDateTime(item.startedAt) : '-';
        const completed = getEnrollmentCompletedAtLabel(item);
        const status = item.status === ENROLLMENT_STATUS.COMPLETED ? 'เรียนจบแล้ว' : 'กำลังเรียน';
        csvContent += `"${item.course.title}","${item.course.categoryName || '-'}","${started}","${completed}","${Math.round(item.progressPercent || 0)}%","${status}"\n`;
      });
    } else {
      csvContent += 'ประเภท,ที่มา/การใช้งาน,หมายเหตุ,Point,เวลา\n';
      data.forEach((item) => {
        const time = item.createdAt ? formatThaiDateTime(item.createdAt) : '-';
        const type = item.points >= 0 ? 'ได้รับแต้ม' : 'ใช้แต้ม';
        csvContent += `"${type}","${item.sourceLabel}","${item.note || '-'}","${item.points}","${time}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const fileName = `Export_${activeTab === 'learning' ? 'Learning' : 'Points'}_${detail.name}_${formatThaiDateTime(new Date()).replace(/\//g, '-')}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const mainTitle = activeTab === 'learning' ? 'ประวัติการเรียน' : 'ประวัติ Point';
    const data = activeTab === 'learning' ? filteredEnrollments : filteredPointsHistory;

    const sections = [
      {
        title: 'ประวัติการศึกษา',
        columns: ['สถาบัน', 'วุฒิ / ระดับ', 'คณะ', 'สาขา', 'ปีที่จบ'],
        rows: educationHistory.map((item) => [
          item.institution || '-',
          item.degree || '-',
          item.faculty || '-',
          item.major || '-',
          item.graduationYear || '-'
        ]),
        emptyMessage: 'ยังไม่มีประวัติการศึกษา'
      },
      {
        title: 'ข้อมูลอื่นๆ จากโปรไฟล์',
        columns: ['ชื่อไฟล์', 'ประเภทไฟล์', 'วันที่อัปโหลด'],
        rows: profileFiles.map((file) => [
          file.title || file.fileName || '-',
          file.fileMimeType || '-',
          file.uploadedAt ? formatThaiDateTime(file.uploadedAt) : '-'
        ]),
        emptyMessage: 'ยังไม่มีไฟล์ข้อมูลอื่นๆ'
      },
      // Always include certificates
      {
        title: 'เกียรติบัตรจากระบบ',
        columns: ['หลักสูตร', 'เลขที่ใบเซอร์', 'วันที่ออก'],
        rows: (detail?.systemCertificates || []).map(cert => [
          cert.courseTitle || '-',
          cert.certificateNo || '-',
          cert.issuedAt ? formatThaiDateTime(cert.issuedAt) : '-'
        ]),
        emptyMessage: 'ไม่มีประวัติเกียรติบัตรจากระบบ'
      },
      {
        title: 'เกียรติบัตรที่เพิ่มเอง',
        columns: ['หัวข้อ', 'ผู้ออก', 'วันที่ได้รับ'],
        rows: (detail?.externalCertificates || []).map(cert => [
          cert.title || '-',
          cert.issuer || '-',
          cert.issueDate ? formatThaiDateTime(cert.issueDate) : '-'
        ]),
        emptyMessage: 'ไม่มีประวัติเกียรติบัตรที่เพิ่มเอง'
      },
      {
        title: mainTitle,
        columns: activeTab === 'learning'
          ? ['คอร์ส', 'หมวดหมู่', 'เริ่มเรียน', 'สำเร็จเมื่อ', 'ความคืบหน้า', 'สถานะ']
          : ['ประเภท', 'ที่มา / การใช้งาน', 'หมายเหตุ', 'Point', 'เวลา'],
        rows: activeTab === 'learning'
          ? data.map((item) => ([
              item.course?.title || '-',
              item.course?.categoryName || '-',
              item.startedAt ? formatThaiDateTime(item.startedAt) : '-',
              getEnrollmentCompletedAtLabel(item),
              `${Math.round(item.progressPercent || 0)}%`,
              item.status === ENROLLMENT_STATUS.COMPLETED ? 'เรียนจบแล้ว' : 'กำลังเรียน',
            ]))
          : data.map((item) => ([
              item.points >= 0 ? 'ได้รับแต้ม' : 'ใช้แต้ม',
              item.sourceLabel || '-',
              item.note || (item.points >= 0 ? 'ได้รับ Point' : 'ใช้ Point'),
              `${item.points}`,
              item.createdAt ? formatThaiDateTime(item.createdAt) : '-',
            ])),
        emptyMessage: activeTab === 'learning'
          ? 'ไม่พบประวัติการลงเรียนตามเงื่อนไขที่เลือก'
          : 'ไม่พบประวัติ Point ตามเงื่อนไขที่เลือก',
      }
    ];

    openPrintReport({
      fileName: `user-history-${detail?.name || 'report'}-${activeTab}`,
      reportTitle: 'ประวัติผู้ใช้งานรายบุคคล',
      subtitle: `${detail?.name || '-'} · ${mainTitle}`,
      summary: [
        { label: 'พนักงาน', value: detail?.name || '-' },
        { label: 'อีเมล', value: detail?.email || '-' },
        { label: 'แผนก', value: detail?.department || '-' },
        { label: 'ระดับ', value: detail?.tier?.name || detail?.tier || '-' },
        { label: '\u0e27\u0e31\u0e19\u0e40\u0e23\u0e34\u0e48\u0e21\u0e07\u0e32\u0e19', value: detail?.employmentDate ? formatThaiDateTime(detail.employmentDate) : '-' },
        { label: 'Point Balance', value: `${detail?.pointsBalance?.toLocaleString?.() || 0}` },
      ],
      filters: [
        { label: 'มุมมอง', value: mainTitle },
        { label: 'เดือน', value: filterMonth === FILTER_VALUES.ALL ? 'ทุกเดือน' : months[parseInt(filterMonth, 10)] || 'ทุกเดือน' },
        { label: 'ปี', value: filterYear === FILTER_VALUES.ALL ? 'ทุกปี' : String(parseInt(filterYear, 10) + 543) },
      ],
      profile: {
        title: 'ข้อมูลโปรไฟล์ผู้ใช้',
        name: detail?.name || '-',
        subtitle: detail?.email || '',
        imageUrl: profileImageUrl,
        items: [
          { label: 'แผนก', value: detail?.department || '-' },
          { label: 'ระดับ', value: detail?.tier?.name || detail?.tier || '-' },
          { label: 'ประวัติการศึกษา', value: `${educationHistory.length} รายการ` },
          { label: 'ไฟล์ข้อมูลอื่นๆ', value: `${profileFiles.length} ไฟล์` },
        ],
      },
      sections
    });
  };

  return (
    <ModalPortal isOpen>
      <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
        <div className="card flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden border border-slate-100 bg-white shadow-2xl">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5 rounded-t-[inherit]">
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-black text-slate-900 truncate">ประวัติผู้ใช้งานรายบุคคล</h3>
              <p className="mt-1 text-sm text-slate-500 truncate">ดูทั้งประวัติการเรียนและประวัติการได้ใช้แต้มในหน้าต่างเดียว</p>
            </div>
            
            <div className="flex items-center gap-3">
              {detail && !loading && (
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-black text-white transition-all hover:bg-primary-dark active:scale-95 shadow-lg shadow-primary/20"
                >
                  <Printer size={16} />
                  <span className="hidden sm:inline">Print to PDF</span>
                </button>
              )}
              
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="ปิดหน้าต่างประวัติผู้ใช้งาน"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {loading ? (
              <div className="py-20 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : !detail ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
                ไม่พบข้อมูลผู้ใช้งาน
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
                    <div className="mb-3 inline-flex rounded-2xl bg-primary/10 p-3 text-primary">
                      <User2 size={18} />
                    </div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">พนักงาน</div>
                    <div className="mt-2 text-lg font-black text-slate-900">{detail.name}</div>
                    <div className="mt-1 text-sm text-slate-500">{detail.email}</div>
                  </div>

                  <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
                    <div className="mb-3 inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-600">
                      <CalendarDays size={18} />
                    </div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">เริ่มงาน</div>
                    <div className="mt-2 text-lg font-black text-slate-900">{formatThaiDateTime(detail.employmentDate)}</div>
                    <div className="mt-1 text-sm text-slate-500">วันที่เริ่มเป็นพนักงานในระบบ</div>
                  </div>

                  <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
                    <div className="mb-3 inline-flex rounded-2xl bg-amber-100 p-3 text-amber-600">
                      <Clock3 size={18} />
                    </div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">แผนก / ระดับ</div>
                    <div className="mt-2 text-lg font-black text-slate-900">{detail.department || '-'}</div>
                    <div className="mt-1 text-sm text-slate-500">{detail.tier?.name || detail.tier || 'ยังไม่ได้กำหนดระดับ'}</div>
                  </div>

                  <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
                    <div className="mb-3 inline-flex rounded-2xl bg-sky-100 p-3 text-sky-600">
                      <Coins size={18} />
                    </div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Point Balance</div>
                    <div className="mt-2 text-lg font-black text-slate-900">{detail.pointsBalance?.toLocaleString?.() || 0}</div>
                    <div className="mt-1 text-sm text-slate-500">แต้มคงเหลือล่าสุดของผู้ใช้งาน</div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                  <div className="grid gap-0 lg:grid-cols-[14rem_1fr]">
                    <div className="flex flex-col items-center justify-center border-b border-slate-100 bg-slate-50/70 px-5 py-6 lg:border-b-0 lg:border-r">
                      <div className="h-32 w-32 overflow-hidden rounded-3xl border border-white bg-white shadow-lg shadow-slate-200/70">
                        {profileImageUrl ? (
                          <img src={profileImageUrl} alt={detail.name || 'Profile'} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-indigo-50 text-slate-400">
                            <User2 size={48} strokeWidth={1.6} />
                          </div>
                        )}
                      </div>
                      <p className="mt-4 text-center text-sm font-black text-slate-900">{detail.name}</p>
                      <p className="mt-1 max-w-[11rem] truncate text-center text-xs font-bold text-slate-500">{detail.email}</p>
                      {Array.isArray(detail.roles) && detail.roles.length > 0 && (
                        <div className="mt-3 flex flex-wrap justify-center gap-1">
                          {detail.roles.map((r) => {
                            const label = cohortRoleLabelMap[r] || r;
                            return (
                              <span key={r} className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-800">
                                {label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      
                      <div className="mt-5 w-full space-y-2 border-t border-slate-200/60 pt-4 text-xs">
                        {detail.department && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">แผนก:</span>
                            <span className="font-semibold text-slate-700">{detail.department}</span>
                          </div>
                        )}
                        {detail.subdivision && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">กลุ่มงาน:</span>
                            <span className="font-semibold text-slate-700">{detail.subdivision}</span>
                          </div>
                        )}
                        {detail.position && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">ตำแหน่ง:</span>
                            <span className="font-semibold text-slate-700">{detail.position}</span>
                          </div>
                        )}
                        {detail.positionLevel && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">ระดับ:</span>
                            <span className="font-semibold text-slate-700">{detail.positionLevel}</span>
                          </div>
                        )}
                        {detail.positionType && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">ประเภท:</span>
                            <span className="font-semibold text-slate-700">{detail.positionType}</span>
                          </div>
                        )}
                        {detail.supervisorName && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">หัวหน้างาน:</span>
                            <span className="font-semibold text-slate-700">{detail.supervisorName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="text-base font-black text-slate-900">ข้อมูลโปรไฟล์จากผู้ใช้</h4>
                          <p className="mt-1 text-xs font-bold text-slate-500">แสดงข้อมูลเดียวกับหน้า Profile ที่ผู้ใช้แก้ไขล่าสุด</p>
                        </div>
                        <div className="rounded-2xl bg-indigo-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-primary">
                          Profile Sync
                        </div>
                      </div>

                      <div className="grid gap-4 xl:grid-cols-2">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                          <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                            <GraduationCap size={15} className="text-primary" />
                            Education
                          </div>
                          {!detail.educationHistory || Object.keys(detail.educationHistory).length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-xs font-bold text-slate-400">
                              ยังไม่มีประวัติการศึกษา
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {/* Display array format if exists */}
                              {Array.isArray(detail.educationHistory) && detail.educationHistory.map((item) => (
                                <div key={item.id} className="rounded-2xl border border-slate-100 bg-white p-3">
                                  <p className="text-sm font-black text-slate-900">{item.institution || '-'}</p>
                                  <p className="mt-1 text-xs font-bold text-slate-600">{item.degree || '-'} · {item.faculty || '-'}</p>
                                  <p className="mt-1 text-xs font-bold text-slate-400">{item.major || '-'} · {item.graduationYear || '-'}</p>
                                </div>
                              ))}
                              
                              {/* Display object format from Excel import */}
                              {!Array.isArray(detail.educationHistory) && (
                                <div className="rounded-2xl border border-slate-100 bg-white p-3">
                                  <div className="mb-3 border-b border-slate-100 pb-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">การศึกษา</p>
                                    <p className="mt-1 text-sm font-black text-slate-900">{detail.educationHistory.institution || '-'}</p>
                                    <p className="mt-0.5 text-xs font-bold text-slate-600">{detail.educationHistory.degreeName || '-'} · {detail.educationHistory.fieldOfStudy || '-'}</p>
                                    <p className="mt-0.5 text-xs text-slate-500">ระดับ: {detail.educationHistory.level || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">การศึกษาสูงสุด</p>
                                    <p className="mt-1 text-sm font-black text-slate-900">{detail.educationHistory.highestInstitution || '-'}</p>
                                    <p className="mt-0.5 text-xs font-bold text-slate-600">{detail.educationHistory.highestDegreeName || '-'} · {detail.educationHistory.highestFieldOfStudy || '-'}</p>
                                    <p className="mt-0.5 text-xs text-slate-500">ระดับ: {detail.educationHistory.highestLevel || '-'}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                          <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                            <Paperclip size={15} className="text-emerald-600" />
                            Other Information
                          </div>
                          {!detail.profileFiles || Object.keys(detail.profileFiles).length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-xs font-bold text-slate-400">
                              ยังไม่มีไฟล์ข้อมูลอื่นๆ
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {/* Display object format from Excel import */}
                              {!Array.isArray(detail.profileFiles) && detail.profileFiles.cv && (
                                <button
                                  type="button"
                                  onClick={() => window.open(detail.profileFiles.cv, '_blank')}
                                  className="group flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-left transition-all hover:border-emerald-200 hover:shadow-md"
                                >
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                    <FileText size={18} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-black text-slate-900">CV (Curriculum Vitae)</p>
                                    <p className="mt-1 truncate text-xs font-bold text-slate-400">ไฟล์ประวัติการทำงาน</p>
                                  </div>
                                  <ExternalLink size={14} className="shrink-0 text-slate-300 transition-colors group-hover:text-emerald-600" />
                                </button>
                              )}
                              
                              {!Array.isArray(detail.profileFiles) && detail.profileFiles.jobDescription && (
                                <button
                                  type="button"
                                  onClick={() => window.open(detail.profileFiles.jobDescription, '_blank')}
                                  className="group flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-left transition-all hover:border-emerald-200 hover:shadow-md"
                                >
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                    <FileText size={18} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-black text-slate-900">Job Description</p>
                                    <p className="mt-1 truncate text-xs font-bold text-slate-400">ไฟล์คำบรรยายลักษณะงาน</p>
                                  </div>
                                  <ExternalLink size={14} className="shrink-0 text-slate-300 transition-colors group-hover:text-indigo-600" />
                                </button>
                              )}

                              {/* Display array format if exists */}
                              {Array.isArray(detail.profileFiles) && detail.profileFiles.map((file) => (
                                <button
                                  key={file.id}
                                  type="button"
                                  onClick={() => handleOpenProfileFile(file)}
                                  className="group flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-left transition-all hover:border-emerald-200 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                                >
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                    <FileText size={18} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-black text-slate-900">{file.title || file.fileName || '-'}</p>
                                    <p className="mt-1 truncate text-xs font-bold text-slate-400">{file.fileName || file.fileMimeType || '-'}</p>
                                  </div>
                                  <ExternalLink size={14} className="shrink-0 text-slate-300 transition-colors group-hover:text-emerald-600" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Certificates Section */}
                <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h4 className="text-base font-black text-slate-900">ประวัติการอบรม</h4>
                      <p className="mt-0.5 text-xs font-bold text-slate-500">รวบรวมทั้งประวัติการอบรมในระบบและนอกระบบ</p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 px-3 py-1.5 text-[10px] font-black text-amber-600 uppercase tracking-wider border border-amber-100">
                      Total { (detail.externalCertificates?.length || 0) + (detail.systemCertificates?.length || 0) } Certs
                    </div>
                  </div>

                  <div className="space-y-6 pt-2">
                    {/* External Certificates */}
                    <div>
                      <h5 className="mb-3 flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                        <ExternalLink size={14} className="text-primary" />
                        ประวัติการอบรมนอกระบบ
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(!detail.externalCertificates || detail.externalCertificates.length === 0) ? (
                          <div className="col-span-2 rounded-2xl border border-dashed border-slate-200 py-6 text-center text-xs font-bold text-slate-400">
                            ยังไม่มีประวัติการอบรมนอกระบบ
                          </div>
                        ) : (
                          detail.externalCertificates.map((cert) => (
                            <div 
                              key={cert.id} 
                              className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:bg-white hover:border-primary/20 hover:shadow-md cursor-pointer"
                              onClick={() => cert.fileUrl && window.open(cert.fileUrl, '_blank')}
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary border border-slate-100 shadow-sm group-hover:bg-primary group-hover:text-white transition-colors">
                                  <ExternalLink size={18} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-slate-900 line-clamp-1">{cert.title}</p>
                                  <p className="text-[10px] font-bold text-slate-500">{cert.issuer} · {cert.issueDate ? formatThaiDateTime(cert.issueDate) : 'ไม่ระบุวันที่'}</p>
                                </div>
                              </div>
                              <div className="text-slate-300 group-hover:text-primary transition-colors">
                                <ExternalLink size={14} />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* System Certificates */}
                    <div>
                      <h5 className="mb-3 flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                        <Award size={14} className="text-emerald-500" />
                        ประวัติการอบรมในระบบ
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(!detail.systemCertificates || detail.systemCertificates.length === 0) ? (
                          <div className="col-span-2 rounded-2xl border border-dashed border-slate-200 py-6 text-center text-xs font-bold text-slate-400">
                            ยังไม่มีประวัติการอบรมจากคอร์สเรียน
                          </div>
                        ) : (
                          detail.systemCertificates.map((cert) => (
                            <div 
                              key={cert.id} 
                              className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-emerald-50/30 p-4 transition-all hover:bg-white hover:border-emerald-200 hover:shadow-md cursor-pointer"
                              onClick={() => cert.pdfUrl && window.open(cert.pdfUrl, '_blank')}
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                  <Award size={18} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-slate-900 line-clamp-1">{cert.courseTitle}</p>
                                  <p className="text-[10px] font-bold text-emerald-600/70">{cert.certificateNo} · {cert.issuedAt ? formatThaiDateTime(cert.issuedAt) : '-'}</p>
                                </div>
                              </div>
                              <div className="text-emerald-300 group-hover:text-emerald-500 transition-colors">
                                <ExternalLink size={14} />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h4 className="text-base font-black text-slate-900">ข้อมูลย้อนหลัง</h4>
                        <p className="mt-1 text-sm text-slate-500">สลับดูประวัติการเรียนหรือประวัติ Point ได้ตามต้องการ</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <CustomSelect
                            className="w-44"
                            size="sm"
                            value={filterMonth}
                            onChange={(event) => setFilterMonth(event.target.value)}
                            options={[
                              { value: FILTER_VALUES.ALL, label: 'ทุกเดือน' },
                              ...months.map((month, index) => ({ value: index.toString(), label: month })),
                            ]}
                          />
                          <CustomSelect
                            className="w-36"
                            size="sm"
                            value={filterYear}
                            onChange={(event) => setFilterYear(event.target.value)}
                            options={[
                              { value: FILTER_VALUES.ALL, label: 'ทุกปี' },
                              ...years.map((year) => ({ value: year.toString(), label: (year + 543).toString() })),
                            ]}
                          />
                        </div>

                        <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                          <button
                            type="button"
                            onClick={() => setActiveTab('learning')}
                            className={`rounded-2xl px-4 py-2 text-sm font-bold transition-colors ${activeTab === 'learning' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
                          >
                            ประวัติการเรียน
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('points')}
                            className={`rounded-2xl px-4 py-2 text-sm font-bold transition-colors ${activeTab === 'points' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
                          >
                            ประวัติ Point
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleExport}
                          className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-600 transition-all hover:bg-emerald-100 active:scale-95"
                        >
                          <FileDown size={18} />
                          <span>Export Excel</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {activeTab === 'learning' ? (
                    filteredEnrollments.length === 0 ? (
                      <div className="px-5 py-12 text-center text-sm text-slate-500">ไม่พบประวัติการลงเรียนตามเงื่อนไขที่เลือก</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] border-collapse text-left">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50 text-sm text-slate-500">
                              <th className="px-5 py-3 font-semibold">คอร์ส</th>
                              <th className="px-5 py-3 font-semibold">หมวดหมู่</th>
                              <th className="px-5 py-3 font-semibold">เริ่มเรียน</th>
                              <th className="px-5 py-3 font-semibold">สำเร็จเมื่อ</th>
                              <th className="px-5 py-3 font-semibold">ความคืบหน้า</th>
                              <th className="px-5 py-3 font-semibold">สถานะ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredEnrollments.map((enrollment) => (
                              <tr key={enrollment.id} className="border-b border-slate-100 last:border-b-0">
                                <td className="px-5 py-4">
                                  <div className="font-bold text-slate-900">{enrollment.course.title}</div>
                                  <div className="mt-1 text-xs text-slate-400">แต้มคอร์ส {enrollment.course.points || 0}</div>
                                </td>
                                <td className="px-5 py-4 text-sm text-slate-600">{enrollment.course.categoryName || '-'}</td>
                                <td className="px-5 py-4 text-sm text-slate-600">{formatThaiDateTime(enrollment.startedAt)}</td>
                                <td className="px-5 py-4 text-sm text-slate-600">{getEnrollmentCompletedAtLabel(enrollment)}</td>
                                <td className="px-5 py-4 text-sm font-semibold text-slate-700">{Math.round(enrollment.progressPercent || 0)}%</td>
                                <td className="px-5 py-4">
                                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                                    enrollment.status === ENROLLMENT_STATUS.COMPLETED
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {enrollment.status === ENROLLMENT_STATUS.COMPLETED ? 'เรียนจบแล้ว' : 'กำลังเรียน'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : filteredPointsHistory.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-slate-500">ไม่พบประวัติ Point ตามเงื่อนไขที่เลือก</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] border-collapse text-left">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50 text-sm text-slate-500">
                            <th className="px-5 py-3 font-semibold">ประเภท</th>
                            <th className="px-5 py-3 font-semibold">ที่มา / การใช้งาน</th>
                            <th className="px-5 py-3 font-semibold">หมายเหตุ</th>
                            <th className="px-5 py-3 text-right font-semibold">Point</th>
                            <th className="px-5 py-3 font-semibold">เวลา</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPointsHistory.map((entry) => (
                            <tr key={entry.id} className="border-b border-slate-100 last:border-b-0">
                              <td className="px-5 py-4">
                                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
                                  entry.points >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                }`}>
                                  {entry.points >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                  {entry.points >= 0 ? 'ได้รับแต้ม' : 'ใช้แต้ม'}
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <div className="font-bold text-slate-900">{entry.sourceLabel}</div>
                                <div className="mt-1 text-xs text-slate-400">{entry.sourceType}</div>
                              </td>
                              <td className="px-5 py-4 text-sm text-slate-600">
                                {entry.note || (entry.points >= 0 ? 'ได้รับ Point' : 'ใช้ Point')}
                              </td>
                              <td className="px-5 py-4 text-right">
                                <span className={`text-sm font-black ${entry.points >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {entry.points > 0 ? `+${entry.points}` : entry.points}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-sm text-slate-600">{formatThaiDateTime(entry.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
                    <div className="mb-2 flex items-center gap-2 text-slate-400">
                      <CheckCircle2 size={16} />
                      <span className="text-xs font-bold uppercase tracking-[0.18em]">สำเร็จเมื่อ</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900">
                      {enrollments.filter((item) => item.status === ENROLLMENT_STATUS.COMPLETED).length}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
                    <div className="mb-2 flex items-center gap-2 text-slate-400">
                      <TrendingUp size={16} />
                      <span className="text-xs font-bold uppercase tracking-[0.18em]">ได้รับ Point</span>
                    </div>
                    <div className="text-2xl font-black text-emerald-600">
                      {pointsHistory.filter((item) => item.points > 0).reduce((sum, item) => sum + item.points, 0)}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
                    <div className="mb-2 flex items-center gap-2 text-slate-400">
                      <Gift size={16} />
                      <span className="text-xs font-bold uppercase tracking-[0.18em]">ใช้ Point</span>
                    </div>
                    <div className="text-2xl font-black text-rose-600">
                      {Math.abs(pointsHistory.filter((item) => item.points < 0).reduce((sum, item) => sum + item.points, 0))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

const UserDetailModal = ({ isOpen, loading, detail, onClose, cohortRoles = [] }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <UserDetailModalContent
      key={detail?.id || 'user-detail'}
      loading={loading}
      detail={detail}
      onClose={onClose}
      cohortRoles={cohortRoles}
    />
  );
};

export default UserDetailModal;
