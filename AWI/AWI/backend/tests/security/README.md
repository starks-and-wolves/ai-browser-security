# AWI Security Test Suite

Comprehensive automated security testing for the Agent Web Interface, covering **OWASP Top 10** vulnerabilities and **AWI-specific attack vectors**.

## Overview

This test suite validates security controls against:

- **A1: Broken Access Control** - Authentication, authorization, permission checks
- **A2: Cryptographic Failures** - API key exposure, sensitive data leakage
- **A3: Injection** - XSS, NoSQL, Command, Prompt Injection, Path Traversal
- **A4: Insecure Design** - Rate limiting, metadata manipulation
- **A5: Security Misconfiguration** - Error disclosure, security headers
- **A6: Vulnerable Components** - Dependency vulnerabilities
- **A7: Authentication Failures** - Weak credentials, brute force protection
- **A8: Data Integrity** - Deserialization, prototype pollution
- **A9: Logging Failures** - Audit trails, monitoring
- **A10: SSRF** - Internal URL access, file:// protocol
- **AWI-Specific** - Action poisoning, schema poisoning, semantic confusion
- **Business Logic** - Input validation, array limits, type checking

## Quick Start

### Prerequisites

1. **Backend server must be running:**
   ```bash
   cd /Users/hritish.jain/ai_security/AWI/backend
   npm start
   ```

2. **MongoDB must be connected**

### Run All Tests

```bash
node security-tests.js
```

### Run Specific Category

```bash
# Test only XSS vulnerabilities
node security-tests.js --category=injection

# Test access control
node security-tests.js --category=brokenAccessControl
```

### Verbose Output

```bash
node security-tests.js --verbose
```

### Save Report to File

```bash
node security-tests.js --report=security-report.json
```

### Test Against Different Host

```bash
node security-tests.js --host=https://api.example.com
```

## Test Categories

### A1: Broken Access Control

Tests authentication and authorization:

- ✓ No API key provided (should reject)
- ✓ Invalid API key (should reject)
- ✓ Permission bypass (read-only trying to write)
- ✓ Horizontal privilege escalation

**Expected:** All access control tests should PASS (properly rejected)

### A2: Cryptographic Failures

Tests sensitive data exposure:

- ✓ API keys not exposed in responses
- ✓ Internal data not leaked

**Expected:** No sensitive data in responses

### A3: Injection - XSS

Tests Cross-Site Scripting prevention:

- ✓ Script tag injection
- ✓ Event handler injection (onerror, onclick)
- ✓ Iframe injection
- ✓ JavaScript protocol
- ✓ Data URI XSS
- ✓ SVG XSS
- ✓ HTML entity encoded XSS
- ✓ Style tag with expressions

**Expected:** All XSS attempts blocked or sanitized

### A3: Injection - NoSQL

Tests MongoDB injection prevention:

- ✓ $ne operator injection
- ✓ $where clause injection
- ✓ $regex injection
- ✓ Prototype pollution (__proto__)
- ✓ Operators in request body

**Expected:** All operators sanitized as literal strings

### A3: Injection - Prompt Injection (AWI-Specific)

Tests AI agent manipulation:

- ✓ "Ignore all previous instructions"
- ✓ "SYSTEM PROMPT" override
- ✓ "You are now" statements
- ✓ "NEW INSTRUCTIONS" markers
- ✓ "Disregard" keyword
- ✓ Hidden prompts in comments
- ✓ Jailbreak attempts

**Expected:** All prompt injection attempts detected and blocked

### A3: Injection - Command

Tests command injection prevention:

- ✓ Shell commands (; rm -rf)
- ✓ Command substitution ($(), ``)

**Expected:** All command injection attempts blocked

### A3: Injection - Path Traversal

Tests directory traversal:

- ✓ ../ in URLs
- ✓ Absolute paths

**Expected:** Path traversal blocked

### A4: Insecure Design

Tests security design:

- ⏳ Rate limiting (Phase 2)
- ⏳ Metadata injection protection (Phase 3)

**Expected:** Will be tested after Phase 2/3 implementation

### A5: Security Misconfiguration

Tests configuration security:

- ✓ No verbose error messages
- ✓ Security headers present (Helmet)
- ✓ No stack traces exposed

**Expected:** Proper security headers and error handling

### A7: Authentication Failures

Tests authentication security:

- ✓ Weak credentials detection
- ✓ Brute force protection

**Expected:** Strong authentication requirements

### A8: Data Integrity

Tests data integrity:

- ✓ Safe JSON deserialization
- ✓ No prototype pollution

**Expected:** Safe data handling

### A10: SSRF

Tests Server-Side Request Forgery:

- ⏳ Internal URL blocking (Phase 3)
- ⏳ file:// protocol blocking (Phase 3)

**Expected:** URL validation in Phase 3

### AWI-Specific Attacks

Tests unique AWI vulnerabilities:

- ⏳ Action poisoning prevention (Phase 3)
- ⏳ Schema poisoning detection (Phase 3)
- ✓ Semantic confusion handling
- ⏳ Duplicate content detection (Phase 2)

### Business Logic

Tests business rule validation:

- ✓ Negative values rejected
- ✓ Large values capped
- ✓ Invalid data types rejected
- ✓ Content length limits enforced
- ✓ Array size limits enforced

**Expected:** All business rules properly validated

### Positive Tests

Validates legitimate requests work:

- ✓ Valid post with safe HTML
- ✓ Valid comment
- ✓ Valid search

**Expected:** All valid requests succeed

## Understanding Results

### Test Status

