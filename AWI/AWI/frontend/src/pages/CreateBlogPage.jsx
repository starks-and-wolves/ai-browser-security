import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postService } from '../services/postService';
import { uploadService } from '../services/uploadService';
import toast from 'react-hot-toast';

function CreateBlogPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    authorName: '',
    category: '',
    tags: ''
  });
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const result = await uploadService.uploadFile(file);
        uploaded.push(result.data);
        toast.success(`✅ Uploaded ${file.name}`);
      }
      setUploadedFiles([...uploadedFiles, ...uploaded]);
      setFiles([]);
    } catch (error) {
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.content) {
      toast.error('Title and content are required');
      return;
    }

    setSubmitting(true);
    try {
      const postData = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        mediaFiles: uploadedFiles
      };
      const result = await postService.createPost(postData);
      toast.success('🎉 Post created successfully!');
      navigate(`/post/${result.data._id}`);
    } catch (error) {
      toast.error('Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{padding: '3rem 2rem', maxWidth: '900px', margin: '0 auto'}}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '3rem',
        animation: 'fadeIn 0.5s ease-out'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          marginBottom: '0.5rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          ✨ Create New Blog Post
        </h1>
        <p style={{fontSize: '1.1rem', color: 'var(--text-light)'}}>
          Share your story with the world
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{
        background: 'white',
        borderRadius: '20px',
        padding: '3rem',
        boxShadow: 'var(--shadow-lg)',
        animation: 'fadeIn 0.6s ease-out'
      }}>
        {/* Title */}
        <div style={{marginBottom: '2rem'}}>
          <label style={{
            display: 'block',
            marginBottom: '0.75rem',
            fontWeight: '600',
            color: 'var(--text-dark)',
            fontSize: '1.05rem'
          }}>
            📝 Title *
          </label>
          <input
            type="text"
            placeholder="Enter an engaging title..."
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            required
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1.1rem',
              border: '2px solid var(--border-color)',
              borderRadius: '12px',
              transition: 'all 0.2s ease'
            }}
          />
        </div>

        {/* Author Name */}
        <div style={{marginBottom: '2rem'}}>
          <label style={{
            display: 'block',
            marginBottom: '0.75rem',
            fontWeight: '600',
            color: 'var(--text-dark)',
            fontSize: '1.05rem'
          }}>
            👤 Author Name
          </label>
          <input
            type="text"
            placeholder="Your name (optional - defaults to Anonymous)"
            value={formData.authorName}
            onChange={(e) => setFormData({...formData, authorName: e.target.value})}
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1rem',
              border: '2px solid var(--border-color)',
              borderRadius: '12px'
            }}
          />
        </div>

        {/* Content */}
        <div style={{marginBottom: '2rem'}}>
          <label style={{
            display: 'block',
            marginBottom: '0.75rem',
            fontWeight: '600',
            color: 'var(--text-dark)',
            fontSize: '1.05rem'
          }}>
            ✍️ Content *
          </label>
          <textarea
            placeholder="Write your amazing content here..."
            value={formData.content}
            onChange={(e) => setFormData({...formData, content: e.target.value})}
            required
            rows={14}
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1rem',
              border: '2px solid var(--border-color)',
              borderRadius: '12px',
              fontFamily: 'inherit',
              lineHeight: '1.6',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Category and Tags Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.75rem',
              fontWeight: '600',
              color: 'var(--text-dark)',
              fontSize: '1.05rem'
            }}>
              📁 Category
            </label>
            <input
              type="text"
              placeholder="e.g., Technology, Travel, Food"
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1rem',
                border: '2px solid var(--border-color)',
                borderRadius: '12px'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.75rem',
              fontWeight: '600',
              color: 'var(--text-dark)',
              fontSize: '1.05rem'
            }}>
              🏷️ Tags
            </label>
            <input
              type="text"
              placeholder="e.g., javascript, react, tutorial"
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1rem',
                border: '2px solid var(--border-color)',
                borderRadius: '12px'
              }}
            />
            <small style={{color: 'var(--text-light)', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block'}}>
              Separate tags with commas
            </small>
          </div>
        </div>

        {/* Media Upload Section */}
        <div style={{
          border: '3px dashed var(--border-color)',
          borderRadius: '16px',
          padding: '2rem',
          background: 'var(--bg-gray)',
          marginBottom: '2rem',
          transition: 'all 0.2s ease'
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.style.borderColor = 'var(--primary-color)';
          e.currentTarget.style.background = 'var(--primary-light)';
        }}
        onDragLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.background = 'var(--bg-gray)';
        }}
        >
          <label style={{
            display: 'block',
            marginBottom: '1.25rem',
            fontWeight: '600',
            color: 'var(--text-dark)',
            fontSize: '1.05rem'
          }}>
            📎 Upload Media (Images, Videos, Audio)
          </label>

          <div style={{textAlign: 'center', marginBottom: '1.5rem'}}>
            <div style={{fontSize: '3rem', marginBottom: '1rem'}}>☁️</div>
            <p style={{color: 'var(--text-light)', marginBottom: '1rem'}}>
              Drag and drop files here or click to browse
            </p>
            <input
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              onChange={handleFileChange}
              style={{
                display: 'block',
                margin: '0 auto',
                padding: '0.75rem',
                cursor: 'pointer'
              }}
            />
          </div>

          {files.length > 0 && (
            <div style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '12px',
              marginBottom: '1rem'
            }}>
              <p style={{marginBottom: '0.75rem', fontWeight: '600'}}>
                📁 Selected Files: {files.length}
              </p>
              <ul style={{listStyle: 'none', padding: 0, marginBottom: '1rem'}}>
                {files.map((file, index) => (
                  <li key={index} style={{
                    padding: '0.5rem',
                    background: 'var(--bg-gray)',
                    borderRadius: '6px',
                    marginBottom: '0.5rem',
                    fontSize: '0.9rem'
                  }}>
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: uploading ? '#94A3B8' : 'var(--secondary-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {uploading ? '⏳ Uploading...' : '☁️ Upload Files'}
              </button>
            </div>
          )}

          {uploadedFiles.length > 0 && (
            <div style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '12px'
            }}>
              <p style={{fontWeight: '600', marginBottom: '1rem', color: 'var(--secondary-color)'}}>
                ✅ Uploaded Files ({uploadedFiles.length}):
              </p>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem'}}>
                {uploadedFiles.map((file, index) => (
                  <div key={index} style={{
                    padding: '1rem',
                    background: 'var(--primary-light)',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontSize: '0.85rem'
                  }}>
                    <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>
                      {file.type === 'image' && '🖼️'}
                      {file.type === 'video' && '🎥'}
                      {file.type === 'audio' && '🎵'}
                    </div>
                    <div style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'var(--primary-color)',
                      fontWeight: '500'
                    }}>
                      {file.filename}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{display: 'flex', gap: '1rem'}}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              flex: 1,
              padding: '1rem 2rem',
              background: submitting ? '#94A3B8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '1.05rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            {submitting ? '📤 Publishing...' : '🚀 Publish Post'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              padding: '1rem 2rem',
              background: 'white',
              color: 'var(--text-light)',
              border: '2px solid var(--border-color)',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '1.05rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--danger-color)';
              e.currentTarget.style.color = 'var(--danger-color)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.color = 'var(--text-light)';
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateBlogPage;
