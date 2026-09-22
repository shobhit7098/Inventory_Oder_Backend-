const User = require('./user.model');
const ApiError = require('../../utils/ApiError');

const registerUser = async (userData) => {
  const { name, email, password } = userData;
  
  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ApiError(400, 'User already exists');
  }

  const user = await User.create({
    name,
    email,
    password
  });

  return user;
};

const loginUser = async (email, password) => {
  const user = await User.findOne({ email }).select('+password');
  
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isMatch = await user.matchPassword(password);
  
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  return user;
};

module.exports = {
  registerUser,
  loginUser
};