- **✓ PASS (Green)** - Security control working correctly
- **✗ FAIL (Red)** - Vulnerability detected - MUST FIX
- **⚠ WARN (Yellow)** - Potential issue - REVIEW
- **○ SKIP (Blue)** - Not yet implemented or N/A

### Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed (vulnerabilities detected)

## Current Security Status

### ✅ Phase 1 Implemented (Input Validation & Sanitization)

- [x] HTML sanitization (allows safe tags, blocks scripts)
- [x] NoSQL injection protection
- [x] Prompt injection detection
- [x] Input validation (length, format, patterns)
- [x] XSS prevention
- [x] Command injection blocking
- [x] Global request body sanitization

### ⏳ Phase 2 Planned (Agent Behavior Monitoring)

- [ ] Rate limiting per agent
- [ ] Content security analyzer
- [ ] Duplicate content detection
- [ ] Audit logging
- [ ] Security event tracking
- [ ] Agent reputation system

### ⏳ Phase 3 Planned (Metadata Security)

- [ ] Metadata sanitization (_metadata stripping)
- [ ] URL validation and whitelisting
- [ ] Schema.org type validation
- [ ] Permission-aware action generation
- [ ] Digital signatures for metadata

## Example Output

```
╔═══════════════════════════════════════════════════════╗
║   AWI SECURITY TEST SUITE - OWASP TOP 10 COVERAGE    ║
╚═══════════════════════════════════════════════════════╝

Target: http://localhost:5000
Time: 2026-01-11T08:00:00.000Z

Setting up test environment...
✓ Test agents registered
✓ Test post created: 507f1f77bcf86cd799439011

━━━ A1: BROKEN ACCESS CONTROL ━━━
✓ Attempt to access protected endpoint without API key
✓ Attempt with invalid API key
✓ Read-only agent attempting to create post
○ Agent A trying to access Agent B's data

━━━ A3: INJECTION - XSS ━━━
✓ Script tag injection in title
✓ Event handler injection in content
✓ Iframe injection
✓ JavaScript protocol in links
✓ Data URI XSS
✓ SVG XSS
✓ HTML entity encoded XSS
✓ Style tag with expression

━━━ A3: INJECTION - PROMPT INJECTION (AWI) ━━━
✓ Ignore previous instructions
✓ System prompt override
✓ You are now instruction
✓ New instructions marker
✓ Disregard keyword

╔═══════════════════════════════════════════════════════╗
║                    TEST SUMMARY                       ║
╚═══════════════════════════════════════════════════════╝

Total Tests:    45
Passed:         38
Failed:         0
Warnings:       2
Skipped:        5
Duration:       3.45s

Pass Rate:      100.0%

✓ All security tests passed!
```

## CI/CD Integration

### Add to GitHub Actions

```yaml
name: Security Tests

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install
        working-directory: backend

      - name: Start MongoDB
        uses: supercharge/mongodb-github-action@1.10.0

      - name: Start server
        run: npm start &
        working-directory: backend
        env:
          MONGODB_URI: mongodb://localhost:27017/test

      - name: Wait for server
        run: sleep 10

      - name: Run security tests
        run: node tests/security/security-tests.js --report=security-report.json
        working-directory: backend

      - name: Upload report
        uses: actions/upload-artifact@v2
        with:
          name: security-report
          path: backend/security-report.json
```

### Add to npm scripts

In `package.json`:

```json
{
  "scripts": {
    "test:security": "node tests/security/security-tests.js",
    "test:security:verbose": "node tests/security/security-tests.js --verbose",
    "test:security:report": "node tests/security/security-tests.js --report=security-report.json"
  }
}
```

Then run:

```bash
npm run test:security
```

## Adding Custom Tests

### 1. Add payload to `test-payloads.js`

```javascript
module.exports = {
  // ... existing tests

  customCategory: {
    myTest: {
      description: "Test description",
      endpoint: "/api/agent/posts",
      method: "POST",
      body: { /* test data */ },
      expectedStatus: 400,
      expectedError: "error message"
    }
  }
};
```

### 2. Add category to test runner

In `security-tests.js`, add to `runAllTests()`:

```javascript
await runCategory('Custom Tests', payloads.customCategory, context);
```

## Troubleshooting

### Server Not Running

```
Failed to register test agent. Is the server running?
```

**Solution:** Start the backend server:
```bash
cd backend && npm start
```

### Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:5000
```

**Solution:** Verify server is running on port 5000 or use `--host` flag

### MongoDB Not Connected

Tests may fail if MongoDB is not connected. Check backend logs.

## Best Practices

1. **Run before every commit** - Catch vulnerabilities early
2. **Run after dependency updates** - Verify no new vulnerabilities
3. **Add to CI/CD pipeline** - Automated security testing
4. **Review warnings** - Not all warnings are critical, but review them
5. **Keep payloads updated** - Add new attack vectors as discovered
6. **Test in staging** - Before production deployment

## Security Testing Schedule

- **Every commit**: Run full test suite
- **Weekly**: Review failed/warned tests
- **Monthly**: Update test payloads with new attack vectors
- **After Phase 2/3**: Update tests for new security features

## Resources

- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [OWASP Injection Attacks](https://owasp.org/www-community/Injection_Flaws)
- [Prompt Injection Guide](https://simonwillison.net/2023/Apr/14/worst-that-can-happen/)
- [NoSQL Injection](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05.6-Testing_for_NoSQL_Injection)

## Support

For issues or questions:
- Check server logs: `backend/logs/`
- Review test output with `--verbose` flag
- Check implementation plan: `~/.claude/plans/eventual-beaming-snowglobe.md`
