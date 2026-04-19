---
created: 2026-04-17T18:17:02.829Z
title: Migrate useEffect data fetching to TanStack Query
area: ui
files:
  - elearning-webapp/src/main.jsx
  - elearning-webapp/src/utils/api.js
  - elearning-webapp/src/utils/queryKeys.js
  - elearning-webapp/src/lib/queryClient.js
  - elearning-webapp/src/hooks/queries
  - elearning-webapp/src/hooks/mutations
  - elearning-webapp/src/pages/user/LessonPlayer.jsx
  - elearning-webapp/src/pages/user/CourseDetail.jsx
  - elearning-webapp/src/pages/user/CourseList.jsx
  - elearning-webapp/src/pages/user/AnnouncementPlayer.jsx
  - elearning-webapp/src/pages/user/Home.jsx
  - elearning-webapp/src/pages/user/GoalDetail.jsx
  - elearning-webapp/src/pages/user/OngoingCourses.jsx
  - elearning-webapp/src/pages/user/CompletedCourses.jsx
  - elearning-webapp/src/pages/user/PointsHistory.jsx
  - elearning-webapp/src/pages/user/Rewards.jsx
  - elearning-webapp/src/pages/user/Profile.jsx
  - elearning-webapp/src/pages/admin/Dashboard.jsx
  - elearning-webapp/src/pages/admin/CourseManagement.jsx
  - elearning-webapp/src/pages/admin/UserManagement.jsx
  - elearning-webapp/src/pages/admin/GoalManagement.jsx
  - elearning-webapp/src/pages/admin/RewardsManagement.jsx
  - elearning-webapp/src/pages/admin/RedeemRequests.jsx
  - elearning-webapp/src/pages/admin/AnnouncementManagement.jsx
  - elearning-webapp/src/pages/admin/SystemSettings.jsx
  - elearning-webapp/src/pages/admin/Reports.jsx
---

## Objective

ย้าย data fetching ใน `elearning-webapp` จาก `useEffect + useState + loading/error state`
ไปเป็น TanStack Query v5 แบบค่อยเป็นค่อยไป โดย:

- ลด race condition และปัญหา unstable dependency
- ลด boilerplate loading/error/refetch logic
- เพิ่ม cache + invalidation ที่ควบคุมได้
- รักษา UX เดิมของหน้าเรียน โดยเฉพาะ quiz flow และ soft-loading transition

แผนอ้างอิงฉบับเต็ม:
`C:\Users\AlexWang\.gemini\antigravity\brain\44a66485-a5f6-4f92-9efe-902344989967\implementation_plan_tanstack_query.md.resolved`

## Constraints

- ห้าม regress quiz flow ใน `LessonPlayer.jsx`
- ห้าม regress soft-loading lesson transition
- ห้ามย้าย local UI state ไป React Query โดยไม่จำเป็น
- signed URL / document access เป็น on-demand flow ไม่ใช่ query cache หลัก
- query key ต้องอิง resource จริง ไม่ผูก `userId` โดยไม่จำเป็น

## Success Criteria

- มี `QueryClientProvider` ใช้งานใน app entry
- read endpoints หลักรองรับ `signal` จาก TanStack Query
- มี query key convention กลางใน `src/utils/queryKeys.js`
- มี query / mutation hooks แยกเป็นระบบใน `src/hooks`
- `LessonPlayer.jsx` ใช้ query/mutation flow ใหม่โดยไม่ทำลาย behavior เดิม
- หน้า priority A และ B ฝั่ง user migrate ครบ
- หน้า admin หลัก migrate ครบ
- build ผ่าน และ flow สำคัญถูกทดสอบครบ

## Execution Checklist

### Wave 0: Infrastructure

- [ ] ติดตั้ง `@tanstack/react-query` และ `@tanstack/react-query-devtools`
- [ ] สร้าง `elearning-webapp/src/lib/queryClient.js`
- [ ] ตั้งค่า default `QueryClient` ให้มี:
  - `retry: 1`
  - `refetchOnWindowFocus: false`
  - `refetchOnReconnect: true`
  - `staleTime` default ระดับกลาง
  - `gcTime` ที่เหมาะสม
- [ ] แก้ `elearning-webapp/src/main.jsx` ให้ wrap `<App />` ด้วย `QueryClientProvider`
- [ ] mount devtools เฉพาะ dev mode
- [ ] สร้าง `elearning-webapp/src/utils/queryKeys.js`
- [ ] ออกแบบ query key กลุ่ม:
  - user courses / announcements / lessons / rewards / profile / points history
  - common settings / goals
  - admin dashboard / users / courses / categories / announcements / rewards / redeem requests / goals / settings
