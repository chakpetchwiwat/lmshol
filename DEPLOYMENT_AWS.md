# AWS Deployment Runbook: คู่มือการติดตั้งระบบอย่างละเอียด

คู่มือนี้รวบรวมขั้นตอนการตั้งค่า AWS Infrastructure สำหรับระบบ Scaleup KM โดยละเอียด เพื่อให้ทีมงานสามารถทำตามได้ทีละขั้นตอน

---

## 1. การตั้งค่า IAM (Identity and Access Management)
เพื่อให้ระบบ (Backend) สามารถเข้าถึง S3 และ RDS ได้อย่างปลอดภัย

1.  ไปที่ **IAM Console** > **Users** > **Create user**
2.  ตั้งชื่อ User เช่น `scaleup-api-service`
3.  ในขั้นตอน **Set permissions**:
    *   เลือก **Attach policies directly**
    *   เลือก `AmazonS3FullAccess` (หรือสร้าง Custom Policy ที่จำกัดเฉพาะ Bucket)
    *   เลือก `AmazonRDSFullAccess` (สำหรับจัดการ Database)
4.  เมื่อสร้างเสร็จ ให้ไปที่แถบ **Security credentials** > **Create access key**
5.  เลือก **Application running outside AWS**
6.  **จดบันทึก Access Key ID และ Secret Access Key ไว้** (จะใช้ใน `.env` ของ Backend)

---

## 2. การตั้งค่า S3 (Simple Storage Service)
สำหรับเก็บไฟล์อัปโหลดและหน้าเว็บ Frontend

### 2.1 Bucket สำหรับ Assets (รูปภาพ/PDF)
1.  ไปที่ **S3 Console** > **Create bucket**
2.  ชื่อ Bucket: `scaleup-uploads` (ชื่อต้องไม่ซ้ำกันทั่วโลก)
3.  **Object Ownership**: เลือก **ACLs disabled (recommended)**
4.  **Block Public Access**: ติ๊กถูกออกทั้งหมด (เพื่อให้ CloudFront เข้าถึงได้)
5.  สร้าง Bucket

### 2.2 Bucket สำหรับ Frontend (Static Hosting)
1.  สร้าง Bucket ชื่อ: `scaleup-webapp-frontend`
2.  ไปที่แถบ **Properties** > **Static website hosting** > **Edit**
3.  เลือก **Enable**
4.  Index document: `index.html`, Error document: `index.html`

---

## 3. การตั้งค่า RDS (Relational Database Service)
สำหรับฐานข้อมูล PostgreSQL

1.  ไปที่ **RDS Console** > **Create database**
2.  เลือก **Standard create** > **PostgreSQL**
3.  **Engine version**: เลือกเวอร์ชันล่าสุด (เช่น 16.x)
4.  **Templates**: เลือก **Free Tier** (สำหรับการทดสอบ) หรือ **Production**
5.  **Settings**:
    *   DB instance identifier: `scaleup-db`
    *   Master username: `postgres`
    *   Master password: (ตั้งรหัสผ่านและจดบันทึกไว้)
6.  **Connectivity**:
    *   Public access: **No** (แนะนำให้เข้าผ่าน EC2 เท่านั้น)
    *   VPC security group: สร้างใหม่ชื่อ `scaleup-db-sg`
7.  เมื่อสร้างเสร็จ ให้จดบันทึก **Endpoint** ไว้เพื่อใช้ใน `DATABASE_URL`

---

## 4. การตั้งค่า EC2 (Elastic Compute Cloud)
สำหรับรัน Node.js Backend

1.  ไปที่ **EC2 Console** > **Launch instance**
2.  ชื่อ: `scaleup-backend-api`
3.  **AMI**: Amazon Linux 2023 (หรือ Ubuntu 22.04)
4.  **Instance type**: `t3.small` (แนะนำ) หรือ `t3.micro`
5.  **Key pair**: สร้างใหม่และเก็บไฟล์ `.pem` ไว้สำหรับ SSH
6.  **Network settings**:
    *   เปิด **Allow HTTP traffic from the internet**
    *   เปิด **Allow HTTPS traffic from the internet**
    *   เปิด **Allow SSH traffic**
7.  **ขั้นตอนหลังการ Launch (SSH เข้าไปติดตั้ง)**:
    ```bash
    # ติดตั้ง Node.js
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo yum install -y nodejs
    
    # ติดตั้ง PM2
    sudo npm install -g pm2
    
    # Clone code และตั้งค่า
    git clone <repository_url>
    cd elearning-api
    npm install
    npx prisma generate
    ```

---

## 5. การตั้งค่า CloudFront (CDN)
เพื่อให้หน้าเว็บโหลดเร็วและรองรับ SSL/HTTPS

1.  ไปที่ **CloudFront Console** > **Create distribution**
2.  **Origin domain**: เลือก S3 Bucket ของ Frontend
3.  **Default cache behavior**:
    *   Viewer protocol policy: **Redirect HTTP to HTTPS**
4.  **Web Application Firewall (WAF)**: เลือก **Enable** (ถ้าต้องการความปลอดภัยสูง)
5.  **Settings**:
    *   Default root object: `index.html`
6.  **Custom SSL Certificate**: เลือกใบเซอร์ที่ขอจาก ACM (AWS Certificate Manager)

---

## 6. การตั้งค่า Environment Variables (.env)

นำข้อมูลที่รวบรวมมาใส่ใน `.env` ของ Backend:
```env
DATABASE_URL="postgresql://postgres:<password>@<rds-endpoint>:5432/scaleup?schema=public"
AWS_REGION="ap-southeast-1"
AWS_ACCESS_KEY_ID="<your-access-key>"
AWS_SECRET_ACCESS_KEY="<your-secret-key>"
AWS_S3_BUCKET_NAME="scaleup-uploads"
```
