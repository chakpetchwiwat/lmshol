# Competency Management Implementation Plan

วันที่จัดทำ: 2026-06-04

## สรุปการตัดสินใจ

ระบบใหม่จะแยก "หมวดหมู่คอร์ส" ออกจาก "Competency Framework" โดยสิ้นเชิง

- หมวดหมู่คอร์สยังคงอยู่ ใช้สำหรับจัดประเภทคอร์ส, filter รายการคอร์ส, และงาน UI เดิมใน Course Management
- Competency เป็น master data ใหม่ แยก database table, API, และหน้าจัดการของตัวเอง
- หน้าสร้าง/แก้ไขคอร์สจะเชื่อมกับ competency ผ่าน mapping table เท่านั้น
- อบรมภายนอกที่เพิ่มเอง หรือ import จาก Excel ต้องเชื่อมกับ competency ได้เหมือนคอร์ส
- ในไฟล์ Excel ใช้ตัวย่อ `GBT` แทน `Training Matrix`
- Excel ช่อง K คือคำอธิบายการวัดระดับ/level description ที่ต้องนำมาใช้ตอนเลือก level

## เป้าหมาย

1. คงระบบ Course Category เดิมไว้ ไม่รื้อออกจาก course workflow
2. สร้างหน้า Competency Management แบบเต็มหน้า
3. รองรับโครงสร้าง Competency จากไฟล์ Excel `GBT_Central_Master_TM_v5_integrated_5.xlsx`
4. รองรับคำอธิบายระดับ/เกณฑ์การวัดจาก Excel ช่อง K
5. ในหน้าสร้าง/แก้ไขคอร์ส เลือก competency ได้หลายรายการ
6. แต่ละ competency ที่เลือกต้องกำหนด required level ได้
7. แบบฟอร์มเพิ่มอบรมภายนอกต้องเลือก competency และ level ได้
8. Import Excel อบรมภายนอกต้องรองรับ competency mapping และ level mapping
9. Training Matrix Dashboard ต้องอ่านข้อมูลได้จากทั้งคอร์สภายในและอบรมภายนอก

## ขอบเขตระบบ

### ยังคงไว้

- `Course Category`
- `CategoryManagementModal`
- การ filter คอร์สด้วยหมวดหมู่
- field `course.categoryId`
- logic เดิมที่ใช้ category กับหน้ารายการคอร์ส

### เพิ่มใหม่

- `Competency Management Page`
- `Competency Group`
- `Competency Category`
- `Competency Item`
- `Competency Level / Rubric`
- `Course Competency Mapping`
- `External Training Competency Mapping`
- Excel import/preview สำหรับ competency framework
- Excel import/preview สำหรับอบรมภายนอก
- Competency selector ใน create/edit course
- Competency selector ใน external training form

### ไม่ควรทำ

- ไม่ใช้ course category เป็น competency category
- ไม่ผูก competency framework กับ modal หมวดหมู่คอร์สเดิม
- ไม่เก็บ competency เป็น JSON string ใน course หรือ external training table ถ้ามีทางเลือกใช้ relation table
- ไม่ hardcode level description ใน frontend

## โครงสร้างข้อมูลแนะนำ

```text
CourseCategory
- id
- name
- description
- icon
- status
- expiredAt

Course
- id
- title
- description
- categoryId
- ...

CompetencyGroup
- id
- code
- name
- description
- displayOrder
- status

CompetencyCategory
- id
- groupId
- code
- name
- description
- displayOrder
- status

Competency
- id
- categoryId
- code
- name
- description
- measurementDescription
- sourceColumnK
- displayOrder
- status

CompetencyLevel
- id
- competencyId
- level
- label
- description
- measurementCriteria
- displayOrder

CourseCompetency
- id
- courseId
- competencyId
- requiredLevel
- note

ExternalTraining
- id
- title
- provider
- trainingDate
- duration
- participantScope
- sourceType
- importBatchId
- ...

ExternalTrainingCompetency
- id
- externalTrainingId
- competencyId
- requiredLevel
- note
```

## Relationship Diagram

