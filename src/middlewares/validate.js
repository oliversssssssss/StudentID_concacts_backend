export function validate(schema) {
    return (req, res, next) => {
        const isBody = ['POST','PUT','PATCH'].includes(req.method);
        const data = isBody ? req.body : req.query;

        const { error, value } = schema.validate(data, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            return res.status(400).json({ message: 'Validation failed', details: error.details });
        }
        if (isBody) req.body = value;
        next();
    };
}
