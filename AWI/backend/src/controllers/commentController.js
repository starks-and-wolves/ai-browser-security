const Comment = require('../models/Comment');
const Post = require('../models/Post');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * @desc    Get comments for a post
 * @route   GET /api/comments/post/:postId
 * @access  Public
 */
exports.getCommentsByPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Check if post exists
  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({
      success: false,
      error: 'Post not found'
    });
  }

  // Get comments
  const total = await Comment.countDocuments({ postId });
  const comments = await Comment.find({ postId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-__v');

  res.json({
    success: true,
    data: comments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * @desc    Get single comment by ID
 * @route   GET /api/comments/:id
 * @access  Public
 */
exports.getCommentById = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id).select('-__v');

  if (!comment) {
    return res.status(404).json({
      success: false,
      error: 'Comment not found'
    });
  }

  res.json({
    success: true,
    data: comment
  });
});

/**
 * @desc    Create new comment
 * @route   POST /api/comments
 * @access  Public
 */
exports.createComment = asyncHandler(async (req, res) => {
  const { postId, content, authorName } = req.body;

  // Validate required fields
  if (!postId || !content) {
    return res.status(400).json({
      success: false,
      error: 'Post ID and content are required'
    });
  }

  // Check if post exists
  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({
      success: false,
      error: 'Post not found'
    });
  }

  // Create comment
  const comment = await Comment.create({
    postId,
    content,
    authorName: authorName || 'Anonymous'
  });

  // Update post's comment count
  await Post.findByIdAndUpdate(postId, {
    $inc: { commentsCount: 1 }
  });

  res.status(201).json({
    success: true,
    data: comment
  });
});

/**
 * @desc    Update comment
 * @route   PUT /api/comments/:id
 * @access  Public
 */
exports.updateComment = asyncHandler(async (req, res) => {
  let comment = await Comment.findById(req.params.id);

  if (!comment) {
    return res.status(404).json({
      success: false,
      error: 'Comment not found'
    });
  }

  const { content } = req.body;

  if (!content) {
    return res.status(400).json({
      success: false,
      error: 'Content is required'
    });
  }

  // Update comment
  comment = await Comment.findByIdAndUpdate(
    req.params.id,
    { content },
    {
      new: true,
      runValidators: true
    }
  );

  res.json({
    success: true,
    data: comment
  });
});

/**
 * @desc    Delete comment
 * @route   DELETE /api/comments/:id
 * @access  Public
 */
exports.deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    return res.status(404).json({
      success: false,
      error: 'Comment not found'
    });
  }

  const postId = comment.postId;

  // Delete comment
  await comment.deleteOne();

  // Update post's comment count
  await Post.findByIdAndUpdate(postId, {
    $inc: { commentsCount: -1 }
  });

  res.json({
    success: true,
    data: {},
    message: 'Comment deleted successfully'
  });
});
