#!/bin/bash
# Test Unix compliance for beat-gen CLI

set -e

TESTS_PASSED=0
TESTS_FAILED=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test helper
test_case() {
  local name="$1"
  echo -e "${YELLOW}Testing: ${name}${NC}"
}

pass() {
  echo -e "${GREEN}✓ PASS${NC}"
  ((TESTS_PASSED++))
}

fail() {
  local msg="$1"
  echo -e "${RED}✗ FAIL: ${msg}${NC}"
  ((TESTS_FAILED++))
}

# Setup
echo "=== Unix Compliance Test Suite ==="
echo ""

# Test 1: Exit codes
test_case "Exit code on success"
if node bin/beat-gen.js compose patterns/example-basic.txt -q -o /tmp/test.mid >/dev/null 2>&1; then
  [ $? -eq 0 ] && pass || fail "Expected exit code 0"
else
  fail "Command failed"
fi

test_case "Exit code on missing file"
node bin/beat-gen.js compose missing-file.txt -q >/dev/null 2>&1
if [ $? -ne 0 ]; then
  pass
else
  fail "Expected non-zero exit code"
fi

# Test 2: Stderr for errors
test_case "Errors go to stderr"
error_output=$(node bin/beat-gen.js compose missing.txt 2>&1 >/dev/null)
if echo "$error_output" | grep -q "Error"; then
  pass
else
  fail "Error message not on stderr"
fi

# Test 3: Quiet mode
test_case "Quiet mode suppresses output"
output=$(node bin/beat-gen.js compose patterns/example-basic.txt -q -o /tmp/test.mid 2>&1)
if [ -z "$output" ]; then
  pass
else
  fail "Output not suppressed in quiet mode"
fi

# Test 4: Help text
test_case "Help flag works"
if node bin/beat-gen.js --help >/dev/null 2>&1; then
  pass
else
  fail "Help flag failed"
fi

# Test 5: Version flag
test_case "Version flag works"
if node bin/beat-gen.js --version >/dev/null 2>&1; then
  pass
else
  fail "Version flag failed"
fi

# Test 6: Command chaining (if compose-unix is integrated)
# test_case "Stdin/stdout piping"
# if echo "kick: X...X...X...X..." | node bin/beat-gen.js compose - --format json 2>/dev/null | jq -r '.tempo' >/dev/null; then
#   pass
# else
#   fail "Piping not working"
# fi

# Test 7: File output
test_case "File output creation"
node bin/beat-gen.js compose patterns/example-basic.txt -o /tmp/test-output.mid -q 2>&1
if [ -f /tmp/test-output.mid ]; then
  pass
  rm -f /tmp/test-output.mid
else
  fail "Output file not created"
fi

# Cleanup
rm -f /tmp/test.mid

# Summary
echo ""
echo "=== Test Summary ==="
echo -e "${GREEN}Passed: ${TESTS_PASSED}${NC}"
echo -e "${RED}Failed: ${TESTS_FAILED}${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed${NC}"
  exit 1
fi
