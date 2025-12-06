const { z } = require('zod');

// Allowed statuses for job applications (aligned with enum)
const ALLOWED_STATUSES = ['APPLIED', 'INTERVIEWING', 'REJECTED', 'OFFER', 'ACCEPTED'];

// Common trimmed string field with max length
const trimmedString = (fieldName, { max = 200, required = true } = {}) =>
    z.preprocess(
        (val) => (typeof val === 'string' ? val.trim() : val),
        required
            ? z
                  .string({
                      required_error: `${fieldName} is required`,
                      invalid_type_error: `${fieldName} must be a string`,
                  })
                  .min(1, `${fieldName} must be a non-empty string`)
                  .max(max, `${fieldName} must be at most ${max} characters long`)
            : z
                  .string({
                      invalid_type_error: `${fieldName} must be a string`,
                  })
                  .trim()
                  .min(1, `${fieldName} must be a non-empty string`)
                  .max(max, `${fieldName} must be at most ${max} characters long`)
    );

const createApplicationSchema = z.object({
    position: trimmedString('Position'),
    company: trimmedString('Company'),
    url: z.preprocess(
        (val) => (typeof val === 'string' ? val.trim() : val),
        z
            .string({
                required_error: 'URL is required',
                invalid_type_error: 'URL must be a string',
            })
            .min(1, 'URL must be a non-empty string')
            .max(2048, 'URL must be at most 2048 characters long')
            .url('URL must be a valid URL')
    ),
    status: z.enum(ALLOWED_STATUSES).optional().default('APPLIED'),
});

const updateApplicationSchema = z
    .object({
        position: trimmedString('Position', { required: false }).optional(),
        company: trimmedString('Company', { required: false }).optional(),
        status: z.enum(ALLOWED_STATUSES).optional(),
    })
    .refine(
        (data) => data.position || data.company || data.status,
        'At least one field (position, company, or status) must be provided'
    );

const listApplicationsSchema = z.object({
    status: z.enum(ALLOWED_STATUSES).optional(),
    sortBy: z
        .enum(['date', 'status'])
        .optional()
        .default('date'),
    sortOrder: z
        .enum(['asc', 'desc', 'ASC', 'DESC'])
        .optional()
        .default('desc')
        .transform((val) => val.toLowerCase()),
    page: z
        .preprocess(
            (val) => (val === undefined ? 1 : Number(val)),
            z
                .number({
                    invalid_type_error: 'Page must be a number',
                })
                .int('Page must be an integer')
                .min(1, 'Page must be at least 1')
                .max(1000, 'Page is too large')
        )
        .default(1),
    pageSize: z
        .preprocess(
            (val) => (val === undefined ? 20 : Number(val)),
            z
                .number({
                    invalid_type_error: 'pageSize must be a number',
                })
                .int('pageSize must be an integer')
                .min(1, 'pageSize must be at least 1')
                .max(100, 'pageSize must not exceed 100')
        )
        .default(20),
});

const idSchema = z.preprocess(
    (val) => Number(val),
    z
        .number({
            invalid_type_error: 'Application id must be a number',
        })
        .int('Application id must be an integer')
        .positive('Application id must be positive')
);

const parseWithErrorHandling = (schema, data) => {
    try {
        return schema.parse(data);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const issues = error.issues || error.errors || [];
            if (issues.length > 0) {
                const first = issues[0];
                const message = first.message || 'Validation failed';
                throw new Error(message);
            }
        }
        throw error;
    }
};

module.exports = {
    ALLOWED_STATUSES,
    createApplicationSchema,
    updateApplicationSchema,
    listApplicationsSchema,
    idSchema,
    parseWithErrorHandling,
};

