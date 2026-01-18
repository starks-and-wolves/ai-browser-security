import api from './api';

export const postService = {
  // Get all posts with optional filters
  getPosts: async (params = {}) => {
    const response = await api.get('/posts', { params });
    return response.data;
  },

  // Get single post by ID
  getPostById: async (id) => {
    const response = await api.get(`/posts/${id}`);
    return response.data;
  },

  // Get post by slug
  getPostBySlug: async (slug) => {
    const response = await api.get(`/posts/slug/${slug}`);
    return response.data;
  },

  // Create new post
  createPost: async (postData) => {
    const response = await api.post('/posts', postData);
    return response.data;
  },

  // Update post
  updatePost: async (id, postData) => {
    const response = await api.put(`/posts/${id}`, postData);
    return response.data;
  },

  // Delete post
  deletePost: async (id) => {
    const response = await api.delete(`/posts/${id}`);
    return response.data;
  },

  // Increment view count
  incrementViewCount: async (id) => {
    const response = await api.post(`/posts/${id}/view`);
    return response.data;
  },

  // Get all tags
  getAllTags: async () => {
    const response = await api.get('/posts/tags/all');
    return response.data;
  },

  // Get all categories
  getAllCategories: async () => {
    const response = await api.get('/posts/categories/all');
    return response.data;
  },
};

export default postService;
