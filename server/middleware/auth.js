const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided. Authorization denied.' });
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret_change_me');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token is not valid.' });
  }
};

module.exports = auth;
