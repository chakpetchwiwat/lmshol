import { ENROLLMENT_STATUS_LABELS, SKILL_LABELS } from '../../utils/constants/dashboard';
import { formatThaiDateTime } from '../../utils/dateUtils';

/**
 * Insight Configurations
 * This file contains the column definitions and rendering logic for each 
 * dashboard insight modal to keep Dashboard.jsx clean.
 */

export const getWeeklyInsightConfig = (bucket, selectedDepartmentName, renderUserLink) => ({
  title: `ผู้เริ่มเรียนช่วง ${bucket.label || bucket.date}`,
  subtitle: 'รายละเอียดผู้เรียนที่เริ่มลงเรียนในช่วงเวลานี้',
  summary: [
    { label: 'ช่วงเวลา', value: bucket.label || bucket.date },
    { label: 'ผู้เริ่มเรียน', value: bucket.count || 0 },
    { label: 'ขอบเขต', value: selectedDepartmentName },
  ],
  columns: [
    { key: 'userName', label: 'ผู้เรียน', render: renderUserLink },
    { key: 'department', label: 'กอง' },
    { key: 'courseTitle', label: 'คอร์ส' },
    { key: 'status', label: 'สถานะ', render: (row) => ENROLLMENT_STATUS_LABELS[row.status] || row.status },
    { key: 'score', label: 'คะแนน', render: (row) => row.score ?? '-' },
    { key: 'startedAt', label: 'เริ่มเรียน', render: (row) => formatThaiDateTime(row.startedAt, true) },
  ],
  rows: bucket.details || [],
  emptyMessage: 'ไม่มีผู้เริ่มเรียนในช่วงเวลานี้',
});

export const getTypeInsightConfig = (group, renderUserLink) => ({
  title: group.name,
  subtitle: 'รายชื่อผู้เรียนที่มี enrollment อยู่ใน competency group นี้',
  summary: [
    { label: 'หมวดในกลุ่ม', value: group.value || 0 },
    { label: 'จำนวน enrollment', value: group.enrollmentCount || 0 },
    { label: 'คอร์สในกลุ่ม', value: group.courses?.length || 0 },
  ],
  columns: [
    { key: 'userName', label: 'ผู้เรียน', render: renderUserLink },
    { key: 'department', label: 'กอง' },
    { key: 'courseTitle', label: 'คอร์ส' },
    { key: 'status', label: 'สถานะ', render: (row) => ENROLLMENT_STATUS_LABELS[row.status] || row.status },
    { key: 'score', label: 'คะแนน', render: (row) => row.score ?? '-' },
    { key: 'completedAt', label: 'สำเร็จเมื่อ', render: (row) => row.completedAt ? formatThaiDateTime(row.completedAt, true) : '-' },
  ],
  rows: group.details || [],
  emptyMessage: 'ไม่พบ enrollment ใน competency group นี้',
});

export const getCategoryInsightConfig = (category, selectedDepartmentName, renderUserLink) => ({
  title: `หมวดหมู่: ${category.name}`,
  subtitle: 'ผู้เรียนและคอร์สที่อยู่ภายใต้หมวดหมู่นี้',
  summary: [
    { label: 'จำนวน enrollment', value: category.value || 0 },
    { label: 'กอง', value: selectedDepartmentName },
  ],
  columns: [
    { key: 'userName', label: 'ผู้เรียน', render: renderUserLink },
    { key: 'department', label: 'กอง' },
    { key: 'courseTitle', label: 'คอร์ส' },
    { key: 'status', label: 'สถานะ', render: (row) => ENROLLMENT_STATUS_LABELS[row.status] || row.status },
    { key: 'score', label: 'คะแนน', render: (row) => row.score ?? '-' },
  ],
  rows: category.details || [],
  emptyMessage: 'ไม่พบข้อมูลในหมวดหมู่นี้',
});

export const getCourseInsightConfig = (course, selectedDepartmentName, renderUserLink) => ({
  title: `คอร์ส: ${course.title}`,
  subtitle: 'รายชื่อผู้เรียนที่ลงทะเบียนและผลลัพธ์ของคอร์สนี้',
  summary: [
    { label: 'ผู้ลงทะเบียน', value: course.students || 0 },
    { label: 'กอง', value: selectedDepartmentName },
  ],
  columns: [
    { key: 'userName', label: 'ผู้เรียน', render: renderUserLink },
    { key: 'department', label: 'กอง' },
    { key: 'status', label: 'สถานะ', render: (row) => ENROLLMENT_STATUS_LABELS[row.status] || row.status },
    { key: 'score', label: 'คะแนน', render: (row) => row.score ?? '-' },
    { key: 'startedAt', label: 'เริ่มเรียน', render: (row) => formatThaiDateTime(row.startedAt, true) },
    { key: 'completedAt', label: 'สำเร็จเมื่อ', render: (row) => row.completedAt ? formatThaiDateTime(row.completedAt, true) : '-' },
  ],
  rows: course.details || [],
  emptyMessage: 'ยังไม่มีผู้ลงทะเบียนในคอร์สนี้',
});

