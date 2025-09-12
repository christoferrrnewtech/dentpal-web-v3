#!/bin/bash

# DentPal Full Stack Setup Script
echo "🦷 Setting up DentPal - Dental Practice Management System"
echo "=============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version)
echo "✅ Node.js version: $NODE_VERSION"

# Setup Frontend
echo ""
echo "📱 Setting up Frontend..."
echo "-------------------------"
npm install
echo "✅ Frontend dependencies installed"

# Setup Backend
echo ""
echo "🖥️  Setting up Backend..."
echo "-------------------------"
cd backend
npm install
echo "✅ Backend dependencies installed"

# Copy environment files
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Created backend .env file - please configure your Firebase credentials"
fi

cd ..

# Create frontend .env if it doesn't exist
if [ ! -f .env ]; then
    cat > .env << EOL
# DentPal Frontend Environment Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=dentpal-161e5.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dentpal-161e5
VITE_FIREBASE_STORAGE_BUCKET=dentpal-161e5.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_API_BASE_URL=http://localhost:5000/api
EOL
    echo "📝 Created frontend .env file - please configure your Firebase credentials"
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Configure your Firebase credentials in both .env files"
echo "2. Start the backend server: cd backend && npm run dev"
echo "3. In another terminal, start the frontend: npm run dev"
echo ""
echo "🌐 Frontend will run on: http://localhost:5174"
echo "🔌 Backend API will run on: http://localhost:5000"
echo "🩺 Health check: http://localhost:5000/health"
echo ""
echo "📚 Read the README.md files for detailed setup instructions"
echo ""
echo "Happy coding! 🚀"
