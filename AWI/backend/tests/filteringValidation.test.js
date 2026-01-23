/**
 * Filtering and Sorting API Validation Tests
 * Tests the new filtering and sorting functionality added to GET /api/agent/posts
 *
 * Run with: node tests/filteringValidation.test.js
 */

const http = require('http');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const API_PATH = '/api/agent/posts';

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failedTestDetails = [];

/**
 * Make HTTP request
 */
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);

    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Test assertion helper
 */
function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`${colors.green}✓${colors.reset} ${testName}`);
    return true;
  } else {
    failedTests++;
    console.log(`${colors.red}✗${colors.reset} ${testName}`);
    if (details) {
      console.log(`  ${colors.yellow}Details: ${details}${colors.reset}`);
    }
    failedTestDetails.push({ test: testName, details });
    return false;
  }
}

/**
 * Test Suite Runner
 */
async function runTests() {
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  Filtering & Sorting API Validation Tests${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);
  console.log(`Testing endpoint: ${BASE_URL}${API_PATH}\n`);

  try {
    // Test 1: Server Connectivity
    console.log(`${colors.cyan}1. Server Connectivity Tests${colors.reset}`);
    await testServerConnectivity();
    console.log('');

    // Test 2: Basic GET Request
    console.log(`${colors.cyan}2. Basic GET Request Tests${colors.reset}`);
    await testBasicGetRequest();
    console.log('');

    // Test 3: Pagination
    console.log(`${colors.cyan}3. Pagination Tests${colors.reset}`);
    await testPagination();
    console.log('');

    // Test 4: View Filtering
    console.log(`${colors.cyan}4. View Count Filtering Tests${colors.reset}`);
    await testViewFiltering();
    console.log('');

    // Test 5: Comment Filtering
    console.log(`${colors.cyan}5. Comment Count Filtering Tests${colors.reset}`);
    await testCommentFiltering();
    console.log('');

    // Test 6: Sorting
    console.log(`${colors.cyan}6. Sorting Tests${colors.reset}`);
    await testSorting();
    console.log('');

    // Test 7: Combined Filters
    console.log(`${colors.cyan}7. Combined Filters Tests${colors.reset}`);
    await testCombinedFilters();
    console.log('');

    // Test 8: Edge Cases
    console.log(`${colors.cyan}8. Edge Cases and Validation Tests${colors.reset}`);
    await testEdgeCases();
    console.log('');

    // Test 9: Response Format
    console.log(`${colors.cyan}9. Response Format Tests${colors.reset}`);
    await testResponseFormat();
    console.log('');

  } catch (error) {
    console.error(`${colors.red}Fatal Error:${colors.reset}`, error.message);
  }

  // Print Summary
  printSummary();
}

/**
 * Test 1: Server Connectivity
 */
async function testServerConnectivity() {
  try {
    const response = await makeRequest(API_PATH);
    assert(
      response.status === 200 || response.status === 401,
      'Server is reachable',
      `Status: ${response.status}`
    );
    assert(
      response.data !== null,
      'Server returns valid response'
    );
  } catch (error) {
    assert(false, 'Server is reachable', `Error: ${error.message}`);
  }
}

/**
 * Test 2: Basic GET Request
 */
async function testBasicGetRequest() {
  try {
    const response = await makeRequest(`${API_PATH}?limit=5`);

    assert(
      response.status === 200 || response.status === 401,
      'Basic GET request succeeds',
      `Status: ${response.status}`
    );

    if (response.status === 200 && response.data.success) {
      assert(
        Array.isArray(response.data.data),
        'Response contains data array'
      );
      assert(
        response.data.pagination !== undefined,
        'Response contains pagination object'
      );
    }
  } catch (error) {
    assert(false, 'Basic GET request succeeds', error.message);
  }
}

/**
 * Test 3: Pagination
 */
async function testPagination() {
  try {
    const response = await makeRequest(`${API_PATH}?page=1&limit=5`);

    if (response.status === 200 && response.data.success) {
      const { pagination } = response.data;

      assert(
        pagination.page === 1,
        'Pagination page number is correct'
      );
      assert(
        pagination.limit === 5,
        'Pagination limit is correct'
      );
      assert(
        pagination.total !== undefined,
        'Pagination includes total count'
      );
      assert(
        pagination.pages !== undefined,
        'Pagination includes total pages'
      );
    }
  } catch (error) {
    assert(false, 'Pagination tests', error.message);
  }
}

/**
 * Test 4: View Filtering
 */
