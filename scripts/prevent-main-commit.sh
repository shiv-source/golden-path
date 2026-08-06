#!/usr/bin/env bash
set -euo pipefail

branch=$(git branch --show-current)

if [ "$branch" = "main" ]; then
  echo "❌ Direct commits to 'main' are not allowed."
  echo "   Use conventional branch names:"
  echo ""
  echo "   feat/my-feature     — new feature"
  echo "   fix/my-fix          — bug fix"
  echo "   chore/my-chore      — maintenance"
  echo "   docs/my-docs        — documentation"
  echo "   refactor/my-refactor"
  exit 1
fi
