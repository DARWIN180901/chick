module.exports = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err.status) return res.status(err.status).json({ success: false, message: err.message });
  if (err.code === 'ER_DUP_ENTRY')
    return res.status(409).json({ success: false, message: 'A record with these details already exists' });
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
};
