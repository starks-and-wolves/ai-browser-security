import api from './api';

export const commentService = {
  // Get comments for a post
  getCommentsByPost: async (postId, params = {}) => {
    const response = await api.get(`/comments/post/${postId}`, { params });
    return response.data;
  },

  // Get single comment by ID
  getCommentById: async (id) => {
    const response = await api.get(`/comments/${id}`);
    return response.data;
  },

  // Create new comment
  createComment: async (commentData) => {
    const response = await api.post('/comments', commentData);
    return response.data;
  },

  // Update comment
  updateComment: async (id, commentData) => {
    const response = await api.put(`/comments/${id}`, commentData);
    return response.data;
  },

  // Delete comment
  deleteComment: async (id) => {
    const response = await api.delete(`/comments/${id}`);
    return response.data;
  },
};

export default commentService;
