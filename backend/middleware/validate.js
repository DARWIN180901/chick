const { validationResult } = require('express-validator');
module.exports = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array();
  res.status(400).json({
    success: false,
    message: errors[0].msg,
    errors: errors.map((e) => ({ field: e.path, message: e.msg })),
  });
};
