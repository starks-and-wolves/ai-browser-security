const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Blog AWI - Agent Web Interface',
      version: '1.0.0',
      description: 'Agent-optimized API for blog operations. This API is designed for AI agents to interact with blog posts, comments, and media programmatically.',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        AgentApiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Agent-API-Key',
          description: 'API key for agent authentication. Format: agent_xxxxxxxx'
        }
      },
      schemas: {
        Post: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'Unique identifier' },
            title: { type: 'string', description: 'Post title' },
            content: { type: 'string', description: 'Post content (HTML)' },
            authorName: { type: 'string', description: 'Author name' },
            slug: { type: 'string', description: 'URL-friendly slug' },
            mediaFiles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['image', 'video', 'audio'] },
                  url: { type: 'string' },
                  filename: { type: 'string' },
                  size: { type: 'number' },
                  mimeType: { type: 'string' }
                }
              }
            },
            tags: { type: 'array', items: { type: 'string' } },
            category: { type: 'string' },
            viewCount: { type: 'number' },
            commentsCount: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Comment: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            postId: { type: 'string' },
            content: { type: 'string' },
            authorName: { type: 'string' },
            isEdited: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    },
    security: [
      {
        AgentApiKey: []
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