async function testViewFiltering() {
  try {
    // Test minViews
    const minViewsResponse = await makeRequest(`${API_PATH}?minViews=100`);
    assert(
      minViewsResponse.status === 200 || minViewsResponse.status === 401,
      'minViews parameter accepted',
      `Status: ${minViewsResponse.status}`
    );

    if (minViewsResponse.status === 200 && minViewsResponse.data.success) {
      const posts = minViewsResponse.data.data;
      if (posts && posts.length > 0) {
        const allAboveMin = posts.every(post => post.viewCount >= 100);
        assert(
          allAboveMin,
          'All posts have viewCount >= minViews',
          `Sample: ${posts[0]?.viewCount}`
        );
      }

      assert(
        minViewsResponse.data.filters?.minViews !== undefined,
        'Response includes minViews in filters object'
      );
    }

    // Test maxViews
    const maxViewsResponse = await makeRequest(`${API_PATH}?maxViews=1000`);
    assert(
      maxViewsResponse.status === 200 || maxViewsResponse.status === 401,
      'maxViews parameter accepted'
    );

    if (maxViewsResponse.status === 200 && maxViewsResponse.data.success) {
      const posts = maxViewsResponse.data.data;
      if (posts && posts.length > 0) {
        const allBelowMax = posts.every(post => post.viewCount <= 1000);
        assert(
          allBelowMax,
          'All posts have viewCount <= maxViews',
          `Sample: ${posts[0]?.viewCount}`
        );
      }
    }

    // Test range
    const rangeResponse = await makeRequest(`${API_PATH}?minViews=100&maxViews=1000`);
    assert(
      rangeResponse.status === 200 || rangeResponse.status === 401,
      'View count range (minViews + maxViews) accepted'
    );

    if (rangeResponse.status === 200 && rangeResponse.data.success) {
      const posts = rangeResponse.data.data;
      if (posts && posts.length > 0) {
        const allInRange = posts.every(post => post.viewCount >= 100 && post.viewCount <= 1000);
        assert(
          allInRange,
          'All posts are within view count range',
          `Sample: ${posts[0]?.viewCount}`
        );
      }
    }

  } catch (error) {
    assert(false, 'View filtering tests', error.message);
  }
}

/**
 * Test 5: Comment Filtering
 */
async function testCommentFiltering() {
  try {
    // Test minComments
    const minCommentsResponse = await makeRequest(`${API_PATH}?minComments=5`);
    assert(
      minCommentsResponse.status === 200 || minCommentsResponse.status === 401,
      'minComments parameter accepted'
    );

    if (minCommentsResponse.status === 200 && minCommentsResponse.data.success) {
      const posts = minCommentsResponse.data.data;
      if (posts && posts.length > 0) {
        const allAboveMin = posts.every(post => post.commentsCount >= 5);
        assert(
          allAboveMin,
          'All posts have commentsCount >= minComments',
          `Sample: ${posts[0]?.commentsCount}`
        );
      }

      assert(
        minCommentsResponse.data.filters?.minComments !== undefined,
        'Response includes minComments in filters object'
      );
    }

    // Test maxComments
    const maxCommentsResponse = await makeRequest(`${API_PATH}?maxComments=50`);
    assert(
      maxCommentsResponse.status === 200 || maxCommentsResponse.status === 401,
      'maxComments parameter accepted'
    );

    if (maxCommentsResponse.status === 200 && maxCommentsResponse.data.success) {
      const posts = maxCommentsResponse.data.data;
      if (posts && posts.length > 0) {
        const allBelowMax = posts.every(post => post.commentsCount <= 50);
        assert(
          allBelowMax,
          'All posts have commentsCount <= maxComments',
          `Sample: ${posts[0]?.commentsCount}`
        );
      }
    }

    // Test range
    const rangeResponse = await makeRequest(`${API_PATH}?minComments=5&maxComments=20`);
    assert(
      rangeResponse.status === 200 || rangeResponse.status === 401,
      'Comment count range (minComments + maxComments) accepted'
    );

  } catch (error) {
    assert(false, 'Comment filtering tests', error.message);
  }
}

/**
 * Test 6: Sorting
 */
