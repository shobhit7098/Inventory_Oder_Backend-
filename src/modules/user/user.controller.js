const asyncHandler = require('../../utils/asyncHandler');
const { successResponse } = require('../../utils/response');
const userService = require('./user.service');
const jwtUtil = require('../../utils/jwt');

const register = asyncHandler(async (req, res) => {
  const user = await userService.registerUser(req.body);
  const token = jwtUtil.generateToken(user._id);

  return successResponse(res, 201, 'User registered successfully', {
    user,
    token
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await userService.loginUser(email, password);
  const token = jwtUtil.generateToken(user._id);

  return successResponse(res, 200, 'User logged in successfully', {
    user,
    token
  });
});

module.exports = {
  register,
  login
};
