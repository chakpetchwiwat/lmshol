import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, Award, BookOpen, UserCheck, Key, HelpCircle, Check } from 'lucide-react';
import AppLogo from '../../components/common/AppLogo';

const UserPermissionGuide = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="text-center mb-16 animate-fade-in">
          <div className="flex justify-center mb-6">
            <AppLogo className="justify-center" imageClassName="h-14 max-w-[200px]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4 bg-gradient-to-r from-indigo-300 via-indigo-200 to-white bg-clip-text text-transparent">
            คู่มือโครงสร้างสิทธิ์การใช้งานระบบ LMSFDA
          </h1>
          <p className="text-lg text-slate-400 max-w-3xl mx-auto font-medium">
            รายละเอียดขอบเขตการเข้าถึงข้อมูลและสิทธิ์ในการจัดการระบบตามบทบาทและตำแหน่งต่าง ๆ ขององค์กร
          </p>
        </header>

        {/* Section 1: System-wide Roles */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8 border-l-4 border-indigo-500 pl-4">
            <Shield className="text-indigo-400" size={28} />
            <h2 className="text-2xl font-black text-white">สิทธิ์หลักในระดับระบบ (System-wide Permissions)</h2>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2">
            
            {/* Superadmin / Admin */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-md hover:border-amber-500/30 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-[4px] bg-amber-500" />
              <div className="flex items-start justify-between mb-4">
                <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-amber-500/10 text-amber-400 uppercase tracking-wider">
                  Superadmin / Admin
                </span>
                <Key className="text-amber-400/80" size={22} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">ผู้ดูแลระบบสูงสุด / ผู้ดูแลระบบ</h3>
              <p className="text-sm font-semibold text-slate-400 mb-6 pb-4 border-b border-slate-800/60">
                ขอบเขตข้อมูล: <span className="text-white">ทุกผู้เรียน ทุกกอง ทุกหลักสูตร (Global)</span>
              </p>
              <ul className="space-y-3.5 text-sm text-slate-300">
                <li className="flex gap-3"><Check size={16} className="text-amber-500 shrink-0 mt-0.5" /> <span>จัดการผู้ใช้งานทั้งหมดในระบบ (เพิ่ม, แก้ไขสิทธิ์, ลบ, กำหนดสังกัด)</span></li>
                <li className="flex gap-3"><Check size={16} className="text-amber-500 shrink-0 mt-0.5" /> <span>จัดการโครงสร้างองค์กร (กอง, ระดับตำแหน่ง, และ Cohort Roles)</span></li>
                <li className="flex gap-3"><Check size={16} className="text-amber-500 shrink-0 mt-0.5" /> <span>สร้าง แก้ไข และลบ หลักสูตร บทเรียน สื่อ และแบบทดสอบทั้งหมด</span></li>
                <li className="flex gap-3"><Check size={16} className="text-amber-500 shrink-0 mt-0.5" /> <span>ดูรายงานความคืบหน้า รายงานผลสัมฤทธิ์ และรายงานแต้มสะสมในภาพรวมระบบ</span></li>
                <li className="flex gap-3"><Check size={16} className="text-amber-500 shrink-0 mt-0.5" /> <span>จัดการและปรับปรุงแต้มสะสม (Points Balance) ของผู้ใช้งานทุกคน</span></li>
                <li className="flex gap-3"><Check size={16} className="text-amber-500 shrink-0 mt-0.5" /> <span>เข้าถึงเครื่องมือระบบ ความปลอดภัย และการเชื่อมโยงระบบภายนอก</span></li>
              </ul>
            </div>

            {/* HR */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-md hover:border-pink-500/30 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-[4px] bg-pink-500" />
              <div className="flex items-start justify-between mb-4">
                <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-pink-500/10 text-pink-400 uppercase tracking-wider">
                  HR (Human Resources)
                </span>
                <UserCheck className="text-pink-400/80" size={22} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">ฝ่ายทรัพยากรบุคคล</h3>
              <p className="text-sm font-semibold text-slate-400 mb-6 pb-4 border-b border-slate-800/60">
                ขอบเขตข้อมูล: <span className="text-white">ทุกผู้เรียน ทุกลิงก์ฝึกอบรม ทุกกอง (Global Reporting)</span>
              </p>
              <ul className="space-y-3.5 text-sm text-slate-300">
                <li className="flex gap-3"><Check size={16} className="text-pink-500 shrink-0 mt-0.5" /> <span>เข้าถึงข้อมูลโปรไฟล์ ประวัติการศึกษา และเอกสารของผู้เรียนทุกคนในองค์กร</span></li>
                <li className="flex gap-3"><Check size={16} className="text-pink-500 shrink-0 mt-0.5" /> <span>เรียกดูและส่งออกรายงานความคืบหน้าและประวัติการฝึกอบรม (Training Report) ทั้งหมด</span></li>
                <li className="flex gap-3"><Check size={16} className="text-pink-500 shrink-0 mt-0.5" /> <span>ตรวจสอบการทำงานและความคืบหน้าของเป้าหมายการเรียนรู้ (Goal Monitoring) ภาพรวม</span></li>
                <li className="flex gap-3"><Check size={16} className="text-pink-500 shrink-0 mt-0.5" /> <span>สามารถอัปโหลดไฟล์/แบบฟอร์มบันทึกการเรียนและประวัติการอบรมย้อนหลังของพนักงานได้</span></li>
                <li className="flex gap-3"><Check size={16} className="text-pink-500 shrink-0 mt-0.5" /> <span>ดูแลระบบแต้มสะสมสำหรับเป็นรางวัลและกระตุ้นการเรียนรู้ในภาพรวม</span></li>
              </ul>
            </div>

            {/* Manager */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-md hover:border-indigo-500/30 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-[4px] bg-indigo-500" />
              <div className="flex items-start justify-between mb-4">
                <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-indigo-500/10 text-indigo-400 uppercase tracking-wider">
                  Manager
                </span>
                <Users className="text-indigo-400/80" size={22} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">ผู้จัดการ / หัวหน้างาน</h3>
              <p className="text-sm font-semibold text-slate-400 mb-6 pb-4 border-b border-slate-800/60">
                ขอบเขตข้อมูล: <span className="text-white">เฉพาะสมาชิกในกองของตนเอง (Department Scope)</span>
              </p>
              <ul className="space-y-3.5 text-sm text-slate-300">
                <li className="flex gap-3"><Check size={16} className="text-indigo-500 shrink-0 mt-0.5" /> <span>เข้าถึงระบบหลังบ้าน (Admin Panel) เพื่อดูสถิติและผลการเรียน</span></li>
                <li className="flex gap-3"><Check size={16} className="text-indigo-500 shrink-0 mt-0.5" /> <span>ติดตามความคืบหน้าการฝึกอบรมและดูประวัติคะแนนของพนักงานในกอง</span></li>
                <li className="flex gap-3"><Check size={16} className="text-indigo-500 shrink-0 mt-0.5" /> <span>สร้างเป้าหมายการฝึกอบรมประจำสัปดาห์/เดือนสำหรับกองหรือกลุ่มงานของตน</span></li>
                <li className="flex gap-3"><Check size={16} className="text-indigo-500 shrink-0 mt-0.5" /> <span>เขียนและเผยแพร่ประกาศข่าวสารเฉพาะพนักงานในสังกัดกอง</span></li>
                <li className="flex gap-3"><Check size={16} className="text-indigo-500 shrink-0 mt-0.5" /> <span>ได้รับการปรับสิทธิ์ระบบเป็น 'Manager' อัตโนมัติตามตำแหน่งที่มีสิทธิ์ accessAdmin</span></li>
              </ul>
            </div>

            {/* Cohort Supervisor */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-md hover:border-blue-500/30 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-[4px] bg-blue-500" />
              <div className="flex items-start justify-between mb-4">
                <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-blue-500/10 text-blue-400 uppercase tracking-wider">
                  Cohort Supervisor
                </span>
                <Shield className="text-blue-400/80" size={22} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">ผู้ดูแลประจำ Cohort</h3>
              <p className="text-sm font-semibold text-slate-400 mb-6 pb-4 border-b border-slate-800/60">
                ขอบเขตข้อมูล: <span className="text-white">เฉพาะผู้เรียนใน Cohort ที่ดูแลรับผิดชอบ (Cohort Scope)</span>
              </p>
              <ul className="space-y-3.5 text-sm text-slate-300">
                <li className="flex gap-3"><Check size={16} className="text-blue-500 shrink-0 mt-0.5" /> <span>เข้าใช้งานระบบหลังบ้าน (Admin Panel) ภายใต้ขอบเขต Cohort ที่กำหนด</span></li>
                <li className="flex gap-3"><Check size={16} className="text-blue-500 shrink-0 mt-0.5" /> <span>สิทธิ์ของระบบจะถูกล็อคตาม "ตำแหน่ง (Position)" อัตโนมัติสำหรับบทบาทผู้ดูแลนี้</span></li>
                <li className="flex gap-3"><Check size={16} className="text-blue-500 shrink-0 mt-0.5" /> <span>ติดตามความคืบหน้าของการเรียนและประเมินผลสำหรับผู้เรียนใน Cohort</span></li>
                <li className="flex gap-3"><Check size={16} className="text-blue-500 shrink-0 mt-0.5" /> <span>ตรวจสอบประวัติการศึกษา ประวัติฝึกอบรม และไฟล์แนบของสมาชิก Cohort</span></li>
                <li className="flex gap-3"><Check size={16} className="text-blue-500 shrink-0 mt-0.5" /> <span>จัดการเป้าหมายและประเมินระดับคะแนนสะสมของผู้เรียนในกลุ่ม</span></li>
              </ul>
            </div>

          </div>
        </section>

        {/* Section 2: Course-specific Roles */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8 border-l-4 border-purple-500 pl-4">
            <BookOpen className="text-purple-400" size={28} />
            <h2 className="text-2xl font-black text-white">สิทธิ์เฉพาะภายในหลักสูตร (Course-specific Roles)</h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            
            {/* Course Owner */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-md hover:border-purple-500/30 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-[4px] bg-purple-500" />
              <div className="flex items-start justify-between mb-4">
                <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-purple-500/10 text-purple-400 uppercase tracking-wider">
                  Course Owner
                </span>
                <Award className="text-purple-400/80" size={22} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">เจ้าของหลักสูตร / เจ้าของวิชา</h3>
              <p className="text-sm font-semibold text-slate-400 mb-6 pb-4 border-b border-slate-800/60">
                ขอบเขตข้อมูล: <span className="text-white">จัดการหลักสูตรที่ตนเองเป็นเจ้าของ (Full Course Access)</span>
              </p>
              <ul className="space-y-3.5 text-sm text-slate-300">
                <li className="flex gap-3"><Check size={16} className="text-purple-500 shrink-0 mt-0.5" /> <span>สิทธิ์สูงสุดภายในวิชา: สามารถแก้ไขข้อมูลหลักสูตรและตั้งค่าหลักสูตรทั้งหมดได้</span></li>
                <li className="flex gap-3"><Check size={16} className="text-purple-500 shrink-0 mt-0.5" /> <span>เพิ่ม ลบ หรือแต่งตั้งผู้สอนหลัก (Instructor) และผู้ช่วยสอน (Trainer) เข้าสู่วิชา</span></li>
                <li className="flex gap-3"><Check size={16} className="text-purple-500 shrink-0 mt-0.5" /> <span>สร้าง ปรับปรุง ลำดับบทเรียน และจัดการคลังแบบทดสอบในหลักสูตร</span></li>
                <li className="flex gap-3"><Check size={16} className="text-purple-500 shrink-0 mt-0.5" /> <span>ดูรายงานสถิติ คะแนนสอบ และอนุมัติใบรับรองอิเล็กทรอนิกส์ (E-Certificates)</span></li>
                <li className="flex gap-3"><Check size={16} className="text-purple-500 shrink-0 mt-0.5" /> <span>อนุมัติเนื้อหาและเผยแพร่หลักสูตรเมื่อพร้อมให้บริการ</span></li>
              </ul>
            </div>

            {/* Main Instructor */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-md hover:border-teal-500/30 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-[4px] bg-teal-500" />
              <div className="flex items-start justify-between mb-4">
                <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-teal-500/10 text-teal-400 uppercase tracking-wider">
                  Main Instructor
                </span>
                <BookOpen className="text-teal-400/80" size={22} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">ผู้สอนหลัก / อาจารย์ผู้สอน</h3>
              <p className="text-sm font-semibold text-slate-400 mb-6 pb-4 border-b border-slate-800/60">
                ขอบเขตข้อมูล: <span className="text-white">เนื้อหาหลักสูตรและผลการเรียน (Limited Management)</span>
              </p>
              <ul className="space-y-3.5 text-sm text-slate-300">
                <li className="flex gap-3"><Check size={16} className="text-teal-500 shrink-0 mt-0.5" /> <span>สร้างและจัดการเนื้อหาบทเรียน อัปโหลดสื่อการเรียนการสอน (วิดีโอ, PDF, ไฟล์แนบ)</span></li>
                <li className="flex gap-3"><Check size={16} className="text-teal-500 shrink-0 mt-0.5" /> <span>แก้ไขแบบทดสอบ ข้อสอบ และเกณฑ์การประเมินผลสัมฤทธิ์การเรียน</span></li>
                <li className="flex gap-3"><Check size={16} className="text-teal-500 shrink-0 mt-0.5" /> <span>ตรวจสอบและให้คะแนนการทดสอบ ความคืบหน้า และประวัติผู้เรียนรายบุคคล</span></li>
                <li className="flex gap-3"><Check size={16} className="text-teal-500 shrink-0 mt-0.5" /> <span>ไม่สามารถลบหลักสูตรหรือเปลี่ยนสิทธิ์/ถอนตัวเจ้าของวิชาหลักสูตรได้</span></li>
              </ul>
            </div>

            {/* Assistant Instructor / Trainer */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-md hover:border-slate-700/60 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-[4px] bg-slate-600" />
              <div className="flex items-start justify-between mb-4">
                <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-slate-800 text-slate-400 uppercase tracking-wider">
                  Assistant / Trainer
                </span>
                <HelpCircle className="text-slate-400" size={22} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">ผู้ช่วยสอน / วิทยากรผู้ช่วย</h3>
              <p className="text-sm font-semibold text-slate-400 mb-6 pb-4 border-b border-slate-800/60">
                ขอบเขตข้อมูล: <span className="text-white">ดูข้อมูลหลักสูตรและผลการเรียน (Read-only Access)</span>
              </p>
              <ul className="space-y-3.5 text-sm text-slate-300">
                <li className="flex gap-3"><Check size={16} className="text-slate-500 shrink-0 mt-0.5" /> <span>เข้าดูเนื้อหา บทเรียน และสถิติต่างๆ ในหลักสูตรได้</span></li>
                <li className="flex gap-3"><Check size={16} className="text-slate-500 shrink-0 mt-0.5" /> <span>เรียกดูรายชื่อผู้เรียน ตรวจสอบคะแนนสอบ และดูประวัติการส่งงานของผู้เรียน</span></li>
                <li className="flex gap-3"><Check size={16} className="text-slate-500 shrink-0 mt-0.5" /> <span>ตอบข้อซักถามในบทเรียน คอยอำนวยความสะดวกแก่ผู้เรียน</span></li>
                <li className="flex gap-3"><Check size={16} className="text-slate-500 shrink-0 mt-0.5" /> <span>ไม่สามารถแก้ไขข้อมูลวิชา โครงสร้างบทเรียน หรือข้อสอบได้</span></li>
              </ul>
            </div>

            {/* User / Learner */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-md hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-[4px] bg-emerald-500" />
              <div className="flex items-start justify-between mb-4">
                <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-emerald-500/10 text-emerald-400 uppercase tracking-wider">
                  User / Learner
                </span>
                <Users className="text-emerald-400/80" size={22} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">ผู้เรียนทั่วไป / พนักงาน</h3>
              <p className="text-sm font-semibold text-slate-400 mb-6 pb-4 border-b border-slate-800/60">
                ขอบเขตข้อมูล: <span className="text-white">ข้อมูลการเรียนของตนเองเท่านั้น (Personal Portal)</span>
              </p>
              <ul className="space-y-3.5 text-sm text-slate-300">
                <li className="flex gap-3"><Check size={16} className="text-emerald-500 shrink-0 mt-0.5" /> <span>เข้าใช้พอร์ทัลหลัก สมัครและเข้าเรียนในวิชาที่สอดคล้องกับกอง/ตำแหน่ง/Cohort</span></li>
                <li className="flex gap-3"><Check size={16} className="text-emerald-500 shrink-0 mt-0.5" /> <span>เข้าศึกษา ทำการเรียนการสอนผ่านสื่อผสม และดาวน์โหลดเอกสารประกอบการเรียน</span></li>
                <li className="flex gap-3"><Check size={16} className="text-emerald-500 shrink-0 mt-0.5" /> <span>ทำแบบทดสอบและประเมินผลเพื่อปลดล็อคบทเรียนและรับแต้มสะสม</span></li>
                <li className="flex gap-3"><Check size={16} className="text-emerald-500 shrink-0 mt-0.5" /> <span>รับใบประกาศนียบัตรออนไลน์และเก็บลงในประวัติการฝึกอบรมส่วนตัว</span></li>
                <li className="flex gap-3"><Check size={16} className="text-emerald-500 shrink-0 mt-0.5" /> <span>สะสมแต้มการเรียนเพื่อนำไปใช้แลกของรางวัลใน Points Store</span></li>
              </ul>
            </div>

          </div>
        </section>

        {/* Summary Info */}
        <footer className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 sm:p-8 backdrop-blur-md">
          <h4 className="text-lg font-bold text-indigo-400 mb-4 flex items-center gap-2">
            <HelpCircle size={20} />
            ความสัมพันธ์ระหว่างสิทธิ์หลักและสิทธิ์รอง
          </h4>
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>
              1. <strong className="text-white">การยกระดับสิทธิ์แบบอิงตำแหน่ง (Tiers)</strong>: หากพนักงานมีตำแหน่งที่เป็นหัวหน้ากอง (เช่น Director) ระบบจะตรวจจับค่า <code className="bg-slate-950 px-1.5 py-0.5 rounded text-indigo-300 text-xs">accessAdmin: true</code> จากตาราง Tier แล้วยกสิทธิ์ในระดับระบบขึ้นเป็น <strong className="text-white">Manager</strong> โดยอัตโนมัติเพื่อให้สามารถเข้าห้องหลังบ้านได้ทันที
            </p>
            <p>
              2. <strong className="text-white">การยกระดับสิทธิ์แบบอิงผู้ดูแล Cohort (Cohort Supervisor)</strong>: สิทธิ์ระบบจะถูกจำกัดเฉพาะกลุ่ม และล็อคสิทธิ์ตามตำแหน่งงานของผู้ดูแล Cohort คนนั้นโดยตรง
            </p>
            <p>
              3. <strong className="text-white">สิทธิ์ในรายวิชา (Course-level Permissions)</strong>: จะมีอำนาจเหนือกว่าในระดับบทเรียนนั้นๆ แม้ผู้ใช้จะเป็นระดับ User ทั่วไป แต่หากถูกแต่งตั้งให้เป็น Owner หรือ Instructor ในวิชานั้นๆ ก็จะมีปุ่มเมนูจัดการวิชาขึ้นมาเฉพาะวิชาที่ดูแล
            </p>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-800/60 text-center">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-sm font-black text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              กลับสู่ระบบการเรียนรู้
              <Check size={16} />
            </Link>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default UserPermissionGuide;