async function testSorting() {
  try {
    // Test sortBy viewCount
    const viewCountSortResponse = await makeRequest(`${API_PATH}?sortBy=viewCount&sortOrder=desc&limit=5`);
    assert(
      viewCountSortResponse.status === 200 || viewCountSortResponse.status === 401,
      'sortBy=viewCount parameter accepted'
    );

    if (viewCountSortResponse.status === 200 && viewCountSortResponse.data.success) {
      const posts = viewCountSortResponse.data.data;
      if (posts && posts.length > 1) {
        const isDescending = posts[0].viewCount >= posts[posts.length - 1].viewCount;
        assert(
          isDescending,
          'Posts sorted by viewCount in descending order',
          `First: ${posts[0].viewCount}, Last: ${posts[posts.length - 1].viewCount}`
        );
      }

      assert(
        viewCountSortResponse.data.filters?.sortBy === 'viewCount',
        'Response includes sortBy in filters object'
      );
      assert(
        viewCountSortResponse.data.filters?.sortOrder === 'desc',
        'Response includes sortOrder in filters object'
      );
    }

    // Test sortBy commentsCount
    const commentsCountSortResponse = await makeRequest(`${API_PATH}?sortBy=commentsCount&sortOrder=desc&limit=5`);
    assert(
      commentsCountSortResponse.status === 200 || commentsCountSortResponse.status === 401,
      'sortBy=commentsCount parameter accepted'
    );

    if (commentsCountSortResponse.status === 200 && commentsCountSortResponse.data.success) {
      const posts = commentsCountSortResponse.data.data;
      if (posts && posts.length > 1) {
        const isDescending = posts[0].commentsCount >= posts[posts.length - 1].commentsCount;
        assert(
          isDescending,
          'Posts sorted by commentsCount in descending order',
          `First: ${posts[0].commentsCount}, Last: ${posts[posts.length - 1].commentsCount}`
        );
      }
    }

    // Test sortBy createdAt (default)
    const createdAtSortResponse = await makeRequest(`${API_PATH}?sortBy=createdAt&sortOrder=desc&limit=5`);
    assert(
      createdAtSortResponse.status === 200 || createdAtSortResponse.status === 401,
      'sortBy=createdAt parameter accepted'
    );

    // Test sortBy title
    const titleSortResponse = await makeRequest(`${API_PATH}?sortBy=title&sortOrder=asc&limit=5`);
    assert(
      titleSortResponse.status === 200 || titleSortResponse.status === 401,
      'sortBy=title parameter accepted'
    );

    // Test sortOrder asc
    const ascOrderResponse = await makeRequest(`${API_PATH}?sortBy=viewCount&sortOrder=asc&limit=5`);
    assert(
      ascOrderResponse.status === 200 || ascOrderResponse.status === 401,
      'sortOrder=asc parameter accepted'
    );

    if (ascOrderResponse.status === 200 && ascOrderResponse.data.success) {
      const posts = ascOrderResponse.data.data;
      if (posts && posts.length > 1) {
        const isAscending = posts[0].viewCount <= posts[posts.length - 1].viewCount;
        assert(
          isAscending,
          'Posts sorted in ascending order',
          `First: ${posts[0].viewCount}, Last: ${posts[posts.length - 1].viewCount}`
        );
      }
    }

  } catch (error) {
    assert(false, 'Sorting tests', error.message);
  }
}

/**
 * Test 7: Combined Filters
 */
async function testCombinedFilters() {
  try {
    // Test multiple filters combined
    const combinedResponse = await makeRequest(
      `${API_PATH}?minViews=100&minComments=5&sortBy=viewCount&sortOrder=desc&limit=5`
    );

    assert(
      combinedResponse.status === 200 || combinedResponse.status === 401,
      'Multiple filters can be combined'
    );

    if (combinedResponse.status === 200 && combinedResponse.data.success) {
      const posts = combinedResponse.data.data;
      if (posts && posts.length > 0) {
        const allMeetCriteria = posts.every(post =>
          post.viewCount >= 100 && post.commentsCount >= 5
        );
        assert(
          allMeetCriteria,
          'All posts meet combined filter criteria',
          `Sample: views=${posts[0]?.viewCount}, comments=${posts[0]?.commentsCount}`
        );
      }

      const { filters } = combinedResponse.data;
      assert(
        filters?.minViews !== undefined &&
        filters?.minComments !== undefined &&
        filters?.sortBy !== undefined,
        'Response includes all applied filters'
      );
    }

    // Test tag + view filter
    const tagViewResponse = await makeRequest(`${API_PATH}?tag=technology&minViews=50`);
    assert(
      tagViewResponse.status === 200 || tagViewResponse.status === 401,
      'Tag and view filters can be combined'
    );

    // Test category + comment filter
    const categoryCommentResponse = await makeRequest(`${API_PATH}?category=AI&minComments=3`);
    assert(
      categoryCommentResponse.status === 200 || categoryCommentResponse.status === 401,
      'Category and comment filters can be combined'
    );

  } catch (error) {
    assert(false, 'Combined filters tests', error.message);
  }
}

/**
 * Test 8: Edge Cases
 */
