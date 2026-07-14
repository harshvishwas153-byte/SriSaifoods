const adminSessionService = require("../services/adminSession.service");

module.exports = function adminAuth(req, res, next) {
  try {
    const token = adminSessionService.getTokenFromRequest(req);
    req.adminSession = adminSessionService.validateSessionToken(token);
    next();
  } catch (error) {
    next(error);
  }
};