- [ ] แก้ `elearning-webapp/src/utils/api.js` ให้ read endpoints สำคัญรองรับ `config`
- [ ] ยืนยันว่า queryFn สามารถส่ง `{ signal }` ลง axios ได้

### Wave 0 Verification

- [ ] app boot ผ่านหลัง setup provider
- [ ] ไม่มี runtime error จาก provider/devtools
- [ ] route หลักเปิดได้ตามปกติ
- [ ] `npm run build` ผ่านหลัง setup infra

### Wave 1: Lesson Flow First

- [ ] สร้าง `src/hooks/queries/useCourseDetail.js`
- [ ] สร้าง `src/hooks/queries/useLessonQuestions.js`
- [ ] สร้าง `src/hooks/queries/useLessonPlayerData.js`
- [ ] สร้าง `src/hooks/mutations/useSubmitQuiz.js`
- [ ] สร้าง `src/hooks/mutations/useUpdateLessonProgress.js`
- [ ] ย้าย `LessonPlayer.jsx` ไปใช้ query/mutation flow ใหม่
- [ ] เก็บ local UI state ต่อไปสำหรับ:
  - `answers`
  - `showDocViewer`
  - `documentAccess`
  - `openingDocument`
  - `isNavigatingAway`
  - `shouldScrollToQuizResult`
- [ ] ให้ `course detail` เป็น source of truth หลัก
- [ ] query `lesson questions` เฉพาะเมื่อ lesson type เป็น `quiz`
- [ ] document access ยังเป็น on-demand action แยกจาก query cache หลัก
- [ ] กำหนด invalidation หลัง submit quiz สำเร็จ
- [ ] กำหนด invalidation หลัง update progress สำเร็จ

### Wave 1 Guardrails

- [ ] หลัง submit quiz ต้องยังมี result container ใหญ่ และ scroll ไปหา
- [ ] ปุ่ม review ต้องไม่ clear `quizResult` หรือ `answers`
- [ ] ตอนเปลี่ยน lesson ต้องยังเป็น soft overlay ไม่ใช่ full-page flash
- [ ] full-screen loader ใช้เฉพาะ initial load เมื่อ `lesson` ยังไม่มี

### Wave 1 Verification

- [ ] เปิด lesson ครั้งแรกแล้ว load ได้ตามเดิม
- [ ] สลับ lesson เร็ว ๆ แล้วไม่เกิด race condition
- [ ] สลับ lesson แล้วไม่มี white flash เต็มหน้า
- [ ] submit quiz แล้ว result card ยังอยู่
- [ ] review answers แล้วผลสอบไม่หาย
- [ ] progress / completed state ยัง sync ถูก

### Wave 2: Priority A User Pages

- [ ] สร้าง hook สำหรับ `CourseDetail.jsx`
- [ ] สร้าง hook สำหรับ `CourseList.jsx`
- [ ] สร้าง hook สำหรับ `AnnouncementPlayer.jsx`
- [ ] สร้าง hook composite สำหรับ `Home.jsx`
- [ ] สร้าง hook สำหรับ `GoalDetail.jsx`
- [ ] ใช้ชื่อ API จริง `goalAPI.getGoalDetails`
- [ ] เพิ่ม query key สำหรับ announcement detail / questions ให้ครบ
- [ ] ตรวจ invalidation จาก flow ที่กระทบ home feed

### Wave 2 Verification

- [ ] `CourseDetail.jsx` เปิดซ้ำแล้วใช้ cache ได้
- [ ] `CourseList.jsx` back/forward แล้วไม่ fetch พร่ำเพรื่อ
- [ ] `AnnouncementPlayer.jsx` โหลดข้อมูลและคำถามได้ถูกต้อง
- [ ] `Home.jsx` โหลด courses + announcements + goals ได้ครบ
- [ ] `GoalDetail.jsx` ทำงานถูกต้องด้วย query ใหม่

### Wave 3: Priority B User Utility Pages

