const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

function run() {
  const headers = [
    'ระดับ (Level)',
    'ประเภท (Competency Type)\n(ความรู้/ทักษะ/สมรรถนะ)',
    'หมวดหมู่ (Category)',
    'รหัส (code)',
    'แหล่งที่มา / Role',
    'รหัสเดิม',
    'ชื่อหัวข้อ',
    'คำอธิบายเนื้อหา',
    'เงื่อนไขและหมายเหตุ',
    'จำนวนการวัดระดับ',
    'คำอธิบายระดับการวัด'
  ];

  const sampleData = [
    [
      '01-TOP Organisation Level',
      'สมรรถนะหลัก',
      'การทำงานร่วมกัน',
      'FDA-CORE-01',
      'อย. ทุกหน่วยงาน',
      'OCSC-C1, OCSC-C2',
      'การทำงานเป็นทีม (Teamwork)',
      'ความสามารถในการทำงานร่วมกับผู้อื่น การสนับสนุนทีม และการรับฟังความคิดเห็นเพื่อเป้าหมายร่วมกัน',
      'วัดผลพฤติกรรมในระดับการปฏิบัติงานจริง',
      '3',
      'ระดับ 1: ปฏิบัติงานในฐานะสมาชิกทีมที่ดี ช่วยเหลือเพื่อนร่วมงาน | ระดับ 2: สนับสนุนและสร้างบรรยากาศการทำงานร่วมกันในทีม | ระดับ 3: นำทีมหรือประสานงานระหว่างทีมเพื่อให้บรรลุเป้าหมายร่วมกันขององค์กร'
    ]
  ];

  const data = [headers, ...sampleData];

  const ws = xlsx.utils.aoa_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Competency Template');

  const destDir = path.join(__dirname, '../../elearning-webapp/public/templates');
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const destPath = path.join(destDir, 'gbt_competency_template.xlsx');
  xlsx.writeFile(wb, destPath);
  console.log(`Excel template generated successfully at: ${destPath}`);
}

run();
