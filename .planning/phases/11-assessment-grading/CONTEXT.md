# Phase 11: Centralized Assessment Grading & Instructor Dashboard

## Objective
สร้างระบบบริหารจัดการงานประเมิน (Assessment) แบบรวมศูนย์ เพื่อให้ Instructor และ Course Owner สามารถตรวจงานผู้เรียนจากทุกคอร์สที่ดูแลอยู่ได้ในหน้าเดียว เพิ่มความสะดวกและลดระยะเวลาในการทำงาน

## User Roles & Access
- **SuperAdmin**: เห็นงานทั้งหมดในระบบ
- **Instructor / Course Owner**: เห็นเฉพาะงานที่ส่งมาในคอร์สที่ตัวเองเป็นเจ้าของหรือผู้สอน

## Core Requirements
1. **Global Assessment Dashboard (Admin Side)**:
   - ตารางรายการส่งงานจากทุกคอร์ส (Submissions List)
   - ข้อมูลที่ต้องแสดง: ชื่อผู้เรียน, ชื่อคอร์ส, ชื่อบทเรียน (Assessment), วันที่ส่ง, สถานะ (Waiting/Passed/Failed/Revision)
   - ระบบ Filter: กรองตามคอร์ส, กรองตามสถานะ (เน้น Waiting for review)
   - ระบบ Search: ค้นหาตามชื่อผู้เรียน

2. **Grading Workflow**:
   - ปุ่ม "ตรวจงาน" (Grade) ที่เปิด Modal หรือหน้าต่างให้ดูไฟล์ที่ส่งมา
   - ฟิลด์กรอกคะแนน (Score) และข้อเสนอแนะ (Feedback)
   - ปุ่มเปลี่ยนสถานะ (Passed, Failed, Needs Revision)

3. **Sidebar Integration**:
   - เพิ่มเมนู "ตรวจงาน (Grading)" หรือ "Assessment" ใน Admin Sidebar
   - (Optional) แสดงตัวเลข Badge งานที่ค้างตรวจ (Waiting for review) บนเมนู

4. **Notifications & Progress**:
   - เมื่อตรวจผ่าน ระบบต้องอัปเดตความคืบหน้าของผู้เรียน และออกเกียรติบัตร (ถ้าเป็นบทสุดท้าย)
   - (Optional) แจ้งเตือนผู้เรียนเมื่อตรวจงานเสร็จ

## Success Criteria
- Instructor สามารถเข้าถึงรายการงานที่ค้างตรวจได้ภายใน 1 คลิกจากหน้า Dashboard
- ระบบสามารถแยกสิทธิ์การมองเห็นงานตามคอร์สที่รับผิดชอบได้อย่างถูกต้อง
- การให้คะแนนส่งผลต่อสถานะการเรียนของผู้เรียนทันที
