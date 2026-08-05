#!/usr/bin/env bash
set -euo pipefail

msg=$(cat "$1")

# Conventional commit regex: type(scope): description
# Allowed types: feat, fix, chore, docs, refactor, test, perf, ci, style, build
pattern='^(feat|fix|chore|docs|refactor|test|perf|ci|style|build)(\(.+\))?!?: .+'

if ! echo "$msg" | head -1 | grep -qE "$pattern"; then
  echo "❌ Commit message does not follow conventional commits."
  echo ""
  echo "   Format: type(scope): description"
  echo ""
  echo "   Examples:"
  echo "     feat: add secret scanning workflow"
  echo "     fix: resolve CI test timeout"
  echo "     chore: update dependencies"
  echo "     docs: add developer guide"
  echo "     refactor: extract inline JS into scripts"
  echo ""
  exit 1
fi
