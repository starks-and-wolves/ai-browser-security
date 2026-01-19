import api from './api';

export const uploadService = {
  // Upload single file
  uploadFile: async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });

    return response.data;
  },

  // Upload multiple files
  uploadMultipleFiles: async (files, onUploadProgress) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await api.post('/upload/multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });

    return response.data;
  },

  // Delete file
  deleteFile: async (filename, type) => {
    const response = await api.delete(`/upload/${filename}`, {
      params: { type },
    });
    return response.data;
  },

  // Get file URL
  getFileUrl: (filePath) => {
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return baseURL.replace('/api', '') + filePath;
  },
};

export default uploadService;
