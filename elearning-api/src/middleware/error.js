const ErrorResponse = require('../utils/errorResponse');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };

  error.message = err.message;

  // Log to console for dev
  console.error('API Error:', err);

  // Prisma unique constraint error
  if (err.code === 'P2002') {
    const message = 'ข้อมูลนี้มีอยู่ในระบบแล้ว (Duplicate field value entered)';
    error = new ErrorResponse(message, 400);
  }

  // Prisma record not found error
  if (err.code === 'P2025') {
    const message = 'ไม่พบข้อมูลที่ต้องการ (Record not found)';
    error = new ErrorResponse(message, 404);
  }

  // Prisma foreign key constraint error
  if (err.code === 'P2003') {
    const message = 'ข้อมูลนี้กำลังถูกใช้งานอยู่ ไม่สามารถลบหรือแก้ไขได้ (Foreign key constraint failed)';
    error = new ErrorResponse(message, 400);
  }

  if (err.message && err.message.startsWith('CORS:')) {
    error = new ErrorResponse(err.message, 403);
  }

  if (err.type === 'entity.too.large') {
    error = new ErrorResponse('Request payload is too large', 413);
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new ErrorResponse('Uploaded file is too large', 413);
  }

  if (err.message === 'Invalid file type.' || err.message === 'Invalid file extension.' || err.message === 'File signature does not match the declared type.') {
    error = new ErrorResponse(err.message, 400);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ (Server Error)',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

module.exports = errorHandler;
