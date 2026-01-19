function Footer() {
  return (
    <footer style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '2rem',
      marginTop: 'auto',
      boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <p style={{fontSize: '1rem', marginBottom: '0.5rem', fontWeight: '500'}}>
          📝 My Blog - Share Your Stories
        </p>
        <p style={{fontSize: '0.9rem', opacity: 0.9}}>
          &copy; 2026 All rights reserved. Built with React & Node.js
        </p>
      </div>
    </footer>
  );
}

export default Footer;
