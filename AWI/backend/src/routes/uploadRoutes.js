const express = require('express');
const router = express.Router();
const { uploadSingle, uploadMultiple, deleteFile } = require('../controllers/uploadController');
const { uploadSingle: uploadSingleMiddleware, uploadMultiple: uploadMultipleMiddleware, checkFileSizeByType } = require('../middleware/uploadMiddleware');

// Upload single file
router.post('/', uploadSingleMiddleware, checkFileSizeByType, uploadSingle);

// Upload multiple files
router.post('/multiple', uploadMultipleMiddleware, checkFileSizeByType, uploadMultiple);

// Delete file
router.delete('/:filename', deleteFile);

module.exports = router;
