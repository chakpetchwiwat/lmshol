import React from 'react';
import { Check, Clock, FileDown, X } from 'lucide-react';
import { adminAPI } from '../../utils/api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminTable from '../../components/admin/AdminTable';
import CustomSelect from '../../components/common/CustomSelect';
import { useToast } from '../../context/useToast';
import useConfirm from '../../hooks/useConfirm';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { FILTER_VALUES } from '../../utils/constants/filters';
import { REDEEM_STATUS } from '../../utils/constants/statuses';
import { formatThaiDateTime } from '../../utils/dateUtils';
import { openPrintReport } from '../../utils/printUtils';
import { MONTH_OPTIONS, REDEEM_STATUS_LABELS } from '../../utils/constants/dashboard';




const getRequestDate = (request) => request.requestedAt || request.createdAt || null;
const getRequestRef = (request) => `REQ-${request.id?.replace(/\D/g, '').substring(0, 5) || request.id}`;

const getMonthLabel = (month) => (
  MONTH_OPTIONS.find((option) => option.value === String(month))?.label || 'ทุกเดือน'
);

const buildYearOptions = (requests) => {
  const currentYear = new Date().getFullYear();
  const years = new Set([String(currentYear)]);

  requests.forEach((request) => {
    const value = getRequestDate(request);
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      years.add(String(parsed.getFullYear()));
    }
  });

  return [FILTER_VALUES.ALL, ...Array.from(years).sort((left, right) => Number(right) - Number(left))];
};

