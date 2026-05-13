# 📂 Project Structure: Looma E-Learning Platform

โครงสร้างโปรเจกต์ของระบบ **Looma** แบ่งสัดส่วนตามมาตรฐาน React Modern Application เพื่อให้ง่ายต่อการดูแลรักษาและการขยายระบบในอนาคต

---

## 🏗️ Folder Overview

### 📁 `public/`
เก็บไฟล์ Static Assets ที่สามารถเข้าถึงได้โดยตรงผ่าน URL เช่น Favicon, รูปภาพพื้นฐาน หรือไฟล์ที่ต้องการใช้ในระดับ Global

### 📁 `src/`
โฟลเดอร์หลักสำหรับ Source Code ทั้งหมดของแอปพลิเคชัน

#### 🔹 `src/components/`
ศูนย์รวม UI Components ที่แบ่งตามลักษณะการใช้งาน:
*   **`common/`**: คอมโพเนนต์ที่ใช้ซ้ำได้ทั่วทั้งโปรเจกต์ (e.g., `AppLogo`, `CourseCard`, `SectionHeader`, `Modal`)
*   **`layout/`**: โครงสร้างหลักของหน้าเว็บ (Layout Wrappers) เช่น `UserLayout`, `AdminLayout`
*   **`user/`**: คอมโพเนนต์เฉพาะสำหรับหน้าฝั่งผู้ใช้งาน (e.g., `HomeHero`, `MobileContinueCTA`)
*   **`admin/`**: คอมโพเนนต์เฉพาะสำหรับหน้าฝั่งแอดมินและการจัดการข้อมูล

#### 🔹 `src/pages/`
เก็บไฟล์หน้าหลัก (Page Components) โดยแยกตามสิทธิ์การเข้าถึง:
*   **`auth/`**: หน้าที่เกี่ยวข้องกับการยืนยันตัวตน เช่น `Login`, `ResetPassword`
*   **`user/`**: หน้าหลักของผู้ใช้งาน เช่น `Home` (Dashboard), `Courses`, `Rewards`, `Profile`
*   **`admin/`**: หน้าการจัดการสำหรับแอดมิน เช่น `Dashboard`, `CourseManagement`, `UserManagement`, `AssessmentCenter`

#### 🔹 `src/context/`
เก็บ React Context สำหรับจัดการ Global State เช่น:
*   `useToast`: ระบบแจ้งเตือน (Toasts) ทั่วทั้งแอป
*   `AuthContext`: จัดการสถานะการเข้าสู่ระบบและสิทธิ์ผู้ใช้งาน

#### 🔹 `src/utils/`
ฟังก์ชันเสริมและไฟล์ตั้งค่าต่างๆ:
*   `api.js`: ไฟล์หลักในการจัดการ HTTP Requests (Axios) และ API Services ทั้งหมด
*   `dateUtils.js`: จัดการเรื่องวันที่ โดยเฉพาะการแสดงผลแบบภาษาไทยและ Logic การนับถอยหลัง
*   **`constants/`**: เก็บค่าคงที่ต่างๆ เช่น API Endpoint, สถานะคอร์ส (Enrollment Status), รหัสบทบาท (Roles)

#### 🔹 `src/assets/`
เก็บไฟล์ Static ที่ต้องผ่านกระบวนการ Build เช่น CSS Global Styles และรูปภาพที่ใช้ภายในคอมโพเนนต์

---

## 🚀 Key Files
*   **`App.jsx`**: ไฟล์หลักที่คุมระบบ Routing ทั้งหมดของแอปพลิเคชัน
*   **`main.jsx`**: จุดเริ่มต้น (Entry Point) ของแอปพลิเคชัน
*   **`index.css`**: จัดการ Tailwind CSS และ CSS Variables หลักของระบบ

---

## 📌 Naming Convention
*   **Components**: ใช้ PascalCase (e.g., `CourseCard.jsx`)
*   **Utils/Functions**: ใช้ camelCase (e.g., `dateUtils.js`)
*   **Folders**: ใช้ lowercase (e.g., `components`, `pages`)
