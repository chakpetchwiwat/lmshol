import { FILTER_VALUES } from './filters';
import { REDEEM_STATUS } from './statuses';

/**
 * Dashboard Constants
 * Centralized labels and options for the admin dashboard.
 */

export const MONTH_OPTIONS = [
  { value: FILTER_VALUES.ALL, label: 'ทุกเดือน' },
  { value: '1', label: 'มกราคม' },
  { value: '2', label: 'กุมภาพันธ์' },
  { value: '3', label: 'มีนาคม' },
  { value: '4', label: 'เมษายน' },
  { value: '5', label: 'พฤษภาคม' },
  { value: '6', label: 'มิถุนายน' },
  { value: '7', label: 'กรกฎาคม' },
  { value: '8', label: 'สิงหาคม' },
  { value: '9', label: 'กันยายน' },
  { value: '10', label: 'ตุลาคม' },
  { value: '11', label: 'พฤศจิกายน' },
  { value: '12', label: 'ธันวาคม' },
];

export const SKILL_LABELS = {
  STRAT_BUSINESS: 'Business Acumen / Corporate Knowledge',
  STRAT_CORE: 'Core / Soft Skills',
  STRAT_FUNCTIONAL: 'Functional Skills',
  STRAT_LEADERSHIP: 'Leadership Skills',
  STRAT_COMPLIANCE: 'Compliance',
  STRAT_DIGITAL: 'Digital / Future Skills',
};

export const ENROLLMENT_STATUS_LABELS = {
  COMPLETED: 'สำเร็จ',
  IN_PROGRESS: 'กำลังเรียน',
  NOT_STARTED: 'ยังไม่เริ่ม',
};

export const REDEEM_STATUS_LABELS = {
  [REDEEM_STATUS.PENDING]: 'รอดำเนินการ',
  [REDEEM_STATUS.APPROVED]: 'อนุมัติแล้ว',
  [REDEEM_STATUS.REJECTED]: 'ปฏิเสธ',
  [REDEEM_STATUS.FULFILLED]: 'จัดส่งแล้ว',
};

export const DEFAULT_YEAR_WINDOW = 5;
