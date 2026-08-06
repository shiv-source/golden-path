#!/usr/bin/env bash
set -euo pipefail

# Cleanup local branches whose remote has been deleted
# Usage: ./scripts/cleanup-branches.sh

echo "Fetching and pruning remote references..."
git fetch --prune --quiet

# Find local branches tracking deleted remotes
gone=$(git branch -vv | grep ': gone]' | awk '{print $1}')

if [ -z "$gone" ]; then
  echo "No stale branches to delete."
  exit 0
fi

echo ""
echo "The following branches have been deleted on remote:"
for branch in $gone; do
  echo "  $branch"
done

echo ""
read -r -p "Delete these local branches? [y/N] " confirm
if [ "${confirm,,}" != "y" ]; then
  echo "Aborted."
  exit 0
fi

for branch in $gone; do
  git branch -D "$branch"
  echo "  Deleted: $branch"
done

echo ""
echo "Cleanup complete."
