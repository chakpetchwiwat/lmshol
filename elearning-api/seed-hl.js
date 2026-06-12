/**
 * seed-hl.js — Holy Land Learning System Demo Data
 * รัน: node seed-hl.js (ใน directory elearning-api/)
 * ต้อง: DATABASE_URL ใน .env หรือ environment
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');


const prisma = new PrismaClient();

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPARTMENTS = ['HLA', 'HLB', 'HLS'];

const TIERS = [
  { name: 'SDL - Subdistrict Leader (หัวหน้าแขวง)', order: 1 },
  { name: 'UL - Unit Leader (หัวหน้าหน่วย)', order: 2 },
  { name: 'CL - Care Leader (หัวหน้าแคร์)', order: 3 },
  { name: 'SP - Shepherd (พี่เลี้ยง)', order: 4 },
  { name: 'NSP - New Shepherd (ว่าที่พี่เลี้ยง)', order: 5 },
  { name: 'MB - Member (สมาชิก)', order: 6 },
  { name: 'NB - New Believer (ผู้เชื่อใหม่)', order: 7 },
];

const COHORT_ROLES = [
  { key: 'sdl-group', name: 'SDL Group (ผู้นำแขวง)', group: 'ผู้นำ', order: 1 },
  { key: 'ul-group', name: 'UL Group (ผู้นำหน่วย)', group: 'ผู้นำ', order: 2 },
  { key: 'cl-group', name: 'CL Group (ผู้นำแคร์)', group: 'ผู้นำ', order: 3 },
  { key: 'sp-group', name: 'SP Group (พี่เลี้ยง)', group: 'ผู้นำ', order: 4 },
];

const CATEGORIES = [
  // คำเทศนา
  { name: 'คำเทศนา - พระธรรมโยชูวา', type: 'SERMON', icon: 'BookOpen', order: 1, visibleToAll: true },
  { name: 'คำเทศนา - Topical (Friend)', type: 'SERMON', icon: 'Heart', order: 2, visibleToAll: true },
  { name: 'คำเทศนา - Topical (Love)', type: 'SERMON', icon: 'Heart', order: 3, visibleToAll: true },
  { name: 'คำเทศนา - Topical (New Life)', type: 'SERMON', icon: 'Sparkles', order: 4, visibleToAll: true },
  { name: 'คำเทศนา - อื่นๆ', type: 'SERMON', icon: 'Mic', order: 5, visibleToAll: true },
  // HL Empowerment
  { name: 'HL Empowerment', type: 'EMPOWERMENT', icon: 'Zap', order: 6, visibleToAll: true },
  // ศึกษาพระคัมภีร์ - HLBS
  { name: 'HLBS - ชั้น Beginning', type: 'BIBLE_STUDY', icon: 'GraduationCap', order: 7, visibleToAll: true },
  { name: 'HLBS - ชั้น Basic', type: 'BIBLE_STUDY', icon: 'GraduationCap', order: 8, visibleToAll: true },
  // ศึกษาพระคัมภีร์ - HLBC+Camp
  { name: 'HLBC - ชุมชนแห่งการสามัคคีธรรม', type: 'BIBLE_STUDY', icon: 'Users', order: 9, visibleToAll: true },
  { name: 'HLBC - การทรงเรียก', type: 'BIBLE_STUDY', icon: 'Star', order: 10, visibleToAll: true },
  { name: 'HLBC - ชุมชนที่มีพลัง', type: 'BIBLE_STUDY', icon: 'Flame', order: 11, visibleToAll: true },
  { name: 'HLBC - ชุมชนที่เติบโตอย่างยั่งยืน', type: 'BIBLE_STUDY', icon: 'TrendingUp', order: 12, visibleToAll: true },
  // ชั้นสร้าง
  { name: 'ชั้นสร้าง - พล.', type: 'BUILD_CLASS', icon: 'Layers', order: 13, visibleToAll: false },
  { name: 'ชั้นสร้าง - CL', type: 'BUILD_CLASS', icon: 'Layers', order: 14, visibleToAll: false },
  { name: 'Welcome Lesson', type: 'WELCOME', icon: 'DoorOpen', order: 15, visibleToAll: true },
  // คลัง
  { name: 'คลังเลด 1:1', type: 'RESOURCE', icon: 'BookMarked', order: 16, visibleToAll: false },
  { name: 'คลังบทเรียน Care', type: 'RESOURCE', icon: 'Heart', order: 17, visibleToAll: false },
  { name: 'คลังตัวอย่าง', type: 'RESOURCE', icon: 'Archive', order: 18, visibleToAll: false },
  { name: 'คลังคำพยาน', type: 'RESOURCE', icon: 'Mic', order: 19, visibleToAll: true },
];

// แต่ละคอร์ส: { title, categoryName, description, lessons: [{type, title, ...}] }
const COURSES_DATA = [
  // ─── Welcome Lesson ───────────────────────────────────
  {
    categoryName: 'Welcome Lesson',
    title: 'ยินดีต้อนรับสู่ Holy Land Community',
    description: 'บทเรียนแรกสำหรับผู้เชื่อใหม่ ทำความรู้จักกับชุมชน Holy Land และก้าวแรกแห่งชีวิตใหม่',
    points: 50,
    lessons: [
      { type: 'video', title: 'HL คืออะไร? ทำไมถึงมาที่นี่', order: 1 },
      { type: 'video', title: 'ครอบครัว Holy Land และโครงสร้างชุมชน', order: 2 },
      { type: 'quiz', title: 'ทำความรู้จัก HL — แบบทดสอบ', order: 3, passScore: 60,
        questions: [
          { text: 'HL ย่อมาจากอะไร?', choices: [
            { text: 'Holy Land', isCorrect: true },
            { text: 'Holy Life', isCorrect: false },
            { text: 'Happy Living', isCorrect: false },
          ]},
          { text: 'CL ย่อมาจากอะไร?', choices: [
            { text: 'Care Leader', isCorrect: true },
            { text: 'Church Leader', isCorrect: false },
            { text: 'Community Level', isCorrect: false },
          ]},
          { text: 'ระดับผู้นำสูงสุดของแขวงคือ?', choices: [
            { text: 'SDL - Subdistrict Leader', isCorrect: true },
            { text: 'UL - Unit Leader', isCorrect: false },
            { text: 'CL - Care Leader', isCorrect: false },
          ]},
        ],
      },
    ],
  },

  // ─── HLBS Beginning ───────────────────────────────────
  {
    categoryName: 'HLBS - ชั้น Beginning',
    title: 'HLBS ชั้น Beginning — รากฐานแห่งความเชื่อ',
    description: 'ศึกษาพื้นฐานความเชื่อคริสเตียน: พระเจ้าคือใคร พระเยซูคือใคร และความรอดคืออะไร',
    points: 150,
    lessons: [
      { type: 'video', title: 'บทที่ 1 — พระเจ้าคือใคร?', order: 1 },
      { type: 'video', title: 'บทที่ 2 — พระเยซูคริสต์และความรอด', order: 2 },
      { type: 'video', title: 'บทที่ 3 — พระวิญญาณบริสุทธิ์', order: 3 },
      { type: 'quiz', title: 'แบบทดสอบ Beginning — ทบทวนบทที่ 1-3', order: 4, passScore: 70,
        questions: [
          { text: 'ลักษณะสำคัญของพระเจ้าคือ?', choices: [
            { text: 'ทรงรัก ทรงยุติธรรม และทรงสัตย์ซื่อ', isCorrect: true },
            { text: 'ทรงน่ากลัวและทรงพิพากษา', isCorrect: false },
            { text: 'ทรงเป็นกลางและไม่ยุ่งเกี่ยวกับมนุษย์', isCorrect: false },
          ]},
          { text: 'ความรอดได้มาโดย?', choices: [
            { text: 'ความเชื่อในพระเยซูคริสต์', isCorrect: true },
            { text: 'การทำความดีมากพอ', isCorrect: false },
            { text: 'การบริจาคเงินในโบสถ์', isCorrect: false },
          ]},
          { text: 'พระวิญญาณบริสุทธิ์ทำหน้าที่อะไร?', choices: [
            { text: 'นำทาง เสริมกำลัง และประทับในชีวิตผู้เชื่อ', isCorrect: true },
            { text: 'ลงโทษผู้ที่ทำผิด', isCorrect: false },
            { text: 'แสดงให้เห็นด้วยปาฏิหาริย์เท่านั้น', isCorrect: false },
          ]},
        ],
      },
      { type: 'assessment', title: 'Assignment — สะท้อนความคิด: พระเจ้าในชีวิตของฉัน', order: 5 },
    ],
  },

  // ─── HLBS Basic ───────────────────────────────────────
  {
    categoryName: 'HLBS - ชั้น Basic',
    title: 'HLBS ชั้น Basic — เติบโตในความเชื่อ',
    description: 'เรียนรู้การใช้ชีวิตคริสเตียนอย่างเป็นปฏิบัติ: การอธิษฐาน การอ่านพระคัมภีร์ และการสามัคคีธรรม',
    points: 200,
    lessons: [
      { type: 'video', title: 'บทที่ 1 — ศิลปะการอธิษฐาน', order: 1 },
      { type: 'video', title: 'บทที่ 2 — การอ่านพระคัมภีร์อย่างมีชีวิต', order: 2 },
      { type: 'video', title: 'บทที่ 3 — การสามัคคีธรรมในชุมชน', order: 3 },
      { type: 'video', title: 'บทที่ 4 — การให้ทศางค์และเครื่องบูชา', order: 4 },
      { type: 'quiz', title: 'แบบทดสอบ Basic — วิถีชีวิตคริสเตียน', order: 5, passScore: 70,
        questions: [
          { text: 'การอธิษฐาน ACTS คือ?', choices: [
            { text: 'Adoration, Confession, Thanksgiving, Supplication', isCorrect: true },
            { text: 'Ask, Call, Trust, Submit', isCorrect: false },
            { text: 'Amen, Christ, Trinity, Spirit', isCorrect: false },
          ]},
          { text: 'ทำไมการสามัคคีธรรมจึงสำคัญ?', choices: [
            { text: 'เสริมสร้างกัน ดูแลกัน และเติบโตร่วมกัน', isCorrect: true },
            { text: 'เพื่อให้โบสถ์มีสมาชิกมากขึ้น', isCorrect: false },
            { text: 'เป็นข้อบังคับของศาสนา', isCorrect: false },
          ]},
          { text: 'ทศางค์หมายถึง?', choices: [
            { text: '10% ของรายได้ที่ถวายแด่พระเจ้า', isCorrect: true },
            { text: 'การบริจาคตามใจสมัคร', isCorrect: false },
            { text: 'ค่าธรรมเนียมสมาชิกรายเดือน', isCorrect: false },
          ]},
        ],
      },
      { type: 'assessment', title: 'Assignment — บันทึกการอธิษฐาน 7 วัน', order: 6 },
    ],
  },

  // ─── HLBC ─────────────────────────────────────────────
  {
    categoryName: 'HLBC - ชุมชนแห่งการสามัคคีธรรม',
    title: 'HLBC — ชุมชนแห่งการสามัคคีธรรม',
    description: 'เรียนรู้ความหมายที่แท้จริงของชุมชนคริสเตียน และการสร้างสัมพันธ์ที่ยั่งยืนในชุมชน',
    points: 200,
    lessons: [
      { type: 'video', title: 'ชุมชนคืออะไร? เหตุใดจึงสำคัญ', order: 1 },
      { type: 'video', title: 'รูปแบบชุมชนในพระคัมภีร์', order: 2 },
      { type: 'quiz', title: 'แบบทดสอบ — ชุมชนแห่งการสามัคคีธรรม', order: 3, passScore: 70,
        questions: [
          { text: 'ชุมชนคริสเตียนในกิจการ 2 มีลักษณะอย่างไร?', choices: [
            { text: 'แบ่งปัน อธิษฐาน และรับประทานร่วมกัน', isCorrect: true },
            { text: 'แยกตัวจากสังคมภายนอก', isCorrect: false },
            { text: 'เน้นพิธีกรรมและระเบียบแบบแผน', isCorrect: false },
          ]},
        ],
      },
      { type: 'assessment', title: 'Assignment — วางแผนการดูแลสมาชิกในแคร์', order: 4 },
    ],
  },

  {
    categoryName: 'HLBC - การทรงเรียก',
    title: 'HLBC — การทรงเรียกของพระเจ้า',
    description: 'ค้นพบการทรงเรียกส่วนตัวและเข้าใจแผนการของพระเจ้าสำหรับชีวิตคุณ',
    points: 200,
    lessons: [
      { type: 'video', title: 'การทรงเรียกคืออะไร?', order: 1 },
      { type: 'video', title: 'ค้นพบของประทานและพรสวรรค์', order: 2 },
      { type: 'quiz', title: 'แบบทดสอบ — การทรงเรียก', order: 3, passScore: 70,
        questions: [
          { text: 'การทรงเรียกของพระเจ้าประกอบด้วยอะไร?', choices: [
            { text: 'การรับใช้ด้วยของประทานที่เรามี ณ ที่ที่เราอยู่', isCorrect: true },
            { text: 'เฉพาะผู้ที่เป็นนักเทศน์หรือมิชชั่นนารีเท่านั้น', isCorrect: false },
            { text: 'การออกไปต่างประเทศเพื่อประกาศ', isCorrect: false },
          ]},
        ],
      },
      { type: 'assessment', title: 'Assignment — แผนที่การรับใช้ส่วนตัว', order: 4 },
    ],
  },

  {
    categoryName: 'HLBC - ชุมชนที่มีพลัง',
    title: 'HLBC — ชุมชนที่มีพลัง',
    description: 'เรียนรู้ว่าอะไรทำให้ชุมชนมีพลังทางวิญญาณ และวิธีสร้างบรรยากาศที่พระวิญญาณทรงเคลื่อนไหว',
    points: 250,
    lessons: [
      { type: 'video', title: 'แหล่งพลังของชุมชนคริสเตียน', order: 1 },
      { type: 'video', title: 'การนมัสการและการอธิษฐานร่วมกัน', order: 2 },
      { type: 'quiz', title: 'แบบทดสอบ — ชุมชนที่มีพลัง', order: 3, passScore: 70,
        questions: [
          { text: 'พลังของชุมชนคริสเตียนมาจาก?', choices: [
            { text: 'พระวิญญาณบริสุทธิ์ที่ทรงสถิตในชุมชน', isCorrect: true },
            { text: 'จำนวนสมาชิกที่มาก', isCorrect: false },
            { text: 'งบประมาณและทรัพยากรขององค์กร', isCorrect: false },
          ]},
        ],
      },
    ],
  },

  {
    categoryName: 'HLBC - ชุมชนที่เติบโตอย่างยั่งยืน',
    title: 'HLBC — ชุมชนที่เติบโตอย่างยั่งยืน',
    description: 'หลักการสร้างชุมชนที่เติบโตอย่างสุขภาพดีและยั่งยืน ทั้งเชิงคุณภาพและปริมาณ',
    points: 250,
    lessons: [
      { type: 'video', title: 'ความหมายของการเติบโตอย่างยั่งยืน', order: 1 },
      { type: 'video', title: 'วงจรชีวิตของชุมชน', order: 2 },
      { type: 'quiz', title: 'แบบทดสอบ — การเติบโตอย่างยั่งยืน', order: 3, passScore: 70,
        questions: [
          { text: 'ตัวชี้วัดสุขภาพของชุมชนคือ?', choices: [
            { text: 'ความเชื่อ ความสัมพันธ์ และผลผลิตทางวิญญาณ', isCorrect: true },
            { text: 'จำนวนคนในที่ประชุม', isCorrect: false },
            { text: 'เงินในกล่องถวาย', isCorrect: false },
          ]},
        ],
      },
      { type: 'assessment', title: 'Assignment — ประเมินสุขภาพแคร์ของคุณ', order: 4 },
    ],
  },

  // ─── ชั้นสร้าง ─────────────────────────────────────────
  {
    categoryName: 'ชั้นสร้าง - CL',
    title: 'ชั้นสร้าง CL — การเป็นผู้นำแคร์ที่มีประสิทธิภาพ',
    description: 'หลักสูตรเตรียมผู้นำแคร์: บทบาท CL, การดูแลสมาชิก, การเลด 1:1 และการสร้างแคร์ที่แข็งแกร่ง',
    points: 300,
    lessons: [
      { type: 'video', title: 'บทบาทและหน้าที่ของ Care Leader', order: 1 },
      { type: 'video', title: 'การเลด 1:1 อย่างมีประสิทธิภาพ', order: 2 },
      { type: 'video', title: 'การจัดการกับสถานการณ์ยาก', order: 3 },
      { type: 'quiz', title: 'แบบทดสอบ — ทักษะ CL', order: 4, passScore: 75,
        questions: [
          { text: 'เมื่อสมาชิกในแคร์มีปัญหา CL ควรทำอะไรก่อน?', choices: [
            { text: 'รับฟังอย่างตั้งใจและอธิษฐานร่วมกัน', isCorrect: true },
            { text: 'ให้คำแนะนำทันที', isCorrect: false },
            { text: 'ส่งต่อให้ผู้นำระดับสูงทันที', isCorrect: false },
          ]},
          { text: 'การเลด 1:1 ควรทำบ่อยแค่ไหน?', choices: [
            { text: 'อย่างน้อยเดือนละ 1 ครั้งต่อสมาชิก', isCorrect: true },
            { text: 'เมื่อมีปัญหาเท่านั้น', isCorrect: false },
            { text: 'ปีละ 1 ครั้ง', isCorrect: false },
          ]},
        ],
      },
      { type: 'assessment', title: 'Assignment — แผนการดูแลสมาชิกรายบุคคล 3 เดือน', order: 5 },
    ],
  },

  {
    categoryName: 'ชั้นสร้าง - พล.',
    title: 'ชั้นสร้าง พล. — การเป็นผู้นำหน่วยและแขวง',
    description: 'หลักสูตรสำหรับ UL/SDL: การบริหารหน่วย การ Mentor CL และการวางแผนเชิงกลยุทธ์สำหรับชุมชน',
    points: 350,
    lessons: [
      { type: 'video', title: 'วิสัยทัศน์ผู้นำระดับกลางและสูง', order: 1 },
      { type: 'video', title: 'การ Mentor และพัฒนาผู้นำรุ่นต่อไป', order: 2 },
      { type: 'video', title: 'การวางแผนเชิงกลยุทธ์ชุมชน', order: 3 },
      { type: 'quiz', title: 'แบบทดสอบ — ทักษะผู้นำ พล.', order: 4, passScore: 75,
        questions: [
          { text: 'หน้าที่หลักของ Unit Leader คือ?', choices: [
            { text: 'พัฒนาและสนับสนุน Care Leader ในหน่วย', isCorrect: true },
            { text: 'ดูแลสมาชิกโดยตรงทุกคน', isCorrect: false },
            { text: 'จัดการงานธุรการขององค์กร', isCorrect: false },
          ]},
        ],
      },
      { type: 'assessment', title: 'Assignment — แผนพัฒนาหน่วยประจำไตรมาส', order: 5 },
    ],
  },

  // ─── คำเทศนา ───────────────────────────────────────────
  {
    categoryName: 'คำเทศนา - พระธรรมโยชูวา',
    title: 'พระธรรมโยชูวา — ผู้นำที่พระเจ้าเลือก',
    description: 'ศึกษาชีวิตและความเชื่อของโยชูวา บทเรียนสำหรับผู้นำในทุกยุค',
    points: 100,
    lessons: [
      { type: 'video', title: 'โยชูวา 1 — จงเข้มแข็งและกล้าหาญ', order: 1 },
      { type: 'video', title: 'โยชูวา 3-4 — ข้ามแม่น้ำจอร์แดน', order: 2 },
      { type: 'quiz', title: 'แบบทดสอบ — พระธรรมโยชูวา', order: 3, passScore: 60,
        questions: [
          { text: 'โยชูวา 1:9 กล่าวว่า?', choices: [
            { text: 'จงเข้มแข็งและกล้าหาญ อย่ากลัวหรือย่อท้อ', isCorrect: true },
            { text: 'จงรักพระเจ้าด้วยสุดใจสุดจิต', isCorrect: false },
            { text: 'จงทำดีต่อคนที่เกลียดชังเจ้า', isCorrect: false },
          ]},
        ],
      },
    ],
  },

  {
    categoryName: 'คำเทศนา - Topical (New Life)',
    title: 'Topical — ชีวิตใหม่ในพระคริสต์',
    description: 'ซีรีส์เรื่องการเริ่มต้นชีวิตใหม่ การเปลี่ยนแปลงจากภายใน และอัตลักษณ์ใหม่ในพระคริสต์',
    points: 100,
    lessons: [
      { type: 'video', title: 'คุณเป็นใครในพระคริสต์?', order: 1 },
      { type: 'video', title: 'ทิ้งชีวิตเก่า รับชีวิตใหม่', order: 2 },
      { type: 'quiz', title: 'แบบทดสอบ — ชีวิตใหม่', order: 3, passScore: 60,
        questions: [
          { text: '2 โครินธ์ 5:17 สอนว่า?', choices: [
            { text: 'ถ้าใครอยู่ในพระคริสต์ เขาเป็นคนใหม่แล้ว', isCorrect: true },
            { text: 'จงรักเพื่อนบ้านเหมือนรักตัวเอง', isCorrect: false },
            { text: 'เราทำได้ทุกอย่างโดยอาศัยพระคริสต์', isCorrect: false },
          ]},
        ],
      },
    ],
  },

  // ─── HL Empowerment ────────────────────────────────────
  {
    categoryName: 'HL Empowerment',
    title: 'HL Empowerment — เสริมพลังชีวิตและการรับใช้',
    description: 'หลักสูตรเสริมพลังสำหรับสมาชิก HL: การใช้ของประทาน ชีวิตอธิษฐาน และการรับใช้ด้วยใจรัก',
    points: 150,
    lessons: [
      { type: 'video', title: 'ค้นพบของประทานฝ่ายวิญญาณ', order: 1 },
      { type: 'video', title: 'การอธิษฐานที่ทะลุฟ้า', order: 2 },
      { type: 'video', title: 'รับใช้ด้วยใจรัก ไม่ใช่ภาระผูกพัน', order: 3 },
      { type: 'quiz', title: 'แบบทดสอบ — HL Empowerment', order: 4, passScore: 65,
        questions: [
          { text: 'ของประทานฝ่ายวิญญาณมีไว้เพื่ออะไร?', choices: [
            { text: 'สร้างเสริมคริสตจักรและรับใช้ผู้อื่น', isCorrect: true },
            { text: 'แสดงความยิ่งใหญ่ส่วนตัว', isCorrect: false },
            { text: 'แยกแยะผู้เชื่อจากผู้ไม่เชื่อ', isCorrect: false },
          ]},
        ],
      },
    ],
  },

  // ─── คลังตัวอย่าง ─────────────────────────────────────
  {
    categoryName: 'คลังเลด 1:1',
    title: 'คู่มือการเลด 1:1 — ฉบับ SP/CL',
    description: 'แนวทางและเครื่องมือสำหรับการทำ 1:1 อย่างมีประสิทธิภาพ พร้อมตัวอย่างคำถามและ flow การสนทนา',
    points: 0,
    lessons: [
      { type: 'video', title: 'วิธีเริ่มต้นการเลด 1:1 ครั้งแรก', order: 1 },
      { type: 'video', title: 'คำถาม GROW Model สำหรับ 1:1', order: 2 },
    ],
  },

  {
    categoryName: 'คลังบทเรียน Care',
    title: 'คลังบทเรียน Care — สำหรับผู้นำแคร์',
    description: 'รวมบทเรียนและแนวทางการนำ Care Group ที่มีชีวิตชีวา',
    points: 0,
    lessons: [
      { type: 'video', title: 'นำ Care Group แบบมีส่วนร่วม', order: 1 },
      { type: 'video', title: 'จัดการกับสมาชิกที่เงียบและสมาชิกที่พูดมาก', order: 2 },
    ],
  },

  {
    categoryName: 'คลังคำพยาน',
    title: 'คำพยาน — ชีวิตที่เปลี่ยนแปลง',
    description: 'รวบรวมคำพยานจากสมาชิก HL ที่ชีวิตได้รับการเปลี่ยนแปลงจากความเชื่อ',
    points: 0,
    lessons: [
      { type: 'video', title: 'คำพยาน: จากผู้ไม่เชื่อ สู่ผู้นำแคร์', order: 1 },
      { type: 'video', title: 'คำพยาน: พระเจ้าสัตย์ซื่อในวิกฤต', order: 2 },
    ],
  },
];

// ─── Users ────────────────────────────────────────────────────────────────────

function getBirthday(yearsAgo) {
  const baseDate = new Date();
  baseDate.setFullYear(baseDate.getFullYear() - yearsAgo);
  return baseDate;
}

const USERS_DATA = [
  // Admin
  {
    name: 'ผู้ดูแลระบบ HL', email: 'admin@hol.church', permission: 'superadmin',
    dept: 'HLA', tierName: 'SDL - Subdistrict Leader (หัวหน้าแขวง)',
    nickname: 'Admin', birthday: getBirthday(30),
    memberSince: new Date('2020-01-01'),
  },
  // SDL
  {
    name: 'ศจ.สมชาย วิเศษศิลป์', email: 'sdl@hol.church', permission: 'manager',
    dept: 'HLA', tierName: 'SDL - Subdistrict Leader (หัวหน้าแขวง)',
    nickname: 'ศจ.สมชาย', birthday: getBirthday(45),
    waterBaptismDate: new Date('2015-03-15'), spiritBaptismDate: new Date('2015-04-10'),
    memberSince: new Date('2015-01-01'),
  },
  // UL
  {
    name: 'วิไลวรรณ รุ่งเรือง', email: 'ul.hla@hol.church', permission: 'manager',
    dept: 'HLA', tierName: 'UL - Unit Leader (หัวหน้าหน่วย)',
    nickname: 'พี่แวว', birthday: getBirthday(38),
    waterBaptismDate: new Date('2017-06-20'), spiritBaptismDate: new Date('2017-07-05'),
    memberSince: new Date('2017-01-01'),
  },
  {
    name: 'ธนพล ใจดี', email: 'ul.hlb@hol.church', permission: 'manager',
    dept: 'HLB', tierName: 'UL - Unit Leader (หัวหน้าหน่วย)',
    nickname: 'พี่ตั้ม', birthday: getBirthday(36),
    waterBaptismDate: new Date('2018-02-14'), spiritBaptismDate: new Date('2018-03-01'),
    memberSince: new Date('2018-01-01'),
  },
  {
    name: 'อารีย์ บุญส่ง', email: 'ul.hls@hol.church', permission: 'manager',
    dept: 'HLS', tierName: 'UL - Unit Leader (หัวหน้าหน่วย)',
    nickname: 'พี่อ้อย', birthday: getBirthday(39),
    waterBaptismDate: new Date('2019-04-21'), spiritBaptismDate: new Date('2019-05-12'),
    memberSince: new Date('2019-01-01'),
  },
  // CL
  {
    name: 'ศิริพร เจริญผล', email: 'cl1@hol.church', permission: 'manager',
    dept: 'HLA', tierName: 'CL - Care Leader (หัวหน้าแคร์)',
    nickname: 'น้องแจ๊ส', birthday: getBirthday(28),
    waterBaptismDate: new Date('2019-08-10'), spiritBaptismDate: new Date('2019-09-01'),
    memberSince: new Date('2019-06-01'),
  },
  {
    name: 'อภิชาติ มณีโชติ', email: 'cl2@hol.church', permission: 'manager',
    dept: 'HLA', tierName: 'CL - Care Leader (หัวหน้าแคร์)',
    nickname: 'น้องเต้', birthday: getBirthday(29),
    waterBaptismDate: new Date('2020-01-05'), spiritBaptismDate: new Date('2020-02-15'),
    memberSince: new Date('2019-10-01'),
  },
  {
    name: 'ดวงพร ปัญญาสกุล', email: 'cl3@hol.church', permission: 'manager',
    dept: 'HLB', tierName: 'CL - Care Leader (หัวหน้าแคร์)',
    nickname: 'น้องดาว', birthday: getBirthday(27),
    waterBaptismDate: new Date('2020-05-17'), spiritBaptismDate: new Date('2020-06-07'),
    memberSince: new Date('2020-03-01'),
  },
  {
    name: 'เจษฎา รัตนโกสินทร์', email: 'cl4@hol.church', permission: 'manager',
    dept: 'HLS', tierName: 'CL - Care Leader (หัวหน้าแคร์)',
    nickname: 'น้องเจ', birthday: getBirthday(26),
    waterBaptismDate: new Date('2021-03-28'), spiritBaptismDate: new Date('2021-04-18'),
    memberSince: new Date('2021-01-01'),
  },
  // SP
  {
    name: 'ประเสริฐ รักไทย', email: 'sp1@hol.church', permission: 'user',
    dept: 'HLA', tierName: 'SP - Shepherd (พี่เลี้ยง)',
    nickname: 'พี่เสริฐ', birthday: getBirthday(32),
    waterBaptismDate: new Date('2021-07-11'), spiritBaptismDate: new Date('2021-08-01'),
    memberSince: new Date('2021-05-01'),
  },
  {
    name: 'กัญญารัตน์ วงศ์สุวรรณ', email: 'sp2@hol.church', permission: 'user',
    dept: 'HLA', tierName: 'SP - Shepherd (พี่เลี้ยง)',
    nickname: 'พี่กัน', birthday: getBirthday(31),
    waterBaptismDate: new Date('2021-11-20'), spiritBaptismDate: new Date('2021-12-05'),
    memberSince: new Date('2021-09-01'),
  },
  {
    name: 'อานนท์ ถิรวัฒน์', email: 'sp3@hol.church', permission: 'user',
    dept: 'HLB', tierName: 'SP - Shepherd (พี่เลี้ยง)',
    nickname: 'พี่อาร์ต', birthday: getBirthday(33),
    waterBaptismDate: new Date('2022-02-06'), spiritBaptismDate: new Date('2022-03-13'),
    memberSince: new Date('2021-12-01'),
  },
  {
    name: 'สุภาพร เพชรน้ำหนึ่ง', email: 'sp4@hol.church', permission: 'user',
    dept: 'HLS', tierName: 'SP - Shepherd (พี่เลี้ยง)',
    nickname: 'พี่เพชร', birthday: getBirthday(34),
    waterBaptismDate: new Date('2022-06-19'), spiritBaptismDate: new Date('2022-07-10'),
    memberSince: new Date('2022-04-01'),
  },
  // NSP
  {
    name: 'ปกรณ์ สมบูรณ์ทรัพย์', email: 'nsp1@hol.church', permission: 'user',
    dept: 'HLA', tierName: 'NSP - New Shepherd (ว่าที่พี่เลี้ยง)',
    nickname: 'น้องปก', birthday: getBirthday(25),
    waterBaptismDate: new Date('2022-09-04'), spiritBaptismDate: new Date('2022-10-16'),
    memberSince: new Date('2022-07-01'),
  },
  {
    name: 'จินตนา แก้ววิจิตร', email: 'nsp2@hol.church', permission: 'user',
    dept: 'HLB', tierName: 'NSP - New Shepherd (ว่าที่พี่เลี้ยง)',
    nickname: 'น้องจิ๋ว', birthday: getBirthday(26),
    waterBaptismDate: new Date('2022-12-18'), spiritBaptismDate: null,
    memberSince: new Date('2022-10-01'),
  },
  {
    name: 'มานะ ศิริรุ่งโรจน์', email: 'nsp3@hol.church', permission: 'user',
    dept: 'HLS', tierName: 'NSP - New Shepherd (ว่าที่พี่เลี้ยง)',
    nickname: 'น้องมา', birthday: getBirthday(24),
    waterBaptismDate: new Date('2023-03-05'), spiritBaptismDate: null,
    memberSince: new Date('2023-01-01'),
  },
  // MB
  {
    name: 'ยุพา เพชรน้ำหนึ่ง', email: 'mb1@hol.church', permission: 'user',
    dept: 'HLA', tierName: 'MB - Member (สมาชิก)',
    nickname: 'น้องยุ', birthday: getBirthday(23),
    waterBaptismDate: new Date('2023-01-15'), spiritBaptismDate: new Date('2023-02-05'),
    memberSince: new Date('2022-11-01'),
  },
  {
    name: 'ดวงใจ ธรรมคุณ', email: 'mb2@hol.church', permission: 'user',
    dept: 'HLA', tierName: 'MB - Member (สมาชิก)',
    nickname: 'น้องดวง', birthday: getBirthday(22),
    waterBaptismDate: new Date('2023-04-23'), spiritBaptismDate: null,
    memberSince: new Date('2023-02-01'),
  },
  {
    name: 'กนกวรรณ สิริวัฒนา', email: 'mb3@hol.church', permission: 'user',
    dept: 'HLA', tierName: 'MB - Member (สมาชิก)',
    nickname: 'น้องกนก', birthday: getBirthday(25),
    waterBaptismDate: new Date('2023-06-11'), spiritBaptismDate: null,
    memberSince: new Date('2023-04-01'),
  },
  {
    name: 'วิชัย เกียรติขจร', email: 'mb4@hol.church', permission: 'user',
    dept: 'HLB', tierName: 'MB - Member (สมาชิก)',
    nickname: 'น้องวิ', birthday: getBirthday(24),
    waterBaptismDate: new Date('2023-05-14'), spiritBaptismDate: new Date('2023-06-25'),
    memberSince: new Date('2023-03-01'),
  },
  {
    name: 'สมชาย ประเสริฐยิ่ง', email: 'mb5@hol.church', permission: 'user',
    dept: 'HLB', tierName: 'MB - Member (สมาชิก)',
    nickname: 'น้องชาย', birthday: getBirthday(23),
    waterBaptismDate: new Date('2023-07-30'), spiritBaptismDate: null,
    memberSince: new Date('2023-05-01'),
  },
  {
    name: 'รัชนี พงษ์เพชร', email: 'mb6@hol.church', permission: 'user',
    dept: 'HLS', tierName: 'MB - Member (สมาชิก)',
    nickname: 'น้องนี', birthday: getBirthday(22),
    waterBaptismDate: new Date('2023-09-03'), spiritBaptismDate: null,
    memberSince: new Date('2023-07-01'),
  },
  {
    name: 'นที วิเศษศิลป์', email: 'mb7@hol.church', permission: 'user',
    dept: 'HLS', tierName: 'MB - Member (สมาชิก)',
    nickname: 'น้องที', birthday: getBirthday(25),
    waterBaptismDate: new Date('2023-11-12'), spiritBaptismDate: new Date('2023-12-03'),
    memberSince: new Date('2023-09-01'),
  },
  // NB
  {
    name: 'อุษา สมบูรณ์ทรัพย์', email: 'nb1@hol.church', permission: 'user',
    dept: 'HLA', tierName: 'NB - New Believer (ผู้เชื่อใหม่)',
    nickname: 'น้องอุ', birthday: getBirthday(21),
    waterBaptismDate: null, spiritBaptismDate: null,
    memberSince: new Date('2024-01-01'),
  },
  {
    name: 'กวี มณีโชติ', email: 'nb2@hol.church', permission: 'user',
    dept: 'HLB', tierName: 'NB - New Believer (ผู้เชื่อใหม่)',
    nickname: 'น้องกวี', birthday: getBirthday(20),
    waterBaptismDate: null, spiritBaptismDate: null,
    memberSince: new Date('2024-02-01'),
  },
  {
    name: 'รัตนะ ใจดี', email: 'nb3@hol.church', permission: 'user',
    dept: 'HLS', tierName: 'NB - New Believer (ผู้เชื่อใหม่)',
    nickname: 'น้องรัต', birthday: getBirthday(22),
    waterBaptismDate: null, spiritBaptismDate: null,
    memberSince: new Date('2024-03-01'),
  },
];

// ─── Competency ───────────────────────────────────────────────────────────────

const COMPETENCY_TYPES = [
  { code: 'LEADERSHIP', name: 'ทักษะผู้นำ' },
  { code: 'BIBLE_KNOWLEDGE', name: 'ความรู้พระคัมภีร์' },
];

const COMPETENCY_GROUPS = [
  {
    code: 'HL-LEADERSHIP', name: 'ทักษะผู้นำ HL', description: 'ทักษะการเป็นผู้นำและการดูแลสมาชิก', displayOrder: 1,
    categories: [
      {
        code: 'HL-L-BASIC', name: 'ทักษะพื้นฐานสมาชิก', displayOrder: 1,
        competencies: [
          { code: 'HL-C001', name: 'การอธิษฐาน', description: 'ความสามารถในการอธิษฐานส่วนตัวและร่วมกัน' },
          { code: 'HL-C002', name: 'การอ่านพระคัมภีร์', description: 'นิสัยการอ่านและทำความเข้าใจพระคัมภีร์' },
          { code: 'HL-C003', name: 'การสามัคคีธรรม', description: 'การมีส่วนร่วมในชุมชนและการสร้างสัมพันธ์' },
        ],
      },
      {
        code: 'HL-L-CL', name: 'ทักษะผู้นำแคร์', displayOrder: 2,
        competencies: [
          { code: 'HL-C004', name: 'การดูแลสมาชิก', description: 'ความสามารถในการติดตามและดูแลสมาชิกในแคร์' },
          { code: 'HL-C005', name: 'การนำ Care Group', description: 'ทักษะการนำกลุ่มแคร์อย่างมีประสิทธิภาพ' },
          { code: 'HL-C006', name: 'การเลด 1:1', description: 'ความสามารถในการทำ 1:1 Discipleship' },
        ],
      },
      {
        code: 'HL-L-UL', name: 'ทักษะผู้นำหน่วย', displayOrder: 3,
        competencies: [
          { code: 'HL-C007', name: 'การบริหารหน่วย', description: 'การบริหารจัดการ CL หลายกลุ่มในหน่วย' },
          { code: 'HL-C008', name: 'การ Mentor ผู้นำ', description: 'การพัฒนาและสนับสนุนผู้นำระดับล่าง' },
        ],
      },
    ],
  },
  {
    code: 'HL-BIBLE', name: 'ความรู้พระคัมภีร์', description: 'ความรู้จากการศึกษาพระคัมภีร์ตามหลักสูตร HL', displayOrder: 2,
    categories: [
      {
        code: 'HL-B-HLBS', name: 'HLBS', displayOrder: 1,
        competencies: [
          { code: 'HL-B001', name: 'HLBS Beginning', description: 'ผ่านหลักสูตร HLBS ชั้น Beginning' },
          { code: 'HL-B002', name: 'HLBS Basic', description: 'ผ่านหลักสูตร HLBS ชั้น Basic' },
        ],
      },
      {
        code: 'HL-B-HLBC', name: 'HLBC + Camp', displayOrder: 2,
        competencies: [
          { code: 'HL-B003', name: 'HLBC ชุมชนแห่งการสามัคคีธรรม', description: 'ผ่านบทเรียน HLBC ชุมชนแห่งการสามัคคีธรรม' },
          { code: 'HL-B004', name: 'HLBC การทรงเรียก', description: 'ผ่านบทเรียน HLBC การทรงเรียก' },
          { code: 'HL-B005', name: 'HLBC ชุมชนที่มีพลัง', description: 'ผ่านบทเรียน HLBC ชุมชนที่มีพลัง' },
          { code: 'HL-B006', name: 'HLBC ชุมชนที่เติบโตอย่างยั่งยืน', description: 'ผ่านบทเรียน HLBC ชุมชนที่เติบโตอย่างยั่งยืน' },
        ],
      },
    ],
  },
];

// ─── Enrollment Plan: ใครเรียนอะไร ──────────────────────────────────────────
// Returns course titles that this tier should be enrolled in
function getCoursesForTier(tierName) {
  const lower = tierName.toLowerCase();
  const welcome = ['ยินดีต้อนรับสู่ Holy Land Community'];
  const hlbs = ['HLBS ชั้น Beginning — รากฐานแห่งความเชื่อ', 'HLBS ชั้น Basic — เติบโตในความเชื่อ'];
  const hlbc = [
    'HLBC — ชุมชนแห่งการสามัคคีธรรม', 'HLBC — การทรงเรียกของพระเจ้า',
    'HLBC — ชุมชนที่มีพลัง', 'HLBC — ชุมชนที่เติบโตอย่างยั่งยืน',
  ];
  const buildCL = ['ชั้นสร้าง CL — การเป็นผู้นำแคร์ที่มีประสิทธิภาพ'];
  const buildUL = ['ชั้นสร้าง พล. — การเป็นผู้นำหน่วยและแขวง'];
  const sermons = ['พระธรรมโยชูวา — ผู้นำที่พระเจ้าเลือก', 'Topical — ชีวิตใหม่ในพระคริสต์'];
  const empowerment = ['HL Empowerment — เสริมพลังชีวิตและการรับใช้'];

  if (lower.includes('nb')) return welcome;
  if (lower.includes('mb')) return [...welcome, ...hlbs.slice(0, 1), ...sermons.slice(0, 1), ...empowerment];
  if (lower.includes('nsp')) return [...welcome, ...hlbs, ...sermons, ...empowerment];
  if (lower.includes('sp')) return [...welcome, ...hlbs, ...hlbc.slice(0, 2), ...sermons, ...empowerment];
  if (lower.includes('cl')) return [...welcome, ...hlbs, ...hlbc, ...buildCL, ...sermons, ...empowerment];
  if (lower.includes('ul') || lower.includes('sdl')) return [
    ...welcome, ...hlbs, ...hlbc, ...buildCL, ...buildUL, ...sermons, ...empowerment,
  ];
  return welcome;
}

function randomProgress(tierName) {
  const lower = tierName.toLowerCase();
  // Senior leaders mostly completed
  if (lower.includes('sdl') || lower.includes('ul')) {
    return Math.random() < 0.8 ? 100 : Math.floor(Math.random() * 40) + 60;
  }
  if (lower.includes('cl') || lower.includes('sp')) {
    return Math.random() < 0.6 ? 100 : Math.floor(Math.random() * 60) + 30;
  }
  if (lower.includes('nsp')) {
    return Math.random() < 0.4 ? 100 : Math.floor(Math.random() * 70) + 10;
  }
  // MB/NB: mix
  const r = Math.random();
  if (r < 0.3) return 100;
  if (r < 0.6) return Math.floor(Math.random() * 60) + 20;
  return 0; // not started
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const monthsThai = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];
const getJoinedMonthStr = (date) => {
  if (!date) return null;
  const m = date.getMonth();
  return `${monthsThai[m]} ${date.getFullYear()}`;
};

async function main() {
  console.log('\n🌿 Holy Land LMS — Demo Seed Starting...\n');
  const password = await bcrypt.hash('holyland123', 10);

  console.log('🧹 Clearing old data...');
  const tables = [
    'testimony',
    'userCohortSupervisor',
    'cohortRoleSupervisor',
    'userCourseBookmark',
    'userLessonProgress',
    'quizAttempt',
    'userNotification',
    'assessmentSubmission',
    'userCertificateCompetency',
    'userCertificate',
    'courseCompetency',
    'pointsLedger',
    'redeemRequest',
    'goalTargetUser',
    'goalTargetDepartment',
    'goalTargetCohortRole',
    'goalCourse',
    'courseDepartmentAccess',
    'courseTierAccess',
    'courseCohortRoleAccess',
    'categoryDepartmentAccess',
    'categoryTierAccess',
    'choice',
    'question',
    'lesson',
    'announcementChoice',
    'announcementQuestion',
    'announcementView',
    'announcement',
    'userCourse',
    'courseCertificateSetting',
    'certificate',
    'certificateTemplate',
    'course',
    'category',
    'user',
    'department',
    'tier',
    'cohortRole',
    'competencyLegacyCode',
    'competencyLevel',
    'competency',
    'competencyCategory',
    'competencyGroup',
    'competencyType',
    'instructorPreset',
    'organizationPreset',
    'reward',
    'learningGoal'
  ];

  for (const table of tables) {
    try {
      if (prisma[table]) {
        await prisma[table].deleteMany({});
      }
    } catch (e) {
      console.warn(`      ⚠️ Could not clear table: ${table}. Error: ${e.message}`);
    }
  }
  console.log('🧹 Old data cleared!');

  // 1. Departments
  console.log('📁 Creating departments...');
  const deptMap = {};
  for (const d of DEPARTMENTS) {
    const r = await prisma.department.upsert({ where: { name: d }, update: {}, create: { name: d } });
    deptMap[d] = r.id;
    console.log(`   ✓ ${d}`);
  }

  // 2. Tiers
  console.log('🏷️  Creating tiers...');
  const tierMap = {};
  for (const t of TIERS) {
    const r = await prisma.tier.upsert({ where: { name: t.name }, update: { order: t.order }, create: t });
    tierMap[t.name] = r.id;
    console.log(`   ✓ ${t.name}`);
  }

  // 3. CohortRoles
  console.log('👥 Creating cohort roles...');
  const cohortRoleMap = {};
  for (const cr of COHORT_ROLES) {
    const r = await prisma.cohortRole.upsert({
      where: { key: cr.key },
      update: { name: cr.name, group: cr.group, order: cr.order },
      create: cr,
    });
    cohortRoleMap[cr.key] = r.id;
    console.log(`   ✓ ${cr.name}`);
  }

  // 4. Instructor Presets
  console.log('🎤 Creating instructor presets...');
  const presets = [
    {
      name: 'ศจ.สมชาย วิเศษศิลป์',
      role: 'Senior Pastor / SDL',
      bio: 'ผู้นำแขวงที่มีประสบการณ์กว่า 15 ปีในการสร้างชุมชน Holy Land มีพันธกิจในการสร้างผู้นำรุ่นต่อไปผ่านการ Discipleship',
      signatureTitle: 'ศาสนาจารย์อาวุโส Holy Land Church',
    },
    {
      name: 'ทีมผู้นำ HL',
      role: 'HL Leadership Team',
      bio: 'ทีมผู้นำระดับหน่วยและแคร์ที่ผ่านการฝึกอบรม HL Empowerment และชั้นสร้างครบทุกหลักสูตร',
      signatureTitle: 'ทีมผู้นำ Holy Land',
    },
    {
      name: 'วิทยากรรับเชิญพิเศษ',
      role: 'Guest Speaker',
      bio: 'วิทยากรรับเชิญจากภายนอก ผู้เชี่ยวชาญด้านการพัฒนาชุมชนคริสเตียนและภาวะผู้นำ',
      signatureTitle: 'Guest Speaker',
    },
  ];
  const instructorPresetIds = [];
  for (const p of presets) {
    const r = await prisma.instructorPreset.create({ data: p });
    instructorPresetIds.push(r.id);
    console.log(`   ✓ ${p.name}`);
  }

  // 5. Organization Preset
  console.log('🏛️  Creating organization preset...');
  await prisma.organizationPreset.create({
    data: {
      name: 'Holy Land Church (HL)',
      signatureTitle: 'ศาสนาจารย์อาวุโส Holy Land Church',
    },
  });

  // 6. Categories
  console.log('📚 Creating categories...');
  const catMap = {};
  for (const [i, c] of CATEGORIES.entries()) {
    const r = await prisma.category.upsert({
      where: { name: c.name },
      update: { type: c.type, icon: c.icon, order: c.order, visibleToAll: c.visibleToAll },
      create: c,
    });
    catMap[c.name] = r.id;
    console.log(`   ✓ ${c.name}`);
  }

  // 7. Courses + Lessons
  console.log('📖 Creating courses and lessons...');
  const courseMap = {}; // title → id
  for (const courseData of COURSES_DATA) {
    const catId = catMap[courseData.categoryName];
    if (!catId) {
      console.warn(`   ⚠️  Category not found: ${courseData.categoryName}`);
      continue;
    }
    const presetIdx = courseData.categoryName.includes('ชั้นสร้าง') ? 1 : 0;
    const course = await prisma.course.create({
      data: {
        title: courseData.title,
        description: courseData.description,
        categoryId: catId,
        status: 'PUBLISHED',
        points: courseData.points,
        instructorPresetId: instructorPresetIds[presetIdx],
        instructorName: presets[presetIdx].name,
        instructorRole: presets[presetIdx].role,
        visibleToAll: true,
      },
    });
    courseMap[courseData.title] = course.id;
    console.log(`   ✓ [Course] ${courseData.title}`);

    // Lessons
    for (const lesson of courseData.lessons) {
      if (lesson.type === 'quiz' && lesson.questions) {
        await prisma.lesson.create({
          data: {
            courseId: course.id,
            title: lesson.title,
            type: 'quiz',
            order: lesson.order,
            passScore: lesson.passScore || 70,
            questions: {
              create: lesson.questions.map((q, qi) => ({
                text: q.text,
                order: qi + 1,
                points: 1,
                choices: { create: q.choices },
              })),
            },
          },
        });
      } else {
        await prisma.lesson.create({
          data: {
            courseId: course.id,
            title: lesson.title,
            type: lesson.type,
            order: lesson.order,
            content: lesson.type === 'assessment'
              ? 'ส่งงาน Assignment ผ่านการอัปโหลดไฟล์หรือเขียนในช่องด้านล่าง'
              : 'เนื้อหาวีดีโอจะแสดงที่นี่',
          },
        });
      }
    }
  }

  // 8. Competency Tree
  console.log('🎯 Creating competency tree...');
  const compTypeMap = {};
  for (const ct of COMPETENCY_TYPES) {
    const r = await prisma.competencyType.upsert({
      where: { code: ct.code },
      update: { name: ct.name },
      create: ct,
    });
    compTypeMap[ct.code] = r.id;
  }

  for (const grp of COMPETENCY_GROUPS) {
    const group = await prisma.competencyGroup.upsert({
      where: { code: grp.code },
      update: { name: grp.name, description: grp.description, displayOrder: grp.displayOrder },
      create: { code: grp.code, name: grp.name, description: grp.description, displayOrder: grp.displayOrder },
    });

    for (const cat of grp.categories) {
      const category = await prisma.competencyCategory.upsert({
        where: { code: cat.code },
        update: { name: cat.name, displayOrder: cat.displayOrder },
        create: { code: cat.code, name: cat.name, displayOrder: cat.displayOrder, groupId: group.id },
      });

      for (const [ci, comp] of cat.competencies.entries()) {
        await prisma.competency.upsert({
          where: { code: comp.code },
          update: { name: comp.name, description: comp.description },
          create: {
            code: comp.code,
            name: comp.name,
            description: comp.description,
            categoryId: category.id,
            displayOrder: ci + 1,
          },
        });
        console.log(`   ✓ Competency: ${comp.name}`);
      }
    }
  }

  // 9. Users
  console.log('👤 Creating users...');
  const userMap = {}; // email → { id, tierName, dept }
  for (const u of USERS_DATA) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    const data = {
      name: u.name,
      email: u.email,
      password,
      permission: u.permission,
      departmentId: deptMap[u.dept],
      department: u.dept,
      tierId: tierMap[u.tierName],
      employmentDate: u.memberSince,
      nickname: u.nickname || null,
      joinedMonth: u.memberSince ? getJoinedMonthStr(u.memberSince) : null,
      birthday: u.birthday || null,
      waterBaptismDate: u.waterBaptismDate || null,
      spiritBaptismDate: u.spiritBaptismDate || null,
      status: 'ACTIVE',
    };
    let user;
    if (existing) {
      user = await prisma.user.update({ where: { email: u.email }, data });
    } else {
      user = await prisma.user.create({ data });
    }
    userMap[u.email] = { id: user.id, tierName: u.tierName, dept: u.dept };
    console.log(`   ✓ ${u.name} (${u.tierName.split(' - ')[0]})`);
  }

  // 10. Cohort Supervisor Relationships (พี่เลี้ยง/ลูกแกะ)
  console.log('🔗 Creating shepherd/sheep relationships...');
  // SDL → UL Group
  // UL → CL Group
  // CL → SP Group
  // SP → MB Group (+ NB)

  const relationships = [
    // UL HLA supervises CL HLA members
    { supervisorEmail: 'ul.hla@hol.church', cohortRoleKey: 'cl-group', memberEmails: ['cl1@hol.church', 'cl2@hol.church'] },
    // UL HLB supervises CL HLB
    { supervisorEmail: 'ul.hlb@hol.church', cohortRoleKey: 'cl-group', memberEmails: ['cl3@hol.church'] },
    // UL HLS supervises CL HLS
    { supervisorEmail: 'ul.hls@hol.church', cohortRoleKey: 'cl-group', memberEmails: ['cl4@hol.church'] },
    // CL1 (HLA) supervises SP1, NSP1
    { supervisorEmail: 'cl1@hol.church', cohortRoleKey: 'sp-group', memberEmails: ['sp1@hol.church', 'nsp1@hol.church'] },
    // CL2 (HLA) supervises SP2
    { supervisorEmail: 'cl2@hol.church', cohortRoleKey: 'sp-group', memberEmails: ['sp2@hol.church'] },
    // CL3 (HLB) supervises SP3, NSP2
    { supervisorEmail: 'cl3@hol.church', cohortRoleKey: 'sp-group', memberEmails: ['sp3@hol.church', 'nsp2@hol.church'] },
    // CL4 (HLS) supervises SP4, NSP3
    { supervisorEmail: 'cl4@hol.church', cohortRoleKey: 'sp-group', memberEmails: ['sp4@hol.church', 'nsp3@hol.church'] },
    // SP1 (HLA) supervises MB1, MB2
    { supervisorEmail: 'sp1@hol.church', cohortRoleKey: 'sp-group', memberEmails: ['mb1@hol.church', 'mb2@hol.church', 'nb1@hol.church'] },
    // SP2 (HLA) supervises MB3
    { supervisorEmail: 'sp2@hol.church', cohortRoleKey: 'sp-group', memberEmails: ['mb3@hol.church'] },
    // SP3 (HLB) supervises MB4, MB5, NB2
    { supervisorEmail: 'sp3@hol.church', cohortRoleKey: 'sp-group', memberEmails: ['mb4@hol.church', 'mb5@hol.church', 'nb2@hol.church'] },
    // SP4 (HLS) supervises MB6, MB7, NB3
    { supervisorEmail: 'sp4@hol.church', cohortRoleKey: 'sp-group', memberEmails: ['mb6@hol.church', 'mb7@hol.church', 'nb3@hol.church'] },
  ];

  for (const rel of relationships) {
    const supervisorId = userMap[rel.supervisorEmail]?.id;
    const cohortRoleId = cohortRoleMap[rel.cohortRoleKey];
    if (!supervisorId || !cohortRoleId) continue;

    for (const memberEmail of rel.memberEmails) {
      const userId = userMap[memberEmail]?.id;
      if (!userId) continue;
      try {
        await prisma.userCohortSupervisor.create({
          data: { userId, cohortRoleId, supervisorId },
        });
        console.log(`   ✓ ${rel.supervisorEmail.split('@')[0]} → ${memberEmail.split('@')[0]}`);
      } catch (e) {
        // Skip if already exists
      }
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { mentorId: supervisorId }
        });
        console.log(`   ✓ Mentor Set: ${rel.supervisorEmail.split('@')[0]} → ${memberEmail.split('@')[0]}`);
      } catch (e) {
        // Skip if error
      }
    }
  }

  // 10b. Testimonies
  console.log('✍️ Creating testimonies...');
  const testimonies = [
    {
      title: 'พระเจ้าทรงรักษาโรคให้หายอย่างอัศจรรย์',
      content: 'ขอบคุณพระเจ้าสำหรับการรักษาตัวที่ผ่านมา แพทย์แจ้งว่ามีเนื้อร้ายแต่หลังจากพี่น้องในแคร์ร่วมใจอธิษฐานเผื่อและรับการประกาศ ผลตรวจซ้ำกลับไม่พบเนื้อร้ายใดๆ เลย ขอบคุณพระเจ้าจริงๆ ครับ',
      authorEmail: 'mb1@hol.church',
      status: 'PUBLISHED'
    },
    {
      title: 'ชีวิตคู่ได้รับการฟื้นฟูหลังเข้าค่าย HLBC',
      content: 'ก่อนหน้านี้ดิฉันและสามีทะเลาะกันบ่อยมากและเกือบจะหย่าร้างกัน แต่หลังจากได้เข้าค่ายชุมชนแห่งการสามัคคีธรรม ได้เรียนรู้เรื่องการให้อภัยและรักเหมือนที่พระคริสต์รักเรา ตอนนี้ครอบครัวของเรากลับมามีความสุขและอบอุ่นอีกครั้งค่ะ',
      authorEmail: 'mb2@hol.church',
      status: 'PUBLISHED'
    },
    {
      title: 'พระเจ้าทรงจัดเตรียมเรื่องงานและรายได้',
      content: 'ขอบคุณพระเจ้าช่วงที่ว่างงาน 3 เดือน พี่เลี้ยงได้หนุนใจและร่วมอธิษฐานวิงวอนร่วมกันทุกสัปดาห์ ในที่สุดบริษัทที่ฝันไว้ก็ตอบรับเข้าทำงานในตำแหน่งที่ดีกว่าเดิมและเงินเดือนเพิ่มขึ้นด้วย สรรเสริญพระเจ้า!',
      authorEmail: 'nb1@hol.church',
      status: 'DRAFT'
    }
  ];

  for (const t of testimonies) {
    const authorId = userMap[t.authorEmail]?.id;
    if (!authorId) continue;
    await prisma.testimony.create({
      data: {
        title: t.title,
        content: t.content,
        authorId,
        status: t.status
      }
    });
    console.log(`   ✓ Testimony: ${t.title}`);
  }

  // 11. Enrollments
  console.log('📊 Creating enrollments with progress...');
  for (const [email, uInfo] of Object.entries(userMap)) {
    if (uInfo.tierName.toLowerCase().includes('admin') || email === 'admin@hol.church') continue;

    const courseTitles = getCoursesForTier(uInfo.tierName);
    for (const title of courseTitles) {
      const courseId = courseMap[title];
      if (!courseId) continue;

      const prog = randomProgress(uInfo.tierName);
      const isCompleted = prog === 100;
      const isNotStarted = prog === 0;

      try {
        await prisma.userCourse.create({
          data: {
            userId: uInfo.id,
            courseId,
            status: isCompleted ? 'COMPLETED' : isNotStarted ? 'NOT_STARTED' : 'IN_PROGRESS',
            progressPercent: prog,
            completedAt: isCompleted ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
            startedAt: isNotStarted ? new Date() : new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
          },
        });
      } catch (e) {
        // Skip duplicate
      }
    }
  }

  // 12. Learning Goals
  console.log('🎯 Creating learning goals...');
  const welcomeCourseId = courseMap['ยินดีต้อนรับสู่ Holy Land Community'];
  const hlbsBeginId = courseMap['HLBS ชั้น Beginning — รากฐานแห่งความเชื่อ'];
  const hlbsBasicId = courseMap['HLBS ชั้น Basic — เติบโตในความเชื่อ'];

  await prisma.learningGoal.create({
    data: {
      title: 'ทุกสมาชิกใหม่ต้องผ่าน Welcome Lesson',
      type: 'SPECIFIC',
      targetCount: 1,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      scope: 'GLOBAL',
      status: 'ACTIVE',
      courses: welcomeCourseId ? { create: [{ courseId: welcomeCourseId }] } : undefined,
    },
  });

  await prisma.learningGoal.create({
    data: {
      title: 'Q3: ผ่าน HLBS Beginning ทุกสังกัด',
      type: 'SPECIFIC',
      targetCount: 1,
      expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      scope: 'GLOBAL',
      status: 'ACTIVE',
      courses: hlbsBeginId ? { create: [{ courseId: hlbsBeginId }] } : undefined,
    },
  });

  for (const dept of ['HLA', 'HLB', 'HLS']) {
    const deptId = deptMap[dept];
    await prisma.learningGoal.create({
      data: {
        title: `${dept}: เสริมทักษะ HLBS Basic`,
        type: 'SPECIFIC',
        targetCount: 1,
        expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        scope: 'DEPARTMENT',
        departmentId: deptId,
        status: 'ACTIVE',
        courses: hlbsBasicId ? { create: [{ courseId: hlbsBasicId }] } : undefined,
      },
    });
  }

  console.log('\n✅ Holy Land LMS Seed COMPLETED!');
  console.log('📧 Login: admin@hol.church | password: holyland123');
  console.log('📧 SDL: sdl@hol.church | UL: ul.hla@hol.church | CL: cl1@hol.church');
  console.log('📧 SP: sp1@hol.church | MB: mb1@hol.church | NB: nb1@hol.church\n');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
