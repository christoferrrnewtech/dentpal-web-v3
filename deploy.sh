#!/bin/bash

# 🚀 DentPal Production Deployment Script
# Professional deployment for dental practice management dashboard

echo "🦷 DentPal - Professional Deployment"
echo "====================================="

# Check if we're on the correct branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📋 Current branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "test" ] && [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Warning: You're not on test or main branch"
    echo "🔄 Switching to test branch for deployment..."
    git checkout test
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run linting and type checking
echo "🔍 Running code quality checks..."
npm run lint --if-present
npx tsc --noEmit --if-present

# Build for production
echo "🏗️  Building for production..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🚀 Ready for deployment!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Deploy to Vercel: vercel --prod"
    echo "2. Or deploy to Netlify: drag dist/ folder"
    echo "3. Or deploy to Firebase: firebase deploy"
    echo ""
    echo "🔐 Demo credentials:"
    echo "Email: admin@gmail.com"
    echo "Password: DentpalAccess"
    echo ""
    echo "🎯 Your professional DentPal dashboard is ready!"
else
    echo "❌ Build failed!"
    echo "Please fix the errors and try again."
    exit 1
fi
