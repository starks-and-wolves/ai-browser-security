const Post = require('../models/Post');
const Comment = require('../models/Comment');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * @desc    Get all posts with pagination, search, filters, and sorting
 * @route   GET /api/posts
 * @access  Public
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 10, max: 100)
 * @query   search - Search term for title/content
 * @query   tag - Filter by tag
 * @query   category - Filter by category
 * @query   minViews - Minimum view count
 * @query   maxViews - Maximum view count
 * @query   minComments - Minimum comment count
 * @query   maxComments - Maximum comment count
 * @query   sortBy - Sort field (createdAt, viewCount, commentsCount, title)
 * @query   sortOrder - Sort direction (asc, desc)
 */
exports.getPosts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 10, 100); // Max 100 items
  const skip = (page - 1) * limit;

  // Build query
  const query = {};

  // Search by title or content
  if (req.query.search) {
    query.$text = { $search: req.query.search };
  }

  // Filter by tag
  if (req.query.tag) {
    query.tags = req.query.tag.toLowerCase();
  }

  // Filter by category
  if (req.query.category) {
    query.category = req.query.category;
  }

  // Filter by view count range
  if (req.query.minViews || req.query.maxViews) {
    query.viewCount = {};
    if (req.query.minViews) {
      query.viewCount.$gte = parseInt(req.query.minViews);
    }
    if (req.query.maxViews) {
      query.viewCount.$lte = parseInt(req.query.maxViews);
    }
  }

  // Filter by comment count range
  if (req.query.minComments || req.query.maxComments) {
    query.commentsCount = {};
    if (req.query.minComments) {
      query.commentsCount.$gte = parseInt(req.query.minComments);
    }
    if (req.query.maxComments) {
      query.commentsCount.$lte = parseInt(req.query.maxComments);
    }
  }

  // Build sort options
  const allowedSortFields = ['createdAt', 'viewCount', 'commentsCount', 'title', 'publishedAt'];
  const sortBy = allowedSortFields.includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
  const sortOptions = { [sortBy]: sortOrder };

  // Get total count for pagination
  const total = await Post.countDocuments(query);

  // Get posts
  const posts = await Post.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .select('-__v');

  res.json({
    success: true,
    data: posts,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    },
    filters: {
      search: req.query.search,
      tag: req.query.tag,
      category: req.query.category,
      minViews: req.query.minViews,
      maxViews: req.query.maxViews,
      minComments: req.query.minComments,
      maxComments: req.query.maxComments,
      sortBy,
      sortOrder: sortOrder === 1 ? 'asc' : 'desc'
    }
  });
});

/**
 * @desc    Get single post by ID
 * @route   GET /api/posts/:id
 * @access  Public
 */
exports.getPostById = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id).select('-__v');

  if (!post) {
    return res.status(404).json({
      success: false,
      error: 'Post not found'
    });
  }

  res.json({
    success: true,
    data: post
  });
});

/**
 * @desc    Get post by slug
 * @route   GET /api/posts/slug/:slug
 * @access  Public
 */
exports.getPostBySlug = asyncHandler(async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug }).select('-__v');

  if (!post) {
    return res.status(404).json({
      success: false,
      error: 'Post not found'
    });
  }

  res.json({
    success: true,
    data: post
  });
});

/**
 * @desc    Create new post
 * @route   POST /api/posts
 * @access  Public
 */
exports.createPost = asyncHandler(async (req, res) => {
  const { title, content, authorName, tags, category, mediaFiles } = req.body;

  // Validate required fields
  if (!title || !content) {
    return res.status(400).json({
      success: false,
      error: 'Title and content are required'
    });
  }

  // Create post
  const post = await Post.create({
    title,
    content,
    authorName: authorName || 'Anonymous',
    tags: tags || [],
    category: category || 'Uncategorized',
    mediaFiles: mediaFiles || []
  });

  res.status(201).json({
    success: true,
    data: post
  });
});

/**
 * @desc    Update post
 * @route   PUT /api/posts/:id
 * @access  Public
 */
exports.updatePost = asyncHandler(async (req, res) => {
  let post = await Post.findById(req.params.id);

  if (!post) {
    return res.status(404).json({
      success: false,
      error: 'Post not found'
    });
  }

  // Update fields
  const { title, content, authorName, tags, category, mediaFiles } = req.body;

  post = await Post.findByIdAndUpdate(
    req.params.id,
    {
      ...(title && { title }),
      ...(content && { content }),
      ...(authorName !== undefined && { authorName }),
      ...(tags && { tags }),
      ...(category && { category }),
      ...(mediaFiles && { mediaFiles })
    },
    {
      new: true,
      runValidators: true
    }
  );

  res.json({
    success: true,
    data: post
  });
});

/**
 * @desc    Delete post
 * @route   DELETE /api/posts/:id
 * @access  Public
 */
exports.deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return res.status(404).json({
      success: false,
      error: 'Post not found'
    });
  }

  // Delete associated comments
  await Comment.deleteMany({ postId: req.params.id });

  // Delete post
  await post.deleteOne();

  res.json({
    success: true,
    data: {},
    message: 'Post and associated comments deleted successfully'
  });
});

/**
 * @desc    Increment post view count
 * @route   POST /api/posts/:id/view
 * @access  Public
 */
exports.incrementViewCount = asyncHandler(async (req, res) => {
  const post = await Post.findByIdAndUpdate(
    req.params.id,
    { $inc: { viewCount: 1 } },
    { new: true }
  ).select('viewCount');

  if (!post) {
    return res.status(404).json({
      success: false,
      error: 'Post not found'
    });
  }

  res.json({
    success: true,
    data: { viewCount: post.viewCount }
  });
});

/**
 * @desc    Get all unique tags
 * @route   GET /api/posts/tags/all
 * @access  Public
 */
exports.getAllTags = asyncHandler(async (req, res) => {
  const tags = await Post.distinct('tags');

  // Count posts for each tag
  const tagCounts = await Promise.all(
    tags.map(async (tag) => {
      const count = await Post.countDocuments({ tags: tag });
      return { name: tag, count };
    })
  );

  res.json({
    success: true,
    data: tagCounts.sort((a, b) => b.count - a.count)
  });
});

/**
 * @desc    Get all categories
 * @route   GET /api/posts/categories/all
 * @access  Public
 */
exports.getAllCategories = asyncHandler(async (req, res) => {
  const categories = await Post.distinct('category');

  // Count posts for each category
  const categoryCounts = await Promise.all(
    categories.map(async (category) => {
      const count = await Post.countDocuments({ category });
      return { name: category, count };
    })
  );

  res.json({
    success: true,
    data: categoryCounts.sort((a, b) => b.count - a.count)
  });
});