async function testEdgeCases() {
  try {
    // Test invalid sortBy (should default to createdAt)
    const invalidSortByResponse = await makeRequest(`${API_PATH}?sortBy=invalidField`);
    assert(
      invalidSortByResponse.status === 200 || invalidSortByResponse.status === 401,
      'Invalid sortBy handled gracefully'
    );

    if (invalidSortByResponse.status === 200 && invalidSortByResponse.data.success) {
      assert(
        invalidSortByResponse.data.filters?.sortBy === 'createdAt',
        'Invalid sortBy defaults to createdAt',
        `Got: ${invalidSortByResponse.data.filters?.sortBy}`
      );
    }

    // Test invalid sortOrder (should default to desc)
    const invalidSortOrderResponse = await makeRequest(`${API_PATH}?sortOrder=invalid`);
    assert(
      invalidSortOrderResponse.status === 200 || invalidSortOrderResponse.status === 401,
      'Invalid sortOrder handled gracefully'
    );

    if (invalidSortOrderResponse.status === 200 && invalidSortOrderResponse.data.success) {
      assert(
        invalidSortOrderResponse.data.filters?.sortOrder === 'desc',
        'Invalid sortOrder defaults to desc'
      );
    }

    // Test limit > 100 (should cap at 100)
    const largeLimitResponse = await makeRequest(`${API_PATH}?limit=500`);
    assert(
      largeLimitResponse.status === 200 || largeLimitResponse.status === 401,
      'Large limit handled gracefully'
    );

    if (largeLimitResponse.status === 200 && largeLimitResponse.data.success) {
      assert(
        largeLimitResponse.data.pagination?.limit <= 100,
        'Limit capped at 100',
        `Got: ${largeLimitResponse.data.pagination?.limit}`
      );
    }

    // Test negative values
    const negativeViewsResponse = await makeRequest(`${API_PATH}?minViews=-10`);
    assert(
      negativeViewsResponse.status === 200 || negativeViewsResponse.status === 401,
      'Negative minViews handled gracefully'
    );

    // Test empty result set
    const noResultsResponse = await makeRequest(`${API_PATH}?minViews=999999`);
    assert(
      noResultsResponse.status === 200 || noResultsResponse.status === 401,
      'Empty result set handled gracefully'
    );

    if (noResultsResponse.status === 200 && noResultsResponse.data.success) {
      assert(
        Array.isArray(noResultsResponse.data.data),
        'Empty result returns empty array'
      );
    }

  } catch (error) {
    assert(false, 'Edge cases tests', error.message);
  }
}

/**
 * Test 9: Response Format
 */
async function testResponseFormat() {
  try {
    const response = await makeRequest(`${API_PATH}?minViews=50&sortBy=viewCount&limit=5`);

    if (response.status === 200 && response.data.success) {
      const { data, pagination, filters } = response.data;

      // Test data structure
      assert(
        data !== undefined,
        'Response contains data field'
      );
      assert(
        Array.isArray(data),
        'Data field is an array'
      );

      // Test pagination structure
      assert(
        pagination !== undefined &&
        pagination.page !== undefined &&
        pagination.limit !== undefined &&
        pagination.total !== undefined &&
        pagination.pages !== undefined,
        'Response contains complete pagination object'
      );

      // Test filters structure
      assert(
        filters !== undefined,
        'Response contains filters object'
      );
      assert(
        filters.sortBy !== undefined && filters.sortOrder !== undefined,
        'Filters object contains sort parameters'
      );

      // Test post structure
      if (data.length > 0) {
        const post = data[0];
        assert(
          post._id !== undefined,
          'Post contains _id field'
        );
        assert(
          post.title !== undefined,
          'Post contains title field'
        );
        assert(
          post.viewCount !== undefined,
          'Post contains viewCount field'
        );
        assert(
          post.commentsCount !== undefined,
          'Post contains commentsCount field'
        );
        assert(
          post.createdAt !== undefined,
          'Post contains createdAt field'
        );
      }
    }

  } catch (error) {
    assert(false, 'Response format tests', error.message);
  }
}

/**
 * Print test summary
 */
function printSummary() {
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  Test Summary${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`Total Tests:  ${totalTests}`);
  console.log(`${colors.green}Passed:       ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed:       ${failedTests}${colors.reset}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%\n`);

  if (failedTests > 0) {
    console.log(`${colors.red}Failed Tests Details:${colors.reset}`);
    failedTestDetails.forEach((failure, index) => {
      console.log(`${index + 1}. ${failure.test}`);
      if (failure.details) {
        console.log(`   ${failure.details}`);
      }
    });
    console.log('');
  }

  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Unhandled Error:${colors.reset}`, error);
  process.exit(1);
});
