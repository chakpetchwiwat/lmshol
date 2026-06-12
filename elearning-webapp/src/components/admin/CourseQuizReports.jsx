import React from 'react';
import { FileText } from 'lucide-react';
import { formatThaiDateTime } from '../../utils/dateUtils';

const CourseQuizReports = ({ quizReports, loadingReports }) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm font-bold text-gray-800">ประวัติการทำแบบทดสอบในคอร์สนี้ทั้งหมด ({quizReports.length} รายการ)</p>
      </div>
      
      {loadingReports ? (
        <div className="py-12 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : quizReports.length > 0 ? (
        <div className="overflow-x-auto border border-gray-100 rounded-xl">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-muted">
                <th className="p-3 font-medium">ชื่อผู้ใช้</th>
                <th className="p-3 font-medium">อีเมล</th>
                <th className="p-3 font-medium">กอง</th>
                <th className="p-3 font-medium">บททดสอบ</th>
                <th className="p-3 font-medium text-center">คะแนน</th>
                <th className="p-3 font-medium text-center">ผลลัพธ์</th>
                <th className="p-3 font-medium text-right">วันเวลาที่ส่ง</th>
              </tr>
            </thead>
            <tbody>
              {quizReports.map((report) => (
                <tr key={report.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="p-3 font-medium">{report.user.name}</td>
                  <td className="p-3 text-muted">{report.user.email}</td>
                  <td className="p-3 max-w-[120px] truncate" title={report.user.department}>{report.user.department || '-'}</td>
                  <td className="p-3 text-muted truncate max-w-[150px]">{report.lesson.title}</td>
                  <td className="p-3 text-center font-bold">
                    {report.score}% 
                    <span className="text-[10px] text-gray-400 font-normal ml-1">(เกณฑ์ {report.lesson.passScore || 60}%)</span>
                  </td>
                  <td className="p-3 text-center">
                    {report.status === 'PASSED' ? (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">ผ่าน</span>
                    ) : (
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">ไม่ผ่าน</span>
                    )}
                  </td>
                  <td className="p-3 text-right text-muted text-xs">
                    {formatThaiDateTime(report.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-400">
          <FileText size={32} className="mb-2 opacity-20" />
          <p className="text-sm">ยังไม่มีประวัติการทำแบบทดสอบในคอร์สนี้</p>
        </div>
      )}
    </div>
  );
};

export default CourseQuizReports;
