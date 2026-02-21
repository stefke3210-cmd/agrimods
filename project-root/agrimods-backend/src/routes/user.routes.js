// routes/user.routes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { uploadAvatar, handleMulterError } = require('../middleware/upload.middleware');

router.patch('/updateAvatar', 
  uploadAvatar, 
  handleMulterError, 
  userController.updateAvatar
);

module.exports = router;