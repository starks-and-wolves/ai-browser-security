#!/bin/bash

###############################################################################
# AWI Security Test Suite Runner
# Comprehensive security testing wrapper script
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST="${HOST:-http://localhost:5000}"
REPORT_DIR="$SCRIPT_DIR/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Print banner
print_banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║        AWI SECURITY TEST SUITE - RUNNER SCRIPT           ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check if server is running
check_server() {
    echo -e "${BLUE}Checking if server is running...${NC}"

    if curl -s -f "$HOST/api/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Server is running at $HOST${NC}"
        return 0
    else
        echo -e "${RED}✗ Server is not running at $HOST${NC}"
        echo -e "${YELLOW}Please start the server with: npm start${NC}"
        return 1
    fi
}

# Run all tests
run_all_tests() {
    echo -e "\n${MAGENTA}Running all security tests...${NC}\n"
    node "$SCRIPT_DIR/security-tests.js" --host="$HOST" "$@"
}

# Run specific category
run_category() {
    local category=$1
    shift
    echo -e "\n${MAGENTA}Running tests for category: $category${NC}\n"
    node "$SCRIPT_DIR/security-tests.js" --host="$HOST" --category="$category" "$@"
}

# Run with report generation
run_with_report() {
    mkdir -p "$REPORT_DIR"
    local report_file="$REPORT_DIR/security-report-$TIMESTAMP.json"

    echo -e "\n${MAGENTA}Running tests with report generation...${NC}\n"
    node "$SCRIPT_DIR/security-tests.js" --host="$HOST" --report="$report_file" "$@"

    if [ -f "$report_file" ]; then
        echo -e "\n${GREEN}✓ Report saved to: $report_file${NC}"

        # Generate summary
        if command -v jq &> /dev/null; then
            echo -e "\n${CYAN}Report Summary:${NC}"
            jq -r '.summary | to_entries | .[] | "\(.key): \(.value)"' "$report_file"
        fi
    fi
}

# Run quick smoke test
run_smoke_test() {
    echo -e "\n${MAGENTA}Running quick smoke test (XSS, NoSQL, Prompt Injection)...${NC}\n"

    # Run critical categories only
    node "$SCRIPT_DIR/security-tests.js" --host="$HOST" --category="injection" || true
}

# Run comprehensive test
run_comprehensive() {
    echo -e "\n${MAGENTA}Running comprehensive security audit...${NC}\n"

    mkdir -p "$REPORT_DIR"
    local report_file="$REPORT_DIR/comprehensive-audit-$TIMESTAMP.json"
    local log_file="$REPORT_DIR/comprehensive-audit-$TIMESTAMP.log"

    # Run with verbose output and save to log
    node "$SCRIPT_DIR/security-tests.js" --host="$HOST" --verbose --report="$report_file" 2>&1 | tee "$log_file"

    echo -e "\n${GREEN}✓ Comprehensive audit complete${NC}"
    echo -e "${CYAN}Report: $report_file${NC}"
    echo -e "${CYAN}Log: $log_file${NC}"
}

# Run CI/CD mode (non-interactive)
run_ci() {
    echo -e "\n${MAGENTA}Running in CI/CD mode...${NC}\n"

    mkdir -p "$REPORT_DIR"
    local report_file="$REPORT_DIR/ci-security-report.json"

    # Run without colors, exit on failure
    node "$SCRIPT_DIR/security-tests.js" --host="$HOST" --report="$report_file"

    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo -e "\n${GREEN}✓ All security tests passed${NC}"
    else
        echo -e "\n${RED}✗ Security tests failed${NC}"
        exit 1
    fi
}

# Show usage
show_usage() {
    cat << EOF
${CYAN}Usage:${NC}
  $0 [command] [options]

${CYAN}Commands:${NC}
  all              Run all security tests (default)
  smoke            Quick smoke test (critical vulnerabilities only)
  comprehensive    Full audit with verbose output and detailed report
  ci               CI/CD mode (non-interactive, exit on failure)
  category <name>  Run specific category
  report           Run all tests and generate report

${CYAN}Categories:${NC}
  - brokenAccessControl
  - cryptographicFailures
  - injection
  - insecureDesign
  - securityMisconfiguration
  - authenticationFailures
  - dataIntegrity
  - ssrf
  - awiSpecific
  - businessLogic
  - validRequests

${CYAN}Environment Variables:${NC}
  HOST             API host (default: http://localhost:5000)
                   Example: HOST=https://staging.example.com $0

${CYAN}Examples:${NC}
  # Run all tests
  $0

  # Run quick smoke test
  $0 smoke

  # Run specific category
  $0 category injection

  # Run with report generation
  $0 report

  # Run comprehensive audit
  $0 comprehensive

  # Run against different host
  HOST=https://staging.example.com $0

  # CI/CD integration
  $0 ci

${CYAN}Options:${NC}
  -h, --help       Show this help message
  -v, --verbose    Show detailed output
  --version        Show version

${CYAN}Reports:${NC}
  Reports are saved to: $REPORT_DIR/

EOF
}

# Main
main() {
    print_banner

    # Parse arguments
    case "${1:-all}" in
        all)
            check_server || exit 1
            shift
            run_all_tests "$@"
            ;;
        smoke)
            check_server || exit 1
            shift
            run_smoke_test "$@"
            ;;
        comprehensive)
            check_server || exit 1
            shift
            run_comprehensive "$@"
            ;;
        ci)
            check_server || exit 1
            shift
            run_ci "$@"
            ;;
        category)
            check_server || exit 1
            if [ -z "$2" ]; then
                echo -e "${RED}Error: Category name required${NC}"
                echo "Usage: $0 category <name>"
                exit 1
            fi
            shift
            run_category "$@"
            ;;
        report)
            check_server || exit 1
            shift
            run_with_report "$@"
            ;;
        -h|--help|help)
            show_usage
            ;;
        --version)
            echo "AWI Security Test Suite v1.0.0"
            ;;
        *)
            echo -e "${RED}Unknown command: $1${NC}"
            echo "Use '$0 --help' for usage information"
            exit 1
            ;;
    esac
}

# Run main
main "$@"