```text
CourseCategory
      |
      | categoryId
      v
Course
      |
      | 1:N
      v
CourseCompetency
      |
      | competencyId
      v
Competency
      |
      | N:1
      v
CompetencyCategory
      |
      | N:1
      v
CompetencyGroup

Competency
      |
      | 1:N
      v
CompetencyLevel

ExternalTraining
      |
      | 1:N
      v
ExternalTrainingCompetency
      |
      | competencyId
      v
Competency
```

## Admin Navigation

```text
Admin
 |
 |-- Course Management
 |    |-- Course List
 |    |-- Create Course
 |    |-- Edit Course
 |    |-- Course Category Modal
 |
 |-- External Training Management
 |    |-- Add External Training
 |    |-- Import External Training Excel
 |    |-- Competency Mapping
 |
 |-- Competency Management
      |-- Framework Tree
      |-- Competency Table
      |-- Level Rubric Editor
      |-- Excel Import Preview
```

## UX Flow: Competency Management

```text
Open Competency Management
        |
        v
View framework by Group > Category > Competency
        |
        +-- Search competency
        +-- Filter by group/category/status
        +-- Add/edit group
        +-- Add/edit category
        +-- Add/edit competency
        +-- Manage level descriptions
        +-- Import competency framework from Excel
```

## UX Flow: Create/Edit Course

```text
Open Create/Edit Course
        |
        v
Basic Info
        |
        +-- Course Category remains existing category selector
        |
        v
Competency Mapping Section
        |
        +-- Add Competency
        +-- Select multiple competency items
        +-- Choose required level per item
        +-- Show measurement description from Excel column K
        |
        v
CourseCompetency Mapping
```

## UX Flow: Add External Training

```text
Open External Training Form
        |
        v
Training Details
        |
        +-- title/provider/date/duration/participants
        |
        v
Competency Mapping Section
        |
        +-- Add Competency
        +-- Select multiple competency items
        +-- Choose required level per item
        +-- Show measurement description from Excel column K
        |
        v
ExternalTrainingCompetency Mapping
```

## UX Flow: Import External Training Excel

```text
Upload External Training Excel
        |
        v
Preview Rows
        |
        +-- map training fields
        +-- map competency code/name
        +-- map required level
        +-- show unresolved competency rows
        |
        v
Resolve / Confirm
        |
        v
Create ExternalTraining + ExternalTrainingCompetency
```

## API Plan

### Competency Framework

```text
GET    /api/admin/competency-groups
POST   /api/admin/competency-groups
PUT    /api/admin/competency-groups/:id

GET    /api/admin/competency-categories
POST   /api/admin/competency-categories
PUT    /api/admin/competency-categories/:id

GET    /api/admin/competencies
POST   /api/admin/competencies
PUT    /api/admin/competencies/:id

GET    /api/admin/competencies/:id/levels
PUT    /api/admin/competencies/:id/levels
```

### Course Mapping

```text
GET    /api/admin/courses/:id/competencies
PUT    /api/admin/courses/:id/competencies
```

### External Training Mapping

```text
GET    /api/admin/external-trainings/:id/competencies
PUT    /api/admin/external-trainings/:id/competencies
```

### Excel Import

```text
POST   /api/admin/competencies/import/preview
POST   /api/admin/competencies/import/commit
POST   /api/admin/external-trainings/import/preview
POST   /api/admin/external-trainings/import/commit
```

## Frontend Implementation Plan

### Phase 1: Survey and Data Contract

- อ่านโครงสร้าง Excel จริง
- บันทึก convention ว่า `GBT` ใน Excel หมายถึง `Training Matrix`
- ระบุ column mapping ทั้งหมด
- ยืนยันว่า Excel ช่อง K เป็น description รวม หรือแยก rubric ตาม level
- ยืนยัน column ของ import อบรมภายนอกว่ามี competency code/name และ level หรือไม่
- สร้าง data contract สำหรับ import
- ยืนยันจำนวน level ที่ใช้จริง เช่น 1-5

### Phase 2: Backend Schema and API

