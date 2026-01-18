import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { postService } from '../services/postService';
import { commentService } from '../services/commentService';
import { uploadService } from '../services/uploadService';
import toast from 'react-hot-toast';

function BlogPostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState({ content: '', authorName: '' });
  const [commentsExpanded, setCommentsExpanded] = useState(true);
  const [showCommentForm, setShowCommentForm] = useState(false);

  useEffect(() => {
    loadPost();
    loadComments();
  }, [id]);

  const loadPost = async () => {
    try {
      const result = await postService.getPostById(id);
      setPost(result.data);
      await postService.incrementViewCount(id);
    } catch (error) {
      toast.error('Failed to load post');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const result = await commentService.getCommentsByPost(id);
      setComments(result.data || []);
    } catch (error) {
      console.error('Failed to load comments');
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.content.trim()) {
      toast.error('Comment content is required');
      return;
    }

    try {
      await commentService.createComment({ postId: id, ...newComment });
      toast.success('Comment added!');
      setNewComment({ content: '', authorName: '' });
      setShowCommentForm(false);
      loadComments();
      loadPost();
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      await commentService.deleteComment(commentId);
      toast.success('Comment deleted');
      loadComments();
      loadPost();
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };

  if (loading) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh'}}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!post) return <div style={{padding: '2rem', textAlign: 'center'}}>Post not found</div>;

  return (
    <div style={{padding: '3rem 2rem', maxWidth: '900px', margin: '0 auto'}}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        style={{
          marginBottom: '2rem',
          padding: '0.75rem 1.5rem',
          background: 'white',
          color: 'var(--primary-color)',
          border: '2px solid var(--primary-color)',
          borderRadius: '12px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--primary-color)';
          e.currentTarget.style.color = 'white';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'white';
          e.currentTarget.style.color = 'var(--primary-color)';
        }}
      >
        ← Back to Home
      </button>

      {/* Article Card */}
      <article style={{
        background: 'white',
        borderRadius: '20px',
        padding: '3rem',
        boxShadow: 'var(--shadow-lg)',
        marginBottom: '2rem',
        animation: 'fadeIn 0.5s ease-out'
      }}>
        {/* Category Badge */}
        {post.category && (
          <span style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '0.5rem 1.25rem',
            borderRadius: '20px',
            fontSize: '0.9rem',
            fontWeight: '600',
            marginBottom: '1.5rem'
          }}>
            {post.category}
          </span>
        )}

        {/* Title */}
        <h1 style={{
          fontSize: '2.5rem',
          marginBottom: '1.5rem',
          color: 'var(--text-dark)',
          lineHeight: '1.2'
        }}>
          {post.title}
        </h1>

        {/* Meta Info */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '1.5rem',
          paddingBottom: '1.5rem',
          marginBottom: '2rem',
          borderBottom: '2px solid var(--border-color)',
          color: 'var(--text-light)',
          fontSize: '1rem'
        }}>
          <span style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            👤 <strong style={{color: 'var(--text-dark)'}}>{post.authorName}</strong>
          </span>
          <span>•</span>
          <span>📅 {new Date(post.createdAt).toLocaleDateString()}</span>
          <span>•</span>
          <span>👁 {post.viewCount} views</span>
          <span>•</span>
          <span>💬 {post.commentsCount} comments</span>
        </div>

        {/* Content */}
        <div
          style={{
            fontSize: '1.1rem',
            lineHeight: '1.8',
            color: 'var(--text-dark)',
            marginBottom: '2rem'
          }}
          dangerouslySetInnerHTML={{__html: post.content}}
        />

        {/* Media Files */}
        {post.mediaFiles && post.mediaFiles.length > 0 && (
          <div style={{marginTop: '2rem', marginBottom: '2rem'}}>
            <h3 style={{marginBottom: '1.5rem', color: 'var(--text-dark)'}}>📎 Media</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '1.5rem'
            }}>
              {post.mediaFiles.map((file, index) => (
                <div key={index} style={{
                  border: '2px solid var(--border-color)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
                >
                  {file.type === 'image' && (
                    <img
                      src={uploadService.getFileUrl(file.url)}
                      alt={file.filename}
                      style={{width: '100%', height: 'auto', display: 'block'}}
                    />
                  )}
                  {file.type === 'video' && (
                    <video controls style={{width: '100%', height: 'auto'}}>
                      <source src={uploadService.getFileUrl(file.url)} type={file.mimeType} />
                    </video>
                  )}
                  {file.type === 'audio' && (
                    <div style={{padding: '1rem', background: 'var(--bg-gray)'}}>
                      <p style={{marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: '500'}}>
                        🎵 {file.filename}
                      </p>
                      <audio controls style={{width: '100%'}}>
                        <source src={uploadService.getFileUrl(file.url)} type={file.mimeType} />
                      </audio>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '2px solid var(--border-color)'
          }}>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.75rem'}}>
              {post.tags.map(tag => (
                <span key={tag} style={{
                  background: 'var(--primary-light)',
                  color: 'var(--primary-color)',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}>
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* Comments Section - Collapsible */}
      <section style={{
        background: 'white',
        borderRadius: '20px',
        padding: '2rem',
        boxShadow: 'var(--shadow-lg)',
        animation: 'fadeIn 0.6s ease-out'
      }}>
        {/* Comments Header - Clickable */}
        <div
          onClick={() => setCommentsExpanded(!commentsExpanded)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            padding: '1rem',
            background: 'var(--bg-gray)',
            borderRadius: '12px',
            marginBottom: commentsExpanded ? '1.5rem' : '0',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#E5E7EB'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-gray)'}
        >
          <h2 style={{
            margin: 0,
            fontSize: '1.75rem',
            color: 'var(--text-dark)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            💬 Comments ({comments.length})
          </h2>
          <span style={{
            fontSize: '1.5rem',
            transform: commentsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease'
          }}>
            ▼
          </span>
        </div>

        {/* Collapsible Content */}
        {commentsExpanded && (
          <div style={{animation: 'slideDown 0.4s ease-out'}}>
            {/* Add Comment Button */}
            {!showCommentForm && (
              <button
                onClick={() => setShowCommentForm(true)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '600',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                ✍️ Add a Comment
              </button>
            )}

            {/* Comment Form */}
            {showCommentForm && (
              <form onSubmit={handleCommentSubmit} style={{
                marginBottom: '2rem',
                padding: '1.5rem',
                background: 'var(--bg-gray)',
                borderRadius: '12px',
                animation: 'slideDown 0.3s ease-out'
              }}>
                <h3 style={{marginBottom: '1rem', color: 'var(--text-dark)'}}>✍️ Write a Comment</h3>
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={newComment.authorName}
                  onChange={(e) => setNewComment({...newComment, authorName: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    border: '2px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                />
                <textarea
                  placeholder="Share your thoughts..."
                  value={newComment.content}
                  onChange={(e) => setNewComment({...newComment, content: e.target.value})}
                  required
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    border: '2px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
                <div style={{display: 'flex', gap: '1rem'}}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Post Comment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCommentForm(false);
                      setNewComment({ content: '', authorName: '' });
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'white',
                      color: 'var(--text-light)',
                      border: '2px solid var(--border-color)',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Comments List */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              {comments.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '3rem',
                  color: 'var(--text-light)'
                }}>
                  <div style={{fontSize: '3rem', marginBottom: '1rem'}}>💭</div>
                  <p>No comments yet. Be the first to share your thoughts!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment._id}
                    style={{
                      padding: '1.5rem',
                      background: 'var(--bg-gray)',
                      borderRadius: '12px',
                      border: '2px solid var(--border-color)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      marginBottom: '0.75rem'
                    }}>
                      <div>
                        <strong style={{fontSize: '1.05rem', color: 'var(--text-dark)'}}>
                          {comment.authorName || 'Anonymous'}
                        </strong>
                        <div style={{
                          color: 'var(--text-light)',
                          fontSize: '0.85rem',
                          marginTop: '0.25rem'
                        }}>
                          {new Date(comment.createdAt).toLocaleDateString()} at{' '}
                          {new Date(comment.createdAt).toLocaleTimeString()}
                          {comment.isEdited && (
                            <span style={{marginLeft: '0.5rem', fontStyle: 'italic'}}>(edited)</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteComment(comment._id)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'var(--danger-color)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                    <p style={{
                      lineHeight: '1.6',
                      color: 'var(--text-dark)',
                      margin: 0
                    }}>
                      {comment.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default BlogPostPage;
