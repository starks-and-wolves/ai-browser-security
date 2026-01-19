# Security Tests - Quick Start Guide

## TL;DR

```bash
cd backend/tests/security
./run-tests.sh
```

## What This Tests

✅ **OWASP Top 10 Coverage**
- Injection attacks (XSS, NoSQL, Command, Prompt Injection)
- Broken access control
- Authentication failures
- Security misconfiguration
- And more...

✅ **AWI-Specific Attacks**
- Prompt injection (AI agent manipulation)
- Metadata poisoning
- Action poisoning
- Schema manipulation

✅ **49 Total Tests** covering all major attack vectors

## Commands

```bash
# Run all tests
./run-tests.sh

# Quick smoke test (critical vulnerabilities only)
./run-tests.sh smoke

# Run specific category
./run-tests.sh category injection

# Generate detailed report
./run-tests.sh report

# Verbose output
./run-tests.sh --verbose

# CI/CD mode
./run-tests.sh ci
```

## Or use Node directly

```bash
# All tests
node security-tests.js

# Specific category
node security-tests.js --category=injection

# With report
node security-tests.js --report=report.json

# Verbose
node security-tests.js --verbose

# Different host
node security-tests.js --host=https://staging.example.com
```

## Reading Results

- **✓ PASS (Green)** - Security working correctly
- **✗ FAIL (Red)** - Vulnerability found - NEEDS FIX
- **⚠ WARN (Yellow)** - Potential issue - REVIEW
- **○ SKIP (Blue)** - Not implemented yet

## Current Status

**Phase 1: 53.1% passing** (26/49 tests)

### ✅ Working Well
- XSS prevention (75%)
- Prompt injection detection (86%)
- HTML sanitization
- Security headers
- Valid content processing

### ⚠️ Needs Attention
- NoSQL query injection (20% passing)
- Some access control edge cases
- Path traversal validation
- Some XSS edge cases

### ⏳ Planned (Phase 2/3)
- Rate limiting
- Metadata injection protection
- Duplicate content detection
- Advanced monitoring

## Test Categories

| Category | Tests | Status |
|----------|-------|--------|
| **Broken Access Control** | 4 | 2/4 ✅ |
| **Cryptographic Failures** | 1 | 1/1 ✅ |
| **XSS Injection** | 8 | 6/8 ✅ |
| **NoSQL Injection** | 5 | 1/5 ⚠️ |
| **Command Injection** | 2 | 1/2 ⚠️ |
| **Prompt Injection** | 7 | 6/7 ✅ |
| **Path Traversal** | 1 | 0/1 ❌ |
| **Insecure Design** | 2 | 0/2 ⏳ |
| **Security Config** | 2 | 2/2 ✅ |
| **Authentication** | 2 | 1/2 ⚠️ |
| **Data Integrity** | 1 | 0/1 ⚠️ |
| **SSRF** | 2 | 2/2 ✅ |
| **AWI-Specific** | 4 | 0/4 ⏳ |
| **Business Logic** | 5 | 3/5 ✅ |
| **Valid Requests** | 3 | 3/3 ✅ |

## Prerequisites

1. Backend server must be running:
   ```bash
   cd backend && npm start
   ```

2. MongoDB must be connected

## Files

- `test-payloads.js` - All attack payloads (850+ lines)
- `security-tests.js` - Test runner (440+ lines)
- `run-tests.sh` - Bash wrapper script
- `README.md` - Full documentation
- `PHASE1_STATUS.md` - Detailed status report
- `QUICKSTART.md` - This file

## Example Output

```
╔═══════════════════════════════════════════════════════╗
║   AWI SECURITY TEST SUITE - OWASP TOP 10 COVERAGE    ║
╚═══════════════════════════════════════════════════════╝

Target: http://localhost:5000
Time: 2026-01-11T08:00:00.000Z

Setting up test environment...
✓ Test agents registered
✓ Test post created

━━━ A3: INJECTION - XSS ━━━
✓ Script tag injection in title
✓ Iframe injection
✓ JavaScript protocol in links
✓ Data URI XSS

━━━ A3: INJECTION - PROMPT INJECTION (AWI) ━━━
✓ System prompt override
✓ You are now instruction
✓ New instructions marker
✓ Disregard keyword

╔═══════════════════════════════════════════════════════╗
║                    TEST SUMMARY                       ║
╚═══════════════════════════════════════════════════════╝

Total Tests:    49
Passed:         26
Failed:         22
Warnings:       1
Skipped:        0
Duration:       3.58s

Pass Rate:      53.1%
```

## Next Steps

1. **Review failed tests** - Check PHASE1_STATUS.md for details
2. **Fix critical issues** - NoSQL injection, access control
3. **Run regularly** - Before every commit
4. **Add to CI/CD** - Automate security testing

## Need Help?

- Full documentation: `README.md`
- Detailed status: `PHASE1_STATUS.md`
- Test payloads: `test-payloads.js`
- Implementation plan: `~/.claude/plans/eventual-beaming-snowglobe.md`

## Add to npm scripts

In `backend/package.json`:

```json
{
  "scripts": {
    "test:security": "node tests/security/security-tests.js",
    "test:security:quick": "bash tests/security/run-tests.sh smoke"
  }
}
```

Then:
```bash
npm run test:security
```
