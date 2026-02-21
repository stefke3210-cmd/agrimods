// routes/mod.routes.js
const express = require('express');
const router = express.Router();
const modController = require('../controllers/mod.controller');
const { uploadMod, handleMulterError, requireFile } = require('../middleware/upload.middleware');

router.post('/', 
  uploadMod, 
  handleMulterError, 
  requireFile, 
  modController.createMod
);

// routes/mod.routes.js
const { uploadImages, handleMulterError } = require('../middleware/upload.middleware');

router.post('/:id/screenshots', 
  uploadImages, 
  handleMulterError, 
  modController.addScreenshots
);

module.exports = router;
