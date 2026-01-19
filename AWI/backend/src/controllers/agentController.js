const Post = require('../models/Post');
const Comment = require('../models/Comment');
const AgentApiKey = require('../models/AgentApiKey');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * @desc    Get agent capabilities and available operations
 * @route   GET /api/agent/capabilities
 * @access  Public (no auth required for discovery)
 */
exports.getCapabilities = asyncHandler(async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  const capabilities = {
    version: '1.0.0',
    name: 'Blog AWI',
    description: 'Agent Web Interface for blog operations with stateful session management',
    discovery: {
      wellKnownUri: `${baseUrl}/.well-known/llm-text`,
      description: 'Complete AWI manifest with authentication, operations, and feature details',
      methods: [
        'HTTP Headers (X-AWI-Discovery)',
        'Well-Known URI (/.well-known/llm-text)',
        'Capabilities Endpoint (/api/agent/capabilities)'
      ]
    },
    operations: [
      {
        operation: 'list_posts',
        method: 'GET',
        endpoint: '/api/agent/posts',
        description: 'List all blog posts with filtering and pagination',
        parameters: {
          page: { type: 'integer', description: 'Page number', default: 1 },
          limit: { type: 'integer', description: 'Items per page', default: 10 },
          search: { type: 'string', description: 'Search in title and content' },
          tag: { type: 'string', description: 'Filter by tag' },
          category: { type: 'string', description: 'Filter by category' }
        },
        requiresAuth: true,
        permissions: ['read']
      },
      {
        operation: 'get_post',
        method: 'GET',
        endpoint: '/api/agent/posts/:id',
        description: 'Get a single blog post by ID',
        parameters: {
          id: { type: 'string', description: 'Post ID', required: true }
        },
        requiresAuth: true,
        permissions: ['read']
      },
      {
        operation: 'create_post',
        method: 'POST',
        endpoint: '/api/agent/posts',
        description: 'Create a new blog post',
        requiresAuth: true,
        permissions: ['write'],
        requestBody: {
          title: { type: 'string', required: true },
          content: { type: 'string', required: true },
          authorName: { type: 'string', required: false },
          category: { type: 'string', required: false },
          tags: { type: 'array', items: 'string', required: false }
        }
      },
      {
        operation: 'list_comments',
        method: 'GET',
        endpoint: '/api/agent/posts/:postId/comments',
        description: 'List comments for a specific post',
        requiresAuth: true,
        permissions: ['read']
      },
      {
        operation: 'create_comment',
        method: 'POST',
        endpoint: '/api/agent/posts/:postId/comments',
        description: 'Add a comment to a post',
        requiresAuth: true,
        permissions: ['write'],
        requestBody: {
          content: { type: 'string', required: true },
          authorName: { type: 'string', required: false }
        }
      },
      {
        operation: 'search',
        method: 'POST',
        endpoint: '/api/agent/search',
        description: 'Advanced search with natural language queries',
        requiresAuth: true,
        permissions: ['read']
      }
    ],
    authentication: {
      type: 'api_key',
      header: 'X-Agent-API-Key',
      registration: `${baseUrl}/api/agent/register`,
      description: 'Register at /api/agent/register to get an API key. Pass it in X-Agent-API-Key header.'
    },
    features: {
      sessionState: {
        enabled: true,
        description: 'Server-side session state tracking for multi-step agent interactions',
        endpoints: {
          state: `${baseUrl}/api/agent/session/state`,
          history: `${baseUrl}/api/agent/session/history`,
          diff: `${baseUrl}/api/agent/session/diff`,
          sessions: `${baseUrl}/api/agent/sessions`
        },
        benefits: [
          '500x token reduction vs stateless API',
          'Trajectory tracking for debugging',
          'State-based action validation',
          'Incremental state updates'
        ]
      },
      structuredResponses: true,
      semanticMetadata: true,
      trajectoryTracking: true,
      incrementalUpdates: true
    },
    rateLimit: {
      default: 1000,
      unit: 'requests per hour',
      status: 'not_yet_implemented'
    },
    dataFormats: ['application/json'],
    documentation: {
      openapi: `${baseUrl}/api/agent/docs`,
      swagger: `${baseUrl}/api/agent/docs/ui`,
      wellKnown: `${baseUrl}/.well-known/llm-text`
    }
  };

  res.json({
    success: true,
    capabilities
  });
});

/**
 * @desc    Get all posts with agent-optimized response
 * @route   GET /api/agent/posts
 * @access  Agent (requires API key)
 */
exports.getPostsForAgent = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = {};

  if (req.query.search) {
    query.$text = { $search: req.query.search };
  }
  if (req.query.tag) {
    query.tags = req.query.tag.toLowerCase();
  }
  if (req.query.category) {
    query.category = req.query.category;
  }

  const total = await Post.countDocuments(query);
  const posts = await Post.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-__v')
    .lean();

  // Add semantic metadata for agents
  const enrichedPosts = posts.map(post => ({
    ...post,
    _metadata: {
      type: 'BlogPost',
      schema: 'https://schema.org/BlogPosting',
      readable: true,
      commentable: true,
      links: {
        self: `/api/agent/posts/${post._id}`,
        comments: `/api/agent/posts/${post._id}/comments`,
        humanReadable: `/post/${post._id}`
      }
    }
  }));

  res.json({
    success: true,
    data: enrichedPosts,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    },
    agent: {
      suggestedActions: [
        { action: 'read_post', description: 'Get full content of a post' },
        { action: 'create_post', description: 'Create a new blog post' },
        { action: 'search', description: 'Search posts with natural language' }
      ]
    }
  });
});

/**
 * @desc    Get single post for agent
 * @route   GET /api/agent/posts/:id
 * @access  Agent
 */
