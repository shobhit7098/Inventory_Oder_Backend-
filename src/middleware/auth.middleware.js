const jwtUtil = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../modules/user/user.model');
const messages = require('../constants/messages');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ApiError(401, messages.UNAUTHORIZED));
  }

  try {
    const decoded = jwtUtil.verifyToken(token);
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return next(new ApiError(401, messages.UNAUTHORIZED));
    }
    
    next();
  } catch (error) {
    return next(new ApiError(401, messages.UNAUTHORIZED));
  }
});

module.exports = { protect };
