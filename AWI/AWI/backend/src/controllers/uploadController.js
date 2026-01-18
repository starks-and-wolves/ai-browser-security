const path = require('path');
const fs = require('fs').promises;
const asyncHandler = require('../middleware/asyncHandler');

/**
 * @desc    Upload single file
 * @route   POST /api/upload
 * @access  Public
 */
exports.uploadSingle = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded'
    });
  }

  const fileType = req.file.mimetype.startsWith('image/') ? 'image' :
                   req.file.mimetype.startsWith('video/') ? 'video' :
                   req.file.mimetype.startsWith('audio/') ? 'audio' : 'file';

  // Construct file URL
  const fileUrl = `/uploads/${fileType}s/${req.file.filename}`;

  res.json({
    success: true,
    data: {
      type: fileType,
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date()
    }
  });
});

/**
 * @desc    Upload multiple files
 * @route   POST /api/upload/multiple
 * @access  Public
 */
exports.uploadMultiple = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Please upload files'
    });
  }

  const files = req.files.map(file => ({
    type: file.mimetype.split('/')[0], // 'image', 'video', or 'audio'
    url: `/uploads/${file.mimetype.split('/')[0]}s/${file.filename}`,
    filename: file.filename,
    originalName: file.originalname,
    size: file.size,
    mimeType: file.mimetype
  }));

  res.status(201).json({
    success: true,
    data: files,
    count: files.length
  });
});

/**
 * @desc    Delete uploaded file
 * @route   DELETE /api/upload/:filename
 * @access  Public
 */
exports.deleteFile = asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const { type } = req.query; // image, video, or audio

  if (!['image', 'video', 'audio'].includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type specified'
    });
  }

  const filePath = path.join(__dirname, `../../uploads/${type}s/${filename}`);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      error: 'File not found'
    });
  }

  // Delete file
  fs.unlinkSync(filePath);

  res.json({
    success: true,
    message: 'File deleted successfully'
  });
});

