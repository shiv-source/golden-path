#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<EOF
Usage: ./scripts/release.sh <major|minor|patch>

  Bumps the version from the latest git tag, creates a new tag,
  and pushes it to trigger self-release.yaml.

Examples:
  ./scripts/release.sh patch   # v1.0.0 → v1.0.1
  ./scripts/release.sh minor   # v1.0.1 → v1.1.0
  ./scripts/release.sh major   # v1.1.0 → v2.0.0

Options:
  -h, --help   Show this help message
EOF
  exit 0
}

bump() {
  if [ $# -ne 1 ]; then
    echo "Error: expected one of major|minor|patch"
    usage
  fi

  git fetch --tags --quiet

  local type="$1"
  case "$type" in
    major|minor|patch) ;;
    -h|--help) usage ;;
    *) echo "Error: invalid bump type '$type'. Use major, minor, or patch." && exit 1 ;;
  esac

  # Get latest release tag from GitHub (more reliable than local tags)
  local latest
  latest=$(gh release list --exclude-drafts --exclude-pre-releases --limit 1 --json tagName --jq '.[0].tagName' 2>/dev/null || echo "")

  if [ -z "$latest" ]; then
    # Fallback to local git tags
    latest=$(git tag --list 'v[0-9]*' --sort=-version:refname | head -1)
  fi

  if [ -z "$latest" ]; then
    echo "No existing version tags found. Starting at v0.1.0."
    local tag="v0.1.0"
    git tag -a "$tag" -m "chore: release $tag"
    git push origin "$tag"
    echo "Tag $tag pushed. self-release.yaml will create the GitHub Release."
    exit 0
  fi

  # Parse version
  local version="${latest#v}"
  IFS='.' read -r major minor patch <<< "$version"

  # Bump
  case "$type" in
    major) major=$((major + 1)); minor=0; patch=0 ;;
    minor) minor=$((minor + 1)); patch=0 ;;
    patch) patch=$((patch + 1)) ;;
  esac

  local new_version="${major}.${minor}.${patch}"
  local new_tag="v${new_version}"

  echo "Current: $latest"
  echo "New:     $new_tag"
  echo ""

  # Confirm
  read -r -p "Create and push tag $new_tag? [y/N] " confirm
  if [ "${confirm,,}" != "y" ]; then
    echo "Aborted."
    exit 0
  fi

  git tag -a "$new_tag" -m "chore: release $new_tag"
  git push origin "$new_tag"

  echo ""
  echo "Tag $new_tag pushed. self-release.yaml will create the GitHub Release."
}

bump "$@"