- [ ] สร้าง / reuse hook สำหรับ `OngoingCourses.jsx`
- [ ] สร้าง / reuse hook สำหรับ `CompletedCourses.jsx`
- [ ] สร้าง hook สำหรับ `PointsHistory.jsx`
- [ ] สร้าง hook สำหรับ `Rewards.jsx`
- [ ] สร้าง hook สำหรับ `Profile.jsx`
- [ ] พิจารณาใช้ `select` สำหรับ pages ที่แชร์ source data เดียวกัน
- [ ] ตั้ง staleTime ให้ `Profile` / `Rewards` / `Settings` ยาวขึ้นตามเหมาะสม

### Wave 3 Verification

- [ ] Ongoing/Completed แสดงผลถูกต้อง
- [ ] Rewards / Profile / PointsHistory refresh และ back/forward ได้ถูกต้อง
- [ ] ไม่มี toast ซ้ำจาก query error render

### Wave 4: Admin Core Pages

- [ ] สร้าง hook สำหรับ `Dashboard.jsx`
- [ ] แยก composite hook `useAdminDashboardData()` ถ้าจำเป็น
- [ ] สร้าง hook สำหรับ `CourseManagement.jsx`
- [ ] สร้าง hook สำหรับ `UserManagement.jsx`
- [ ] สร้าง hook สำหรับ `GoalManagement.jsx`
- [ ] สร้าง hook สำหรับ `RewardsManagement.jsx`
- [ ] สร้าง hook สำหรับ `RedeemRequests.jsx`
- [ ] สร้าง hook สำหรับ `AnnouncementManagement.jsx`
- [ ] สร้าง hook สำหรับ `SystemSettings.jsx`
- [ ] ออกแบบ invalidation matrix สำหรับ admin mutations ก่อนเริ่มแก้ component หนัก

### Wave 4 Verification

- [ ] Dashboard summary + analytics ยังแสดงครบ
- [ ] หน้า admin ที่มี modal ยังเปิด/ปิดและ refresh list ถูกต้อง
- [ ] create/update/delete แล้ว list ที่เกี่ยวข้อง refresh ตามคาด
- [ ] settings update แล้ว query ที่เกี่ยวข้อง invalidates ถูก scope

### Wave 5: Reports + Cleanup

- [ ] ตัดสินใจว่า `Reports.jsx` จะ migrate ใน wave นี้หรือแยก follow-up
- [ ] migrate `Reports.jsx` ถ้าอยู่ใน scope รอบนี้
- [ ] ลบ boilerplate `useEffect` fetch pattern ที่ obsolete
- [ ] รวม data transform ที่ซ้ำกันไปไว้ใน hooks
- [ ] ตรวจว่าไม่มี query key ซ้ำรูปแบบหรือ scope ไม่ชัด

## Implementation Notes

### Query Key Rules

- ใช้ resource จริง + id/filter จริง
- หลีกเลี่ยงการใส่ object ที่ unstable ลง key โดยไม่ normalize
- invalidate แบบเจาะจงก่อนเสมอ

### Mutation Rules

- ใช้ `mutation.onSuccess` สำหรับ invalidate
- ใช้ `mutation.onError` สำหรับ toast เป็นหลัก
- หลีกเลี่ยง toast จาก query render path ถ้าไม่มี duplicate guard

### Cache Rules

- Dashboard summary / analytics: staleTime สั้น
- Lists ทั่วไป: staleTime กลาง
- Profile / rewards / settings / goals: staleTime ยาวขึ้นได้
- signed URL / document access: อย่า cache ยาวแบบ query หลัก

## Verification Commands

- [ ] `cd elearning-webapp && npm install`
- [ ] `cd elearning-webapp && npm run build`

ถ้ามี test สำหรับ hook/query เพิ่มภายหลัง:
- [ ] รัน test ที่เกี่ยวข้อง

## Recommended Commit Checkpoints

- [ ] `setup react-query provider and query client`
- [ ] `add shared query keys and query-aware api wrappers`
- [ ] `migrate lesson player data flow to react-query`
- [ ] `migrate priority a user pages to react-query`
- [ ] `migrate priority b user pages to react-query`
- [ ] `migrate admin pages to react-query`
- [ ] `cleanup legacy useeffect fetch patterns`

## Definition of Done

- [ ] infra พร้อม
- [ ] lesson flow migrate และ verification ผ่าน
- [ ] user pages priority A/B migrate ครบ
- [ ] admin pages หลัก migrate ครบ
- [ ] build ผ่าน
- [ ] ไม่มี regression สำคัญใน quiz flow, lesson transition, และ dashboard/admin CRUD refresh