export const getSkillGapInsightConfig = (skill, selectedDepartmentName, renderUserLink) => ({
  title: `Skill Gap: ${SKILL_LABELS[skill.type] || skill.type}`,
  subtitle: 'แสดงรายชื่อผู้เรียนและคะแนนสอบตาม competency area ที่เลือก',
  summary: [
    { label: 'คะแนนเฉลี่ย', value: `${Number(skill.average_mastery || 0).toFixed(1)}%` },
    { label: 'จำนวนรายการสอบ', value: skill.details?.length || 0 },
    { label: 'กอง', value: selectedDepartmentName },
  ],
  columns: [
    { key: 'userName', label: 'ผู้เรียน', render: renderUserLink },
    { key: 'department', label: 'กอง' },
    { key: 'courseTitle', label: 'คอร์ส' },
    { key: 'lessonTitle', label: 'แบบทดสอบ' },
    { key: 'score', label: 'คะแนน' },
    { key: 'attemptedAt', label: 'สอบล่าสุด', render: (row) => formatThaiDateTime(row.attemptedAt, true) },
  ],
  rows: skill.details || [],
  emptyMessage: 'ยังไม่มีข้อมูล skill gap ใน competency นี้',
});

export const getDepartmentInsightConfig = (department, periodLabel, renderUserLink) => ({
  title: `Department: ${department.name}`,
  subtitle: 'ผลการเรียนรายบุคคลของผู้เรียนภายในกองนี้',
  summary: [
    { label: 'Completion Rate', value: `${Number(department.completion_rate || 0).toFixed(1)}%` },
    { label: 'จำนวนผู้เรียน', value: department.details?.length || 0 },
    { label: 'ช่วงเวลา', value: periodLabel },
  ],
  columns: [
    { key: 'userName', label: 'ผู้เรียน', render: renderUserLink },
    { key: 'tier', label: 'ตำแหน่ง' },
    { key: 'completedCourses', label: 'สำเร็จแล้ว' },
    { key: 'totalCourses', label: 'ทั้งหมด' },
    { key: 'avgScore', label: 'คะแนนเฉลี่ย', render: (row) => row.avgScore ?? '-' },
  ],
  rows: department.details || [],
  emptyMessage: 'ไม่พบข้อมูลผู้เรียนในกองนี้',
});

export const getRoiInsightConfig = (bucket, selectedDepartmentName, renderUserLink) => ({
  title: `ROI Trend: ${bucket.label || bucket.month}`,
  subtitle: 'รายละเอียดการเรียนสำเร็จและการได้รับคะแนนสะสมในช่วงเวลานี้',
  summary: [
    { label: 'Learning Completions', value: bucket.completions || 0 },
    { label: 'Points Distributed', value: bucket.points || 0 },
    { label: 'จำนวนรายการ', value: bucket.details?.length || 0 },
  ],
  columns: [
    { key: 'kind', label: 'ประเภท', render: (row) => row.kind === 'completion' ? 'สำเร็จ' : 'Points' },
    { key: 'userName', label: 'ผู้เรียน', render: renderUserLink },
    { key: 'department', label: 'กอง' },
    { key: 'courseTitle', label: 'รายการ' },
    { key: 'points', label: 'แต้ม', render: (row) => row.points || 0 },
    { key: 'completedAt', label: 'เวลา', render: (row) => formatThaiDateTime(row.completedAt, true) },
  ],
  rows: bucket.details || [],
  emptyMessage: 'ยังไม่มีข้อมูล ROI ในช่วงเวลานี้',
});

export const getRiskInsightConfig = (rows, selectedDepartmentName, renderUserLink, renderGoalLink, singleRisk = null) => ({
  title: singleRisk ? `Risk: ${singleRisk.userName}` : 'ผู้เรียนที่เสี่ยงไม่บรรลุเป้าหมาย',
  subtitle: 'ผู้เรียนที่ทำคะแนนหรือจำนวนคอร์สไม่ครบตามเป้าหมาย (Goal) ที่ใกล้หมดอายุ',
  summary: [
    { label: 'จำนวนรายการ', value: rows.length },
    { label: 'กอง', value: selectedDepartmentName },
  ],
  columns: [
    { key: 'userName', label: 'ผู้เรียน', render: renderUserLink },
    { key: 'department', label: 'กอง' },
    { key: 'goalTitle', label: 'เป้าหมาย (Goal)', render: renderGoalLink },
    { key: 'gapCount', label: 'ขาดอีก (รายการ)', render: (row) => row.gapCount > 0 ? `${row.gapCount} คอร์ส` : '-' },
    { key: 'deadline', label: 'วันหมดอายุเป้าหมาย', render: (row) => formatThaiDateTime(row.deadline, true) },
    { key: 'isOverdue', label: 'สถานะ', render: (row) => row.isOverdue ? 'เลยกำหนด' : 'ใกล้หมดเวลา' },
  ],
  rows,
  emptyMessage: 'ไม่พบผู้เรียนที่เสี่ยงในช่วงเวลานี้',
});
