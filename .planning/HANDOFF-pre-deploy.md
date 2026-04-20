# 🚀 Handoff: Pre-Deploy Hardening สำหรับ DigitalOcean
> บันทึกไว้สำหรับ session ถัดไป | เมษายน 2026

---

## 📍 สถานะตอนนี้

- **Branch ปัจจุบัน:** `deploy/client-scaleupkm` ✅
- **Branch base product:** `main` (สำหรับขายลูกค้าใหม่)
- **ยังไม่ได้แก้โค้ดอะไรเลย** — plan พร้อม รอลงมือ

---

## ✅ งาน 3 อย่างที่ต้องทำ (เรียงตาม priority)

### งานที่ 1 — ตัด Supabase ออก + ย้าย Storage → DO Spaces 🔴

**ติดตั้ง:**
```bash
cd elearning-api
npm uninstall @supabase/supabase-js
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**ไฟล์ที่ต้องแก้:**

1. **[NEW]** `src/utils/spaces.js` — สร้าง DO Spaces S3 client
   - export `uploadToSpaces(buffer, key, contentType, isPublic)`
   - export `deleteFromSpaces(key)`
   - ใช้ `@aws-sdk/client-s3` กับ env vars: `DO_SPACES_ENDPOINT`, `DO_SPACES_KEY`, `DO_SPACES_SECRET`, `DO_SPACES_BUCKET`

2. **[MODIFY]** `src/routes/upload.routes.js`
   - ลบ: `require('@supabase/supabase-js')` และ supabase client ทั้งหมด
   - แทนที่: `supabase.storage...upload()` → `uploadToSpaces(req.file.buffer, fileName, mimetype, isImage)`
   - ลบ: `supabase.storage.getPublicUrl()`
   - ผลลัพธ์: `fileUrl` = CDN URL จาก DO Spaces

3. **[MODIFY]** `src/server.js` บรรทัด 24
   - ลบ: `app.use('/uploads', express.static(...))`

4. **[MODIFY]** `.env.example` — ลบ SUPABASE_*, เพิ่ม:
   ```env
   DO_SPACES_ENDPOINT="https://sgp1.digitaloceanspaces.com"
   DO_SPACES_REGION="sgp1"
   DO_SPACES_BUCKET="scaleup-km"
   DO_SPACES_KEY="your-key"
   DO_SPACES_SECRET="your-secret"
   DO_SPACES_CDN_URL="https://scaleup-km.sgp1.cdn.digitaloceanspaces.com"
   ```

---

### งานที่ 2 — Prisma DATABASE_URL → DO Managed PostgreSQL 🔴

**Schema ดีอยู่แล้ว** (`schema.prisma` มี `directUrl` แล้ว ✅ ไม่ต้องแก้)

**[MODIFY]** `.env.example` — แก้ format:
```env
# ใช้กับ Application runtime (PgBouncer, port 25061)
DATABASE_URL="postgresql://doadmin:PASSWORD@HOST:25061/defaultdb?pgbouncer=true&connect_timeout=15&sslmode=require"

# ใช้กับ prisma migrate deploy เท่านั้น (port 5432)
DIRECT_URL="postgresql://doadmin:PASSWORD@HOST:5432/defaultdb?sslmode=require&connect_timeout=15"
```

**[MODIFY]** `src/utils/prisma.js` — เพิ่ม startup check:
```js
prisma.$connect()
  .then(() => console.log('✅ PostgreSQL connected'))
  .catch((e) => { console.error('❌ DB failed:', e.message); process.exit(1); });
```

**Migrate command (รันหลัง provision DO PG แล้ว):**
```bash
npx prisma migrate deploy
```

---

### งานที่ 3 — CORS Hardening 🟡

**[MODIFY]** `src/server.js` บรรทัด 18:

เปลี่ยนจาก:
```js
app.use(cors());
```

เป็น:
```js
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

if (process.env.NODE_ENV !== 'production') {
  ALLOWED_ORIGINS.push('http://localhost:5173', 'http://localhost:3000');
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) callback(null, true);
    else callback(new Error(`CORS: Origin "${origin}" not allowed`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

**[MODIFY]** `.env.example`:
```env
ALLOWED_ORIGINS="https://app.yourdomain.co.th,https://yourdomain.co.th"
```

---

## ⚠️ Pre-requisite ก่อนเริ่ม (ต้องทำฝั่ง DO ก่อน)

- [ ] สร้าง **DO Spaces bucket** ชื่อ `scaleup-km` (region: Singapore `sgp1`)
- [ ] เปิด CDN บน bucket + copy CDN URL
- [ ] สร้าง **Spaces Access Key** (ได้ KEY + SECRET)
- [ ] Provision **DO Managed PostgreSQL** (db-s-1vcpu-2gb, region: sgp1)
- [ ] Copy connection strings จาก DO Control Panel ใส่ `.env`

---

## 📌 งานถัดไปหลังจาก Pre-Deploy เสร็จ

| งาน | Scope |
|-----|-------|
| **TanStack Query Migration** | `elearning-webapp` — เปลี่ยน `useEffect` + fetch → `useQuery` / `useMutation` |

---

## 📁 ไฟล์อ้างอิง

- Implementation Plan ละเอียด: `C:\Users\AlexWang\.gemini\antigravity\brain\c7c69a27-e40f-42b0-beaa-7d61a91ea377\implementation_plan.md`
- DO Cost Analysis: `C:\Users\AlexWang\Downloads\Scaleup-KM-DigitalOcean-Cost-Analysis.md`