const RedeemRequests = () => {
  const [requests, setRequests] = React.useState([]);
  const [statusFilter, setStatusFilter] = React.useState(REDEEM_STATUS.PENDING);
  const [monthFilter, setMonthFilter] = React.useState(FILTER_VALUES.ALL);
  const [yearFilter, setYearFilter] = React.useState(FILTER_VALUES.ALL);
  const [loading, setLoading] = React.useState(true);
  const toast = useToast();
  const { confirm, ConfirmDialogProps } = useConfirm();

  const fetchRequests = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getRedeems();
      setRequests(response.data || []);
    } catch (error) {
      console.error('Fetch redeems error:', error);
      toast.error('โหลดรายการ Redeem ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleUpdateStatus = async (id, status) => {
    const actionLabel = status === REDEEM_STATUS.APPROVED ? 'อนุมัติ' : 'ปฏิเสธ';
    const ok = await confirm({
      title: `ยืนยันการ${actionLabel}`,
      message: `ยืนยันการ${actionLabel}คำขอนี้?`,
      confirmLabel: actionLabel,
      variant: status === REDEEM_STATUS.APPROVED ? 'primary' : 'danger',
    });
    if (!ok) return;

    try {
      await adminAPI.updateRedeemStatus(id, status);
      toast.success('อัปเดตสถานะสำเร็จ');
      fetchRequests();
    } catch (error) {
      console.error('Update redeem error:', error);
      toast.error('อัปเดตสถานะล้มเหลว');
    }
  };

  const yearValues = React.useMemo(() => buildYearOptions(requests), [requests]);
  const yearOptions = React.useMemo(
    () => yearValues.map((year) => ({
      value: year,
      label: year === FILTER_VALUES.ALL ? 'ทุกปี' : year,
    })),
    [yearValues]
  );

  const filteredRequests = React.useMemo(
    () => requests.filter((request) => {
      const matchesStatus = statusFilter === FILTER_VALUES.ALL || request.status === statusFilter;
      if (!matchesStatus) return false;

      const parsedDate = new Date(getRequestDate(request));
      if (Number.isNaN(parsedDate.getTime())) return false;

      const matchesMonth =
        monthFilter === FILTER_VALUES.ALL || String(parsedDate.getMonth() + 1) === String(monthFilter);
      const matchesYear =
        yearFilter === FILTER_VALUES.ALL || String(parsedDate.getFullYear()) === String(yearFilter);

      return matchesMonth && matchesYear;
    }),
    [monthFilter, requests, statusFilter, yearFilter]
  );

  const pendingCount = React.useMemo(
    () => requests.filter((request) => request.status === REDEEM_STATUS.PENDING).length,
    [requests]
  );

  const summary = React.useMemo(
    () => ({
      total: filteredRequests.length,
      approved: filteredRequests.filter((request) => request.status === REDEEM_STATUS.APPROVED).length,
      pending: filteredRequests.filter((request) => request.status === REDEEM_STATUS.PENDING).length,
      totalPoints: filteredRequests.reduce((sum, request) => sum + Number(request.reward?.pointsCost || 0), 0),
    }),
    [filteredRequests]
  );

  const handlePrint = () => {
    const periodValue = [
      getMonthLabel(monthFilter),
      yearFilter === FILTER_VALUES.ALL ? 'ทุกปี' : yearFilter,
    ].join(' / ');

    openPrintReport({
      fileName: `redeem-requests-${
        yearFilter === FILTER_VALUES.ALL ? 'all-years' : yearFilter
      }-${monthFilter === FILTER_VALUES.ALL ? 'all-months' : monthFilter}`,
      reportTitle: 'รายงานรายการ Redeem',
      subtitle: 'สรุปคำขอแลกของรางวัลตามตัวกรองที่เลือก',
      summary: [
        { label: 'รายการทั้งหมด', value: summary.total },
        { label: 'รอดำเนินการ', value: summary.pending },
        { label: 'อนุมัติแล้ว', value: summary.approved },
        { label: 'แต้มรวม', value: summary.totalPoints },
      ],
      filters: [
        {
          label: 'สถานะ',
          value: statusFilter === FILTER_VALUES.ALL ? 'ทั้งหมด' : REDEEM_STATUS_LABELS[statusFilter] || statusFilter,
        },
        { label: 'เดือน / ปี', value: periodValue },
      ],
      columns: ['รหัสอ้างอิง', 'ผู้แลก', 'แผนก', 'ของรางวัล', 'แต้มที่ใช้', 'วันที่ขอ', 'สถานะ'],
      rows: filteredRequests.map((request) => [
        getRequestRef(request),
        request.user?.name || request.userId || '-',
        request.user?.department || '-',
        request.reward?.name || '-',
        request.reward?.pointsCost ?? '-',
        formatThaiDateTime(getRequestDate(request), true),
        REDEEM_STATUS_LABELS[request.status] || request.status || '-',
      ]),
      emptyMessage: 'ไม่พบรายการ Redeem ตามตัวกรองที่เลือก',
    });
  };

  const columns = [
    { label: 'รหัสอ้างอิง' },
    { label: 'ผู้แลกของรางวัล' },
    { label: 'ของรางวัล' },
    { label: 'แต้มที่ใช้', className: 'text-right' },
    { label: 'วันที่ขอ' },
    { label: 'สถานะ' },
    { label: 'จัดการ', className: 'text-center' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="รายการแลกของรางวัล"
        subtitle="ตรวจสอบคำขอ Redeem, กรองตามเดือนและปี, และพิมพ์รายงานจากชุดข้อมูลที่กำลังดูอยู่"
        actions={
          <button type="button" onClick={handlePrint} className="btn btn-primary">
            <FileDown size={18} />
            <span>Print to PDF</span>
          </button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter(REDEEM_STATUS.PENDING)}
          className={`badge px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${
            statusFilter === REDEEM_STATUS.PENDING
              ? 'bg-primary text-white scale-105'
              : 'border border-border bg-white text-muted hover:bg-gray-50'
          }`}
        >
          รออนุมัติ ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter(FILTER_VALUES.ALL)}
          className={`badge px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${
            statusFilter === FILTER_VALUES.ALL
              ? 'bg-primary text-white scale-105'
              : 'border border-border bg-white text-muted hover:bg-gray-50'
          }`}
        >
          ทั้งหมด
        </button>
      </div>

      <div className="card p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <CustomSelect
            label="เดือน"
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value)}
            options={MONTH_OPTIONS}
          />

          <CustomSelect
            label="ปี"
            value={yearFilter}
            onChange={(event) => setYearFilter(event.target.value)}
            options={yearOptions}
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">รายการ</div>
              <div className="mt-1 text-2xl font-black text-slate-900">{summary.total}</div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">อนุมัติ</div>
              <div className="mt-1 text-2xl font-black text-emerald-800">{summary.approved}</div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">รอดำเนินการ</div>
              <div className="mt-1 text-2xl font-black text-amber-800">{summary.pending}</div>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-indigo-700">แต้มรวม</div>
              <div className="mt-1 text-2xl font-black text-indigo-800">{summary.totalPoints}</div>
            </div>
          </div>
        </div>
      </div>

      <AdminTable
        columns={columns}
        data={filteredRequests}
        loading={loading}
        emptyMessage="ไม่พบรายการ Redeem ตามตัวกรองที่เลือก"
        renderRow={(req) => (
          <tr key={req.id} className="border-b border-border transition-colors hover:bg-gray-50/50">
            <td className="p-4 text-sm font-black text-slate-400">{getRequestRef(req)}</td>
            <td className="p-4">
              <div className="text-sm font-bold text-slate-800">{req.user?.name || req.userId}</div>
              <div className="text-[10px] text-muted">{req.user?.department || '-'}</div>
            </td>
            <td className="p-4 text-sm font-bold text-primary">{req.reward?.name}</td>
            <td className="p-4 text-right text-sm font-black text-warning">{req.reward?.pointsCost}</td>
            <td className="p-4 text-sm text-muted">{formatThaiDateTime(getRequestDate(req), true)}</td>
            <td className="p-4">
              {req.status === REDEEM_STATUS.PENDING && (
                <span className="badge bg-warning-bg text-[10px] font-bold text-warning">
                  <Clock size={12} className="mr-1" />
                  รอดำเนินการ
                </span>
              )}
              {req.status === REDEEM_STATUS.APPROVED && (
                <span className="badge bg-success-bg text-[10px] font-bold text-success">อนุมัติแล้ว</span>
              )}
              {req.status === REDEEM_STATUS.REJECTED && (
                <span className="badge bg-danger-bg text-[10px] font-bold text-danger">ปฏิเสธ</span>
              )}
              {req.status === REDEEM_STATUS.FULFILLED && (
                <span className="badge bg-info-bg text-[10px] font-bold text-info">จัดส่งแล้ว</span>
              )}
            </td>
            <td className="p-4 text-center">
              {req.status === REDEEM_STATUS.PENDING ? (
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(req.id, REDEEM_STATUS.APPROVED)}
                    className="rounded-lg bg-success-bg p-2 text-success transition-all hover:bg-success hover:text-white"
                    title="อนุมัติ"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(req.id, REDEEM_STATUS.REJECTED)}
                    className="rounded-lg bg-danger-bg p-2 text-danger transition-all hover:bg-danger hover:text-white"
                    title="ปฏิเสธ"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <span className="text-xs font-black text-slate-300">PROCESSED</span>
              )}
            </td>
          </tr>
        )}
      />

      <ConfirmDialog {...ConfirmDialogProps} />
    </div>
  );
};

export default RedeemRequests;
