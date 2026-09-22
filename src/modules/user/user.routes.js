const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const userValidation = require('./user.validation');
const validate = require('../../middleware/validation.middleware');

router.post('/register', userValidation.registerValidation, validate, userController.register);
router.post('/login', userValidation.loginValidation, validate, userController.login);

module.exports = router;
