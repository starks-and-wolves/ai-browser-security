import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { postService } from '../services/postService';
import toast from 'react-hot-toast';

function HomePage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async (search = '') => {
    try {
      setLoading(true);
      const params = search ? { search } : {};
      const result = await postService.getPosts(params);
      setPosts(result.data || []);
    } catch (error) {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadPosts(searchTerm);
  };

  if (loading) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh'}}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div style={{padding: '3rem 2rem', maxWidth: '1200px', margin: '0 auto'}}>
      {/* Hero Section */}
      <div style={{
        textAlign: 'center',
        marginBottom: '3rem',
        animation: 'fadeIn 0.6s ease-out'
      }}>
        <h1 style={{
          fontSize: '3rem',
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Welcome to My Blog
        </h1>
        <p style={{fontSize: '1.2rem', color: 'var(--text-light)', maxWidth: '600px', margin: '0 auto'}}>
          Discover amazing stories, insights, and ideas from our community
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} style={{
        marginBottom: '3rem',
        maxWidth: '600px',
        margin: '0 auto 3rem auto'
      }}>
        <div style={{
          display: 'flex',
          gap: '1rem',
          background: 'white',
          padding: '0.5rem',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-lg)',
          border: '2px solid var(--border-color)'
        }}>
          <input
            type="text"
            placeholder="🔍 Search posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              padding: '0.75rem',
              fontSize: '1.05rem',
              borderRadius: '8px'
            }}
          />
          <button
            type="submit"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '0.75rem 2rem',
              borderRadius: '8px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Search
          </button>
        </div>
      </form>

      {/* Posts Grid */}
      {posts.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          background: 'white',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{fontSize: '4rem', marginBottom: '1rem'}}>📝</div>
          <h2 style={{marginBottom: '1rem', color: 'var(--text-dark)'}}>No posts yet</h2>
          <p style={{color: 'var(--text-light)', marginBottom: '2rem'}}>
            Be the first to create a post and share your story!
          </p>
          <Link
            to="/create"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '12px',
              fontWeight: '600',
              textDecoration: 'none',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            ✨ Create Your First Post
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '2rem'
        }}>
          {posts.map((post, index) => (
            <div
              key={post._id}
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-md)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-xl)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
            >
              {/* Category Badge */}
              {post.category && (
                <span style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '0.4rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  marginBottom: '1rem'
                }}>
                  {post.category}
                </span>
              )}

              {/* Post Title */}
              <h2 style={{
                fontSize: '1.5rem',
                marginBottom: '0.75rem',
                color: 'var(--text-dark)',
                lineHeight: '1.3'
              }}>
                {post.title}
              </h2>

              {/* Author & Date */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
                color: 'var(--text-light)',
                fontSize: '0.9rem'
              }}>
                <span>👤 {post.authorName}</span>
                <span>•</span>
                <span>📅 {new Date(post.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Content Preview */}
              <p style={{
                color: 'var(--text-light)',
                lineHeight: '1.6',
                marginBottom: '1.5rem',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {post.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
              </p>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem'}}>
                  {post.tags.slice(0, 3).map(tag => (
                    <span key={tag} style={{
                      background: 'var(--primary-light)',
                      color: 'var(--primary-color)',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: '500'
                    }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-color)'
              }}>
                <Link
                  to={`/post/${post._id}`}
                  style={{
                    color: 'var(--primary-color)',
                    fontWeight: '600',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(5px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                >
                  Read More →
                </Link>

                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  color: 'var(--text-light)',
                  fontSize: '0.9rem'
                }}>
                  <span>👁 {post.viewCount}</span>
                  <span>💬 {post.commentsCount}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HomePage;