- เพิ่ม Prisma models สำหรับ competency
- เพิ่ม models สำหรับ external training competency mapping
- เพิ่ม migration
- เพิ่ม serializer/helper สำหรับ competency tree
- เพิ่ม CRUD API
- เพิ่ม course competency mapping API
- เพิ่ม external training competency mapping API
- เพิ่ม validation ห้าม mapping competency ซ้ำใน source เดียวกัน
- เพิ่ม validation requiredLevel ต้องอยู่ใน level ที่ competency มีจริง

### Phase 3: Excel Import

- สร้าง competency framework import preview
- normalize ชื่อ/ตัวย่อ โดย map `GBT` เป็น Training Matrix context
- map Excel ช่อง K เข้า `measurementDescription` หรือ `CompetencyLevel.description`
- สร้าง external training import preview
- map training fields เช่น title/provider/date/duration/participants
- map competency code/name และ required level
- แสดง unresolved rows ก่อน commit
- commit import เข้า database หลัง admin confirm

### Phase 4: Competency Management Page

- เพิ่ม route หน้า admin competency
- เพิ่ม sidebar/nav item
- สร้าง framework tree
- สร้าง competency table
- สร้าง editor drawer
- สร้าง level rubric editor
- เพิ่ม active/inactive status
- เพิ่ม search/filter

### Phase 5: Shared Competency Selector

- สร้าง component กลาง เช่น `CompetencyMappingSelector`
- รองรับ select multiple
- รองรับ required level ต่อ competency
- แสดง measurement description จาก Excel ช่อง K
- รองรับ read-only mode สำหรับ detail page
- ใช้ร่วมกันใน course form และ external training form

### Phase 6: Course Create/Edit Integration

- เพิ่ม `competencies` ใน default course form
- load competency options ใน `CourseManagement`
- เพิ่ม selector ใน create/edit course
- ตอน edit course ต้อง hydrate mapping เดิม
- ตอน save course ต้องส่ง mapping ไป backend

### Phase 7: External Training Form and Import Integration

- ปรับแบบฟอร์มเพิ่มอบรมภายนอกให้มี Competency Mapping Section
- ใช้ shared selector เดียวกับคอร์ส
- รองรับเลือก competency หลายรายการ
- รองรับ required level ต่อ competency
- แสดง measurement description จาก Excel ช่อง K ระหว่างเลือก level
- ปรับ import Excel อบรมภายนอกให้ preview mapping ก่อน commit
- รองรับ unresolved competency แล้วให้ admin เลือก/แก้ mapping
- บันทึก mapping ลง `ExternalTrainingCompetency`

### Phase 8: Reports and Training Matrix Readiness

- ปรับ API course detail ให้ include competency mapping
- ปรับ API external training detail ให้ include competency mapping
- เตรียม data shape สำหรับ Training Matrix Dashboard
- ทำ endpoint summary ที่รวมทั้ง internal course และ external training
- แยก sourceType ใน dashboard เช่น `INTERNAL_COURSE` และ `EXTERNAL_TRAINING`

### Phase 9: Testing and Verification

- ทดสอบ import competency Excel
- ทดสอบ CRUD competency
- ทดสอบ create/edit course พร้อม competency หลายรายการ
- ทดสอบเปลี่ยน required level
- ทดสอบเพิ่มอบรมภายนอกพร้อม competency หลายรายการ
- ทดสอบ import Excel อบรมภายนอกพร้อม competency mapping
- ทดสอบ unresolved competency ใน import preview
- ทดสอบ inactive competency แล้วยังไม่ทำให้ course/external training เดิมเสีย
- ทดสอบ API regression ของ course category เดิม

## Suggested File Changes

### Backend

```text
elearning-api/prisma/schema.prisma
elearning-api/src/controllers/admin.controller.js
elearning-api/src/routes/admin.routes.js
elearning-api/src/services/admin/competency.service.js
elearning-api/src/services/admin/externalTraining.service.js
elearning-api/scripts/import_competencies_from_excel.js
elearning-api/scripts/import_external_trainings.js
```

### Frontend

