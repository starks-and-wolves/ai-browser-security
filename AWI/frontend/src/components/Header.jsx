import { Link } from 'react-router-dom';

function Header() {
  return (
    <header style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '1rem 2rem'
      }}>
        <Link
          to="/"
          style={{
            color: 'white',
            textDecoration: 'none',
            fontSize: '1.75rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'transform 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span style={{fontSize: '2rem'}}>📝</span>
          <span>My Blog</span>
        </Link>

        <div style={{display: 'flex', gap: '1.5rem', alignItems: 'center'}}>
          <Link
            to="/"
            style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: '1.05rem',
              fontWeight: '500',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              background: 'rgba(255, 255, 255, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🏠 Home
          </Link>

          <Link
            to="/create"
            style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: '1.05rem',
              fontWeight: '600',
              padding: '0.65rem 1.5rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.25)',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }}
          >
            ✨ Create Post
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default Header;
