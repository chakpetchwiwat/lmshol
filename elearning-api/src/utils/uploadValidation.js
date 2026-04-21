const path = require('path');

const ALLOWED_UPLOAD_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'text/plain': ['.txt']
};

const hasSignature = (buffer, signature, offset = 0) => buffer.subarray(offset, offset + signature.length).equals(signature);

const hasExpectedBinarySignature = (file) => {
    const { buffer, mimetype } = file;

    switch (mimetype) {
    case 'image/jpeg':
        return hasSignature(buffer, Buffer.from([0xff, 0xd8, 0xff]));
    case 'image/png':
        return hasSignature(buffer, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    case 'image/gif':
        return hasSignature(buffer, Buffer.from('GIF8', 'ascii'));
    case 'image/webp':
        return hasSignature(buffer, Buffer.from('RIFF', 'ascii'))
            && hasSignature(buffer, Buffer.from('WEBP', 'ascii'), 8);
    case 'application/pdf':
        return hasSignature(buffer, Buffer.from('%PDF-', 'ascii'));
    default:
        return true;
    }
};

const validateUploadedFile = (file) => {
    if (!file) {
        return {
            valid: false,
            message: 'Please select a file.'
        };
    }

    const allowedExtensions = ALLOWED_UPLOAD_TYPES[file.mimetype];
    if (!allowedExtensions) {
        return {
            valid: false,
            message: 'Invalid file type.'
        };
    }

    const extension = path.extname(file.originalname || '').toLowerCase();
    if (!allowedExtensions.includes(extension)) {
        return {
            valid: false,
            message: 'Invalid file extension.'
        };
    }

    if (!hasExpectedBinarySignature(file)) {
        return {
            valid: false,
            message: 'File signature does not match the declared type.'
        };
    }

    return { valid: true };
};

module.exports = {
    ALLOWED_UPLOAD_TYPES,
    validateUploadedFile
};
