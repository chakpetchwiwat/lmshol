#!/bin/bash

# Vercel Ignored Build Step Script
# This script determines if a build should proceed based on changed files.
# It helps optimize build times in monorepos.

echo "VERCEL_GIT_COMMIT_REF: $VERCEL_GIT_COMMIT_REF"

# 1. Always build the main production branch
if [[ "$VERCEL_GIT_COMMIT_REF" == "main" || "$VERCEL_GIT_COMMIT_REF" == "master"  ]]; then
  echo "✅ Proceeding: Main branch detected."
  exit 1;
fi

# 2. Check for changes in the webapp directory
# We check the difference between the current commit and the previous one
git diff --quiet HEAD^ HEAD ./elearning-webapp

# git diff --quiet returns 0 if there are no changes, 1 if there are changes.
# In Vercel: exit 1 means "BUILD", exit 0 means "CANCEL BUILD".
if [[ $? -eq 1 ]]; then
  echo "✅ Proceeding: Changes detected in elearning-webapp directory."
  exit 1;
else
  echo "🛑 Canceling: No changes detected in elearning-webapp. Skipping build to save time."
  exit 0;
fi
