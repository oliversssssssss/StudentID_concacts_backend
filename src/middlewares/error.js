export function errorHandler(err, req, res, next) {
    console.error(err);

    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Phone already exists' });
    }
    if (err.isJoi) {
        return res.status(400).json({ message: 'Validation failed', details: err.details });
    }
    res.status(err.status || 500).json({ message: err.message || 'Server error' });
}
