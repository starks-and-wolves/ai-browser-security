# Security Policy

## 🔒 Security Overview

This document outlines security best practices for the Blog AWI platform.

## ⚠️ IMPORTANT: Secrets and Credentials

### What's Included in This Repository

This repository **DOES NOT** contain any real secrets or credentials. All sensitive values have been replaced with placeholders:

- `<username>:<password>` - MongoDB credentials
- `your-secure-redis-password-here` - Redis password
- `your-secret-key-here` - JWT secrets

### What You MUST Do

1. **Never commit real credentials** to version control
2. **Generate your own secrets** for each environment
3. **Use strong, unique passwords** for all services
4. **Rotate credentials regularly** (every 90 days recommended)
5. **Use environment-specific** `.env` files

## 🔐 Setting Up Credentials

### MongoDB Atlas

1. **Create your own MongoDB Atlas account**: https://www.mongodb.com/cloud/atlas
2. **Create a cluster** and database user
3. **Get your connection string** from Atlas dashboard
4. **Update your `.env` file**:
   ```bash
   MONGODB_URI=mongodb+srv://<your-username>:<your-password>@<your-cluster>.mongodb.net/<your-database>
   ```

**Never use the example credentials from documentation!**

### Redis Password

Generate a strong random password:

```bash
# Generate a 32-character random password
openssl rand -base64 32

# Or use a password manager to generate one
```

Update your `.env` file:
```bash
REDIS_PASSWORD=your-generated-strong-password-here
```

### JWT Secret

Generate a secure JWT secret:

```bash
# Generate a random secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Update your `.env` file:
```bash
JWT_SECRET=your-generated-jwt-secret-here
```

## 🛡️ Security Best Practices

### Environment Variables

✅ **DO:**
- Use `.env` files for secrets
- Keep `.env` files in `.gitignore`
- Use different `.env` files for each environment
- Use environment variable management tools (AWS Secrets Manager, HashiCorp Vault, etc.)
- Document required variables in `.env.example`

❌ **DON'T:**
- Commit `.env` files to version control
- Share `.env` files via email or chat
- Hardcode credentials in source code
- Use the same credentials across environments
- Use example/placeholder credentials in production

### Password Requirements

**Minimum Requirements:**
- **Length:** At least 16 characters
- **Complexity:** Mix of uppercase, lowercase, numbers, special characters
- **Uniqueness:** Different password for each service
- **Randomness:** Use a password generator, not dictionary words

**Example Strong Password:**
```
Kj8vX9mQ2pL5nR7tY4wU6eH3cF1a  ✅ Good
password123                      ❌ Bad
MyPassword2024!                  ❌ Weak
```

### Production Deployment

For production environments:

1. **Use secrets management services:**
   - AWS Secrets Manager
   - Azure Key Vault
   - Google Cloud Secret Manager
   - HashiCorp Vault

2. **Enable authentication:**
   - MongoDB authentication (required)
   - Redis password (required)
   - API key authentication (recommended)

3. **Use HTTPS:**
   - SSL/TLS certificates for all endpoints
   - Redirect HTTP to HTTPS
   - HSTS headers enabled

4. **Enable rate limiting:**
   - Already configured in this application
   - Review and adjust limits in `backend/src/config/rateLimits.js`

5. **Regular security updates:**
   ```bash
   npm audit
   npm audit fix
   ```

## 🔍 Checking for Exposed Secrets

### Before Committing

Always check for accidentally committed secrets:

```bash
# Check for common secret patterns
grep -r "mongodb+srv://" --include="*.js" --include="*.env" .
grep -r "password.*[:=].*[a-zA-Z0-9]" --include="*.env" .

# Use git-secrets (install first)
git secrets --scan
```

### If You Accidentally Committed Secrets

1. **Immediately rotate the credentials** (change passwords)
2. **Remove from git history:**
   ```bash
   # Using BFG Repo-Cleaner (recommended)
   bfg --replace-text passwords.txt

   # Or using git filter-branch
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch path/to/file' \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. **Force push** (if repository is private and you control it)
4. **Contact GitHub support** to purge cache (for public repos)

## 🚨 Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. **Email security contact:** [Add your security email]
3. **Include:**
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## 📋 Security Checklist

Before deploying to production:

- [ ] All `.env` files contain unique, strong credentials
- [ ] `.env` files are in `.gitignore`
- [ ] No secrets committed to git repository
- [ ] MongoDB authentication enabled
- [ ] Redis password configured
- [ ] HTTPS/SSL certificates installed
- [ ] Rate limiting configured and tested
- [ ] Security headers configured (Helmet.js)
- [ ] CORS configured for production domains only
- [ ] Input validation enabled
- [ ] SQL/NoSQL injection protection active
- [ ] XSS protection enabled
- [ ] Regular security updates scheduled
- [ ] Monitoring and logging configured
- [ ] Backup strategy in place

## 🔒 Current Security Features

This application includes:

✅ **Rate Limiting**
- Configurable limits per endpoint
- Burst protection
- Cooldown periods

✅ **Input Validation**
- Express-validator for all inputs
- Sanitization of HTML content
- MongoDB operator stripping

✅ **Security Headers**
- Helmet.js for security headers
- CORS configuration
- Content Security Policy

✅ **Injection Protection**
- NoSQL injection prevention
- XSS protection via sanitize-html
- Command injection detection
- Path traversal protection

✅ **Authentication**
- API key authentication for agents
- Session management
- Rate limit per agent

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [Redis Security](https://redis.io/topics/security)

## 📝 Environment File Template

Use this template for your `.env` file:

```bash
# MongoDB Configuration
# Get your connection string from MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>

# Redis Configuration
# Generate with: openssl rand -base64 32
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<your-generated-password>
REDIS_DB=0

# Server Configuration
PORT=5000
NODE_ENV=production

# JWT Secret
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<your-generated-secret>

# CORS Configuration
# Set to your production domain
CORS_ORIGIN=https://yourdomain.com

# Session Configuration
SESSION_TTL_MINUTES=30

# AWI Configuration
AWI_MODE_ENABLED=true
AWI_USE_REDIS=true
```

## 🔄 Credential Rotation Schedule

**Recommended rotation schedule:**

| Credential | Rotation Frequency | Priority |
|------------|-------------------|----------|
| JWT Secret | Every 90 days | High |
| Redis Password | Every 90 days | High |
| MongoDB Password | Every 180 days | High |
| API Keys | Every 30-90 days | Medium |

## 📞 Contact

For security-related questions:
- Email: [Add your security email]
- Security Policy: This document
- Responsible Disclosure: See "Reporting Security Issues" above

---

**Last Updated:** 2026-01-17
**Version:** 1.0.0

**Remember: Security is everyone's responsibility. When in doubt, ask!**
