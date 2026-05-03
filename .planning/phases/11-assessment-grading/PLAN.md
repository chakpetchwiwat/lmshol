# Phase 11: Centralized Assessment Grading Plan

เฟสนี้จะมุ่งเน้นการสร้างศูนย์กลางการตรวจงาน (Grading Hub) เพื่อให้ Instructor สามารถจัดการงานประเมินจากทุกคอร์สได้ในหน้าเดียว

---

## Proposed Changes

### 1. Backend Integration (elearning-api)

#### [MODIFY] [assessment.service.js](file:///d:/งาน/AI Project/elearning-api/src/services/assessment.service.js)
- เพิ่มฟังก์ชัน `listAllAssessmentSubmissions(actor, filters)`
  - ตรวจสอบสิทธิ์: ถ้าเป็น SuperAdmin ให้ดึงทั้งหมด ถ้าเป็น Instructor ให้ดึงเฉพาะคอร์สที่มีสิทธิ์ใน `CourseStaff`
  - รองรับการ Filter: `courseId`, `status`
  - รองรับการ Search: ชื่อผู้เรียน (Learner Name)
  - รองรับ Pagination

#### [MODIFY] [admin.controller.js](file:///d:/งาน/AI Project/elearning-api/src/controllers/admin.controller.js)
- เพิ่ม Handler `getAllAssessmentSubmissions` เพื่อเรียกใช้ Service ใหม่

#### [MODIFY] [admin.routes.js](file:///d:/งาน/AI Project/elearning-api/src/routes/admin.routes.js)
- เพิ่ม Route: `GET /admin/assessments` (จำกัดสิทธิ์ Admin/Instructor)

---

### 2. Frontend Integration (elearning-webapp)

#### [MODIFY] [api.js](file:///d:/งาน/AI Project/elearning-webapp/src/utils/api.js)
- เพิ่ม `adminAPI.getAllAssessmentSubmissions(params)`
- เพิ่ม `adminAPI.gradeAssessmentSubmissionGlobal(submissionId, data)` (ถ้าจำเป็นต้องแยกจากคอร์ส)

#### [NEW] [AssessmentGrading.jsx](file:///d:/งาน/AI Project/elearning-webapp/src/pages/admin/AssessmentGrading.jsx)
- สร้างหน้าจอ Dashboard สำหรับตรวจงานรวมศูนย์
- มีระบบ Tab หรือ Filter สำหรับสถานะงาน (Waiting, Passed, Failed)
- ตารางแสดงรายการงาน พร้อมปุ่ม "ตรวจงาน" ที่จะเปิด Modal ให้คะแนน
- แสดงสถิติเบื้องต้น (เช่น จำนวนงานที่ค้างตรวจทั้งหมด)

#### [MODIFY] [App.jsx](file:///d:/งาน/AI Project/elearning-webapp/src/App.jsx)
- ลงทะเบียน Route `/admin/assessments`

#### [MODIFY] [AdminLayout.jsx](file:///d:/งาน/AI Project/elearning-webapp/src/components/layout/AdminLayout.jsx)
- เพิ่มเมนู "ตรวจงาน" (ไอคอน `ClipboardCheck` หรือ `FileSearch`) ใน Sidebar
- ตั้งค่าให้แสดงเฉพาะผู้ที่มีสิทธิ์ Admin/Instructor

---

## Verification Plan

### Automated Tests
- ตรวจสอบ API `GET /admin/assessments` ว่าคืนค่าข้อมูลที่ถูกกรองตามสิทธิ์ Instructor อย่างถูกต้อง
- ทดสอบการส่งคะแนนผ่าน Endpoint ใหม่

### Manual Verification
- ล็อกอินด้วยบัญชี Instructor และตรวจสอบว่าเห็นงานเฉพาะจากคอร์สที่ตัวเองดูแลจริงหรือไม่
- ทดสอบการตรวจงานผ่านหน้า Dashboard รวม และเช็คว่าสถานะในหน้าคอร์สอัปเดตตามหรือไม่
- ตรวจสอบความถูกต้องของ UI บนหน้าจอขนาดต่างๆ
