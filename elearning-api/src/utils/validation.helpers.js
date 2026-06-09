/**
 * Simple, custom schema validator middleware with Thai error messages.
 */
const validateBodySchema = (schema) => {
    return (req, res, next) => {
        const errors = [];
        
        for (const [field, rules] of Object.entries(schema)) {
            const value = req.body[field];

            // 1. Required Check
            if (rules.required) {
                if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
                    errors.push({
                        field,
                        message: rules.requiredMessage || `กรุณาระบุข้อมูลฟิลด์ ${field}`
                    });
                    continue; // Skip further checks if empty
                }
            }

            // If field is present, validate types & constraints
            if (value !== undefined && value !== null && value !== '') {
                // 2. Type checks
                if (rules.type === 'string' && typeof value !== 'string') {
                    errors.push({ field, message: `ฟิลด์ ${field} ต้องเป็นตัวหนังสือ (string)` });
                } else if (rules.type === 'number') {
                    const parsedNum = Number(value);
                    if (Number.isNaN(parsedNum)) {
                        errors.push({ field, message: `ฟิลด์ ${field} ต้องเป็นตัวเลข (number)` });
                    }
                } else if (rules.type === 'boolean' && typeof value !== 'boolean') {
                    errors.push({ field, message: `ฟิลด์ ${field} ต้องเป็นค่าจริง/เท็จ (boolean)` });
                } else if (rules.type === 'array' && !Array.isArray(value)) {
                    errors.push({ field, message: `ฟิลด์ ${field} ต้องเป็นอาเรย์ (array)` });
                }

                // 3. Constraints
                if (rules.type === 'string' && typeof value === 'string') {
                    if (rules.minLength && value.length < rules.minLength) {
                        errors.push({ field, message: `ฟิลด์ ${field} ต้องยาวอย่างน้อย ${rules.minLength} ตัวอักษร` });
                    }
                    if (rules.maxLength && value.length > rules.maxLength) {
                        errors.push({ field, message: `ฟิลด์ ${field} ต้องยาวไม่เกิน ${rules.maxLength} ตัวอักษร` });
                    }
                }
                if (rules.type === 'number') {
                    const parsedNum = Number(value);
                    if (rules.min !== undefined && parsedNum < rules.min) {
                        errors.push({ field, message: `ฟิลด์ ${field} ต้องมีค่าอย่างน้อย ${rules.min}` });
                    }
                    if (rules.max !== undefined && parsedNum > rules.max) {
                        errors.push({ field, message: `ฟิลด์ ${field} ต้องมีค่าไม่เกิน ${rules.max}` });
                    }
                }
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'ข้อมูลนำเข้าไม่ถูกต้อง',
                errors
            });
        }

        next();
    };
};

// Define schemas
const courseSchema = {
    title: {
        required: true,
        type: 'string',
        minLength: 2,
        requiredMessage: 'กรุณาระบุชื่อคอร์สเรียน'
    },
    points: {
        type: 'number',
        min: 0
    }
};

const categorySchema = {
    name: {
        required: true,
        type: 'string',
        minLength: 1,
        requiredMessage: 'กรุณาระบุชื่อหมวดหมู่'
    }
};

const competencySchema = {
    code: {
        required: true,
        type: 'string',
        minLength: 1,
        requiredMessage: 'กรุณาระบุรหัสสมรรถนะหลัก (Code)'
    },
    name: {
        required: true,
        type: 'string',
        minLength: 1,
        requiredMessage: 'กรุณาระบุชื่อสมรรถนะ'
    },
    categoryId: {
        required: true,
        type: 'string',
        requiredMessage: 'กรุณาระบุรหัสหมวดหมู่สมรรถนะ'
    }
};

module.exports = {
    validateBodySchema,
    courseSchema,
    categorySchema,
    competencySchema
};