exports.getPostForAgent = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id).select('-__v').lean();

  if (!post) {
    return res.status(404).json({
      success: false,
      error: 'Post not found',
      errorCode: 'POST_NOT_FOUND',
      suggestedAction: 'Verify the post ID or list all posts'
    });
  }

  // Increment view count
  await Post.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });

  // Add semantic metadata
  const enrichedPost = {
    ...post,
    _metadata: {
      type: 'BlogPost',
      schema: 'https://schema.org/BlogPosting',
      datePublished: post.createdAt,
      dateModified: post.updatedAt,
      wordCount: post.content.replace(/<[^>]*>/g, '').split(' ').length,
      readingTime: Math.ceil(post.content.replace(/<[^>]*>/g, '').split(' ').length / 200) + ' min',
      links: {
        self: `/api/agent/posts/${post._id}`,
        comments: `/api/agent/posts/${post._id}/comments`,
        humanReadable: `/post/${post._id}`
      }
    },
    availableActions: [
      { action: 'add_comment', method: 'POST', endpoint: `/api/agent/posts/${post._id}/comments` },
      { action: 'update_post', method: 'PUT', endpoint: `/api/agent/posts/${post._id}`, requiresPermission: 'write' },
      { action: 'delete_post', method: 'DELETE', endpoint: `/api/agent/posts/${post._id}`, requiresPermission: 'delete' }
    ]
  };

  res.json({
    success: true,
    data: enrichedPost
  });
});

/**
 * @desc    Create post for agent
 * @route   POST /api/agent/posts
 * @access  Agent (write permission)
 */
exports.createPostForAgent = asyncHandler(async (req, res) => {
  const { title, content, authorName, tags, category } = req.body;

  if (!title || !content) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errorCode: 'VALIDATION_ERROR',
      details: {
        title: !title ? 'Title is required' : null,
        content: !content ? 'Content is required' : null
      }
    });
  }

  const post = await Post.create({
    title,
    content,
    authorName: authorName || req.agent.name,
    tags: tags || [],
    category: category || 'Uncategorized'
  });

  res.status(201).json({
    success: true,
    data: post,
    message: 'Post created successfully',
    links: {
      view: `/api/agent/posts/${post._id}`,
      comments: `/api/agent/posts/${post._id}/comments`,
      humanReadable: `/post/${post._id}`
    }
  });
});

/**
 * @desc    Get comments for a post
 * @route   GET /api/agent/posts/:postId/comments
 * @access  Agent
 */
exports.getCommentsForAgent = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({
      success: false,
      error: 'Post not found',
      errorCode: 'POST_NOT_FOUND'
    });
  }

  const comments = await Comment.find({ postId })
    .sort({ createdAt: -1 })
    .select('-__v')
    .lean();

  res.json({
    success: true,
    data: comments,
    count: comments.length,
    postInfo: {
      id: post._id,
      title: post.title,
      commentsCount: post.commentsCount
    }
  });
});

/**
 * @desc    Create comment for agent
 * @route   POST /api/agent/posts/:postId/comments
 * @access  Agent (write permission)
 */
exports.createCommentForAgent = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { content, authorName } = req.body;

  if (!content) {
    return res.status(400).json({
      success: false,
      error: 'Content is required',
      errorCode: 'VALIDATION_ERROR'
    });
  }

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({
      success: false,
      error: 'Post not found',
      errorCode: 'POST_NOT_FOUND'
    });
  }

  const comment = await Comment.create({
    postId,
    content,
    authorName: authorName || req.agent.name
  });

  await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

  res.status(201).json({
    success: true,
    data: comment,
    message: 'Comment added successfully'
  });
});

/**
 * @desc    Advanced natural language search
 * @route   POST /api/agent/search
 * @access  Agent
 */
exports.searchForAgent = asyncHandler(async (req, res) => {
  const { query, intent, filters } = req.body;

  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Search query is required',
      errorCode: 'VALIDATION_ERROR'
    });
  }

  // Build search query
  const searchQuery = {
    $text: { $search: query }
  };

  if (filters?.tags) {
    searchQuery.tags = { $in: filters.tags };
  }
  if (filters?.category) {
    searchQuery.category = filters.category;
  }

  const posts = await Post.find(searchQuery)
    .sort({ score: { $meta: 'textScore' } })
    .limit(filters?.limit || 10)
    .select('-__v')
    .lean();

  res.json({
    success: true,
    query: query,
    intent: intent || 'search',
    results: posts,
    count: posts.length,
    interpretation: {
      understood: true,
      processedQuery: query,
      filtersApplied: filters || {}
    }
  });
});

/**
 * @desc    Register a new agent API key
 * @route   POST /api/agent/register
 * @access  Public (in production, protect this endpoint)
 */
exports.registerAgent = asyncHandler(async (req, res) => {
  const { name, description, permissions, agentType, framework } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Agent name is required'
    });
  }

  const apiKey = await AgentApiKey.create({
    name,
    description,
    permissions: permissions || ['read'],
    metadata: {
      agentType,
      framework
    }
  });

  res.status(201).json({
    success: true,
    message: 'Agent registered successfully',
    agent: {
      id: apiKey._id.toString(),
      name: apiKey.name,
      apiKey: apiKey.key,
      permissions: apiKey.permissions,
      description: apiKey.description,
      rateLimit: apiKey.rateLimit,
      createdAt: apiKey.createdAt
    },
    usage: {
      header: 'X-Agent-API-Key',
      example: `X-Agent-API-Key: ${apiKey.key}`
    },
    nextSteps: [
      'Include the API key in all requests',
      'Explore available operations at /api/agent/capabilities',
      'Read documentation at /api/agent/docs'
    ]
  });
});