```text
elearning-webapp/src/pages/admin/CompetencyManagement.jsx
elearning-webapp/src/components/admin/competency/CompetencyFrameworkTree.jsx
elearning-webapp/src/components/admin/competency/CompetencyTable.jsx
elearning-webapp/src/components/admin/competency/CompetencyEditorDrawer.jsx
elearning-webapp/src/components/admin/competency/CompetencyLevelEditor.jsx
elearning-webapp/src/components/admin/competency/CompetencyImportModal.jsx
elearning-webapp/src/components/admin/CompetencyMappingSelector.jsx
elearning-webapp/src/components/admin/ExternalTrainingForm.jsx
elearning-webapp/src/components/admin/ExternalTrainingImportModal.jsx
elearning-webapp/src/components/admin/CourseBasicInfoForm.jsx
elearning-webapp/src/pages/admin/CourseManagement.jsx
elearning-webapp/src/utils/api.js
elearning-webapp/src/App.jsx
```

## Course Save Payload

```json
{
  "title": "Example Course",
  "categoryId": "course_category_id",
  "competencies": [
    {
      "competencyId": "competency_id_1",
      "requiredLevel": 3
    }
  ]
}
```

## External Training Save Payload

```json
{
  "title": "External GMP Workshop",
  "provider": "External Provider",
  "trainingDate": "2026-06-04",
  "competencies": [
    {
      "competencyId": "competency_id_1",
      "requiredLevel": 3
    }
  ]
}
```

## Acceptance Criteria

- Course category เดิมยังใช้งานได้เหมือนเดิม
- Competency management อยู่คนละหน้ากับ category modal
- Competency data ไม่ปนกับ course category table
- สร้าง competency group/category/item/level ได้
- import competency framework จาก Excel ได้
- Excel ช่อง K ถูกเก็บและแสดงในระบบ
- สร้างคอร์สพร้อม competency หลายรายการได้
- แก้ไขคอร์สแล้ว mapping competency เดิมแสดงถูก
- เพิ่มอบรมภายนอกพร้อม competency หลายรายการได้
- import Excel อบรมภายนอกพร้อม map competency/level ได้
- import preview แสดงแถวที่หา competency ไม่เจอและให้แก้ไขก่อน commit ได้
- บันทึกแล้ว backend เก็บ relation ถูกต้อง
- Course list/filter เดิมไม่พัง
- Training Matrix Dashboard อ่าน mapping จากทั้งคอร์สภายในและอบรมภายนอกได้

## Open Questions

1. Excel ช่อง K เป็น rubric แยกตาม level หรือเป็นคำอธิบายรวมของ competency?
2. จำนวน level ใช้ 1-5 ตายตัวหรือมีมาก/น้อยตาม competency?
3. Required level ในคอร์สหมายถึงระดับขั้นต่ำที่ผู้เรียนต้องมี หรือระดับที่คอร์สนั้นสอนให้ถึง?
4. Competency ต้องผูกกับตำแหน่ง/แผนกด้วยหรือไม่?
5. Training Matrix Dashboard ต้องแสดงระดับจาก course mapping, user assessment, หรือ completion result?
6. `GBT` เป็นแค่ตัวย่อใน Excel หรือควรใช้เป็นชื่อ module/namespace ในระบบด้วย?
7. อบรมภายนอกหนึ่งรายการมีผู้เข้าอบรมหลายคนหรือเป็น record ต่อคน?
8. Import Excel อบรมภายนอกมี competency code อยู่แล้วหรือใช้ชื่อหลักสูตรเพื่อ map competency?
9. ถ้า import เจอ competency ใหม่ที่ยังไม่มีใน master data ต้อง auto-create, skip, หรือให้ admin resolve ก่อน commit?

## Recommendation

เริ่มจากสร้าง competency framework เป็นระบบ master data ก่อน แล้วค่อยเชื่อมกับ course mapping และ external training mapping หลังจาก schema นิ่งแล้ว วิธีนี้ลดความเสี่ยงที่สุด เพราะไม่กระทบ course category เดิม และทำให้ Training Matrix Dashboard มี data source ที่รวมทั้งการอบรมภายในและอบรมภายนอกได้ชัดเจนตั้งแต่แรก
