#!/usr/bin/env node

/**
 * AWI Security Test Suite
 * Comprehensive automated security testing for OWASP Top 10 and AWI-specific vulnerabilities
 *
 * Usage:
 *   node security-tests.js [options]
 *
 * Options:
 *   --host <url>        API host (default: http://localhost:5000)
 *   --verbose          Show detailed output
 *   --category <name>  Run specific category only
 *   --report <file>    Save report to file
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const payloads = require('./test-payloads');

// Configuration
const config = {
  host: process.argv.find(arg => arg.startsWith('--host='))?.split('=')[1] || 'http://localhost:5000',
  verbose: process.argv.includes('--verbose'),
  category: process.argv.find(arg => arg.startsWith('--category='))?.split('=')[1],
  reportFile: process.argv.find(arg => arg.startsWith('--report='))?.split('=')[1]
};

// Test results storage
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  warnings: 0,
  categories: {},
  startTime: Date.now(),
  endTime: null
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * Make HTTP request
 */
function makeRequest(method, url, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      method,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (body && typeof body === 'object') {
      body = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: jsonData,
            rawBody: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: null,
            rawBody: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

/**
 * Register a test agent
 */
async function registerAgent(permissions = ['read', 'write']) {
  try {
    const response = await makeRequest(
      'POST',
      `${config.host}/api/agent/register`,
      {},
      {
        name: `TestAgent_${Date.now()}`,
        description: 'Security testing agent',
        permissions
      }
    );

    if (response.status === 201 && response.body.apiKey) {
      return response.body.apiKey.key;
    }

    return null;
  } catch (error) {
    console.error('Failed to register agent:', error.message);
    return null;
  }
}

/**
 * Create a test post (for tests that need existing data)
 */
async function createTestPost(apiKey) {
  try {
    const response = await makeRequest(
      'POST',
      `${config.host}/api/agent/posts`,
      { 'X-Agent-API-Key': apiKey },
      {
        title: 'Test Post for Security Testing',
        content: 'This is a test post created for security testing purposes.',
        authorName: 'SecurityTestAgent'
      }
    );

    if (response.status === 201 && response.body.data) {
      return response.body.data._id;
    }

    return null;
  } catch (error) {
    console.error('Failed to create test post:', error.message);
    return null;
  }
}

/**
 * Log test result
 */
function logResult(test, result, details = '') {
  const icon = result === 'PASS' ? '✓' : result === 'FAIL' ? '✗' : result === 'SKIP' ? '○' : '⚠';
  const color = result === 'PASS' ? colors.green : result === 'FAIL' ? colors.red : result === 'SKIP' ? colors.blue : colors.yellow;

  console.log(`${color}${icon}${colors.reset} ${test}`);

  if (details && config.verbose) {
    console.log(`  ${colors.cyan}${details}${colors.reset}`);
  }

  results.total++;
  if (result === 'PASS') results.passed++;
  else if (result === 'FAIL') results.failed++;
  else if (result === 'SKIP') results.skipped++;
  else if (result === 'WARN') results.warnings++;
}

/**
 * Run a single test
 */
async function runTest(test, context = {}) {
  try {
    // Skip if test is just a note
    if (test.note && !test.endpoint) {
      logResult(test.description, 'SKIP', test.note);
      return;
    }

    // Prepare endpoint
    let endpoint = test.endpoint;
    if (endpoint && context.postId) {
      endpoint = endpoint.replace('{postId}', context.postId);
    }

    const url = `${config.host}${endpoint}`;

    // Prepare headers
    const headers = { ...test.headers };
    if (test.requiresAgent && context.apiKey) {
      headers['X-Agent-API-Key'] = context.apiKey;
    } else if (context.apiKey && !test.headers) {
      headers['X-Agent-API-Key'] = context.apiKey;
    }

    // Make request
    const response = await makeRequest(test.method, url, headers, test.body);

    // Check expected status
    if (test.expectedStatus) {
      if (response.status === test.expectedStatus) {
        // Check expected error message
        if (test.expectedError) {
          const bodyStr = JSON.stringify(response.body).toLowerCase();
          if (bodyStr.includes(test.expectedError.toLowerCase())) {
            logResult(test.description, 'PASS', `Status ${response.status} with expected error`);
          } else {
            logResult(test.description, 'FAIL', `Status ${response.status} but wrong error message`);
          }
        } else {
          logResult(test.description, 'PASS', `Status ${response.status}`);
        }
      } else {
        logResult(test.description, 'FAIL', `Expected ${test.expectedStatus}, got ${response.status}`);
      }
    }
    // Check custom response validator
    else if (test.checkResponse) {
      const valid = test.checkResponse(response.body);
      if (valid) {
        logResult(test.description, 'PASS', 'Response validation passed');
      } else {
        logResult(test.description, 'FAIL', 'Response validation failed');
      }
    }
    // Check custom header validator
    else if (test.checkHeaders) {
      const valid = test.checkHeaders(response.headers);
      if (valid) {
        logResult(test.description, 'PASS', 'Headers validation passed');
      } else {
        logResult(test.description, 'FAIL', 'Security headers missing or incorrect');
      }
    }
    // Check sanitization
    else if (test.shouldSanitize) {
      const checkPassed = test.checkResponse(response);
      if (checkPassed) {
        logResult(test.description, 'PASS', 'Content properly sanitized');
      } else {
        logResult(test.description, 'FAIL', 'Content not sanitized');
      }
    }
    // If should allow, check for 2xx status
    else if (test.shouldAllow) {
      if (response.status >= 200 && response.status < 300) {
        logResult(test.description, 'PASS', `Allowed with status ${response.status}`);
      } else {
        logResult(test.description, 'WARN', `Blocked with status ${response.status} - ${test.note || ''}`);
      }
    }
    // Default: check for successful response
    else {
      if (response.status >= 200 && response.status < 300) {
        logResult(test.description, 'PASS', `Status ${response.status}`);
      } else {
        logResult(test.description, 'FAIL', `Status ${response.status}`);
      }
    }

  } catch (error) {
    logResult(test.description, 'FAIL', `Error: ${error.message}`);
  }
}

/**
 * Run test category
 */
async function runCategory(categoryName, tests, context = {}) {
  console.log(`\n${colors.magenta}━━━ ${categoryName.toUpperCase()} ━━━${colors.reset}`);

  results.categories[categoryName] = {
    total: 0,
    passed: 0,
    failed: 0
  };

  if (Array.isArray(tests)) {
    for (const test of tests) {
      await runTest(test, context);
    }
  } else if (typeof tests === 'object') {
    for (const [key, test] of Object.entries(tests)) {
      if (Array.isArray(test)) {
        // Array of tests
        for (const subTest of test) {
          await runTest(subTest, context);
        }
      } else if (test.description && test.endpoint) {
        await runTest(test, context);
      } else if (test.tests) {
        // Nested tests
        for (const subTest of test.tests) {
          await runTest(subTest, context);
        }
      } else if (typeof test === 'object' && !test.note && test.description) {
        // Single test object
        await runTest(test, context);
      }
    }
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log(`${colors.cyan}╔═══════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║   AWI SECURITY TEST SUITE - OWASP TOP 10 COVERAGE    ║${colors.reset}`);
  console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════╝${colors.reset}`);
  console.log(`\nTarget: ${colors.yellow}${config.host}${colors.reset}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  // Register test agents with different permissions
  console.log('Setting up test environment...');
  const apiKeyWrite = await registerAgent(['read', 'write']);
  const apiKeyRead = await registerAgent(['read']);
  const apiKeyFull = await registerAgent(['read', 'write', 'delete']);

  if (!apiKeyWrite) {
    console.error(`${colors.red}Failed to register test agent. Is the server running?${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.green}✓${colors.reset} Test agents registered`);

  // Create test post
  const testPostId = await createTestPost(apiKeyWrite);
  if (testPostId) {
    console.log(`${colors.green}✓${colors.reset} Test post created: ${testPostId}`);
  }

  const context = {
    apiKey: apiKeyWrite,
    apiKeyRead,
    apiKeyFull,
    postId: testPostId
  };

  // Run test categories
  if (config.category) {
    const category = payloads[config.category];
    if (category) {
      await runCategory(config.category, category, context);
    } else {
      console.error(`Category '${config.category}' not found`);
      process.exit(1);
    }
  } else {
    // Run all categories
    await runCategory('A1: Broken Access Control', payloads.brokenAccessControl, context);
    await runCategory('A2: Cryptographic Failures', payloads.cryptographicFailures, context);
    await runCategory('A3: Injection - XSS', payloads.injection.xss, context);
    await runCategory('A3: Injection - NoSQL', payloads.injection.nosql, context);
    await runCategory('A3: Injection - Command', payloads.injection.commandInjection, context);
    await runCategory('A3: Injection - Prompt Injection (AWI)', payloads.injection.promptInjection, context);
    await runCategory('A3: Injection - Path Traversal', payloads.injection.pathTraversal, context);
    await runCategory('A4: Insecure Design', payloads.insecureDesign, context);
    await runCategory('A5: Security Misconfiguration', payloads.securityMisconfiguration, context);
    await runCategory('A7: Authentication Failures', payloads.authenticationFailures, context);
    await runCategory('A8: Data Integrity', payloads.dataIntegrity, context);
    await runCategory('A10: SSRF', payloads.ssrf, context);
    await runCategory('AWI-Specific Attacks', payloads.awiSpecific, context);
    await runCategory('Business Logic', payloads.businessLogic, context);
    await runCategory('Valid Requests (Positive Tests)', payloads.validRequests, context);
  }

  // Print summary
  results.endTime = Date.now();
  const duration = ((results.endTime - results.startTime) / 1000).toFixed(2);

  console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║                    TEST SUMMARY                       ║${colors.reset}`);
  console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════╝${colors.reset}`);
  console.log(`\nTotal Tests:    ${results.total}`);
  console.log(`${colors.green}Passed:         ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed:         ${results.failed}${colors.reset}`);
  console.log(`${colors.yellow}Warnings:       ${results.warnings}${colors.reset}`);
  console.log(`${colors.blue}Skipped:        ${results.skipped}${colors.reset}`);
  console.log(`Duration:       ${duration}s`);

  const passRate = ((results.passed / (results.total - results.skipped)) * 100).toFixed(1);
  console.log(`\nPass Rate:      ${passRate}%`);

  if (results.failed === 0 && results.warnings === 0) {
    console.log(`\n${colors.green}✓ All security tests passed!${colors.reset}`);
  } else if (results.failed === 0) {
    console.log(`\n${colors.yellow}⚠ All tests passed with ${results.warnings} warnings${colors.reset}`);
  } else {
    console.log(`\n${colors.red}✗ Security vulnerabilities detected!${colors.reset}`);
  }

  // Save report if requested
  if (config.reportFile) {
    const report = {
      timestamp: new Date().toISOString(),
      host: config.host,
      duration: duration,
      summary: {
        total: results.total,
        passed: results.passed,
        failed: results.failed,
        warnings: results.warnings,
        skipped: results.skipped,
        passRate: passRate
      },
      categories: results.categories
    };

    require('fs').writeFileSync(config.reportFile, JSON.stringify(report, null, 2));
    console.log(`\nReport saved to: ${config.reportFile}`);
  }

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
