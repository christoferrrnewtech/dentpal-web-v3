# DentPal - Dental Management 

[![Professional Frontend](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)](https://github.com)
[![React](https://img.shields.io/badge/React-18.3.1-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8%2B-blue)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Backend-Firebase%20Serverless-orange)](https://firebase.google.com/)

## 🚀 Live Demo & Deployment

**🌐 Production URL:** _Will be provided after deployment_  
**📋 Status:** ✅ Ready for Production  
**🔧 Environment:** Serverless (Firebase)  
**📱 Responsive:** Mobile + Desktop Compatible

### 🔐 Demo Credentials

```
Email: admin@gmail.com
Password: DentpalAccess
Role: Administrator
```

> **Architecture Note**: This is a modern serverless application using Firebase for backend services. No separate backend server required.

🚀 Key Features

Advanced Authentication System**

- Secure login/signup with Firebase Authentication
- Professional branding with DentPal logo integration
- "Remember Me" functionality with local storage
- Split-screen responsive layout matching Figma designs
- Form validation and error handling

Comprehensive Dashboard**

- Real-time analytics and metrics cards
- Revenue tracking with interactive charts
- Advanced filtering system (date, payment method, location, seller)
- Dynamic stats cards with growth indicators

Complete Booking Workflow**

- **Scan Tab**: Barcode scanning and order creation with validation
- **Process Tab**: Order processing queue with priority handling and bulk actions
- **Completed Tab**: Order history with analytics and export functionality
- Smart tab navigation with proper state management

Confirmation Management**

- Dedicated confirmation interface separate from booking workflow
- Priority filtering and customer search functionality
- Bulk confirm/reject operations with proper error handling
- Real-time status updates and notifications

### 💰 **Financial Withdrawal System**

- Dual-section layout (Requests/History) matching Figma specifications
- Balance validation with insufficient funds detection
- Status progression workflow (Pending → Processing → Completed)
- Bank account integration and transfer simulation
- Advanced filtering by date, seller, and status

### 🔑 **Access Control & User Management**

- Role-based permissions (Admin/Seller) with granular access control
- User creation, editing, and status management
- Real-time permission toggling with visual feedback

## 🏗️ Architecture Overview

This application follows a **separated frontend-backend architecture**:

### Frontend (This Repository)

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5.4.20
- **UI Library**: shadcn/ui with Tailwind CSS
- **State Management**: React Hooks + Context API
- **Authentication**: Firebase Auth SDK
- **Port**: 5174 (development)


### Communication
- **CORS**: Configured for localhost:5174
- **Rate Limiting**: Implemented on API endpoints
- Professional user interface with avatar generation

### 🖼️ **Images Management System**

- Multi-category organization (Login Pop-ups, Banners, Cart Pop-ups, Home Pop-ups)
- Drag & drop upload with progress tracking
- Grid and list view modes with advanced filtering
- Bulk operations and status management
- Tag system for better organization

## 🏗️ Architecture Overview

DentPal follows enterprise-grade React architecture patterns:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Presentation Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  React 18 Components (Hooks, Suspense, Error Boundaries)       │
├─────────────────────────────────────────────────────────────────┤
│                    State Management                             │
├─────────────────────────────────────────────────────────────────┤
│  React State + Context API + Custom Hooks                      │
├─────────────────────────────────────────────────────────────────┤
│                    Type Safety                                  │
├─────────────────────────────────────────────────────────────────┤
│  TypeScript 5.8+ (Strict Mode, Interface Definitions)          │
├─────────────────────────────────────────────────────────────────┤
│                    Styling & UI                                 │
├─────────────────────────────────────────────────────────────────┤
│  Tailwind CSS 3.4 + shadcn/ui + Custom Design System          │
├─────────────────────────────────────────────────────────────────┤
│                    Build & Development                          │
├─────────────────────────────────────────────────────────────────┤
│  Vite 5.4 (HMR, ESBuild, Optimized Bundling)                 │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
dentpal-web-v3/
├── public/                     # Static assets
│   ├── placeholder.svg         # Image placeholders
│   └── robot.txt              # SEO robots file
│
├── src/                       # Source code
│   ├── components/            # Reusable React components
│   │   ├── auth/              # Authentication system
│   │   │   ├── AuthLayout.tsx # Auth page layout with branding
│   │   │   ├── LoginForm.tsx  # Login form with Remember Me
│   │   │   └── SignupForm.tsx # Registration form
│   │   │
│   │   ├── booking/           # Booking workflow components
│   │   │   ├── ScanTab.tsx    # Barcode scanning & order creation
│   │   │   ├── ProcessTab.tsx # Order processing queue
│   │   │   └── CompletedTab.tsx # Order history & analytics
│   │   │
│   │   ├── confirmation/      # Confirmation management
│   │   │   └── ConfirmationTab.tsx # Order confirmation interface
│   │   │
│   │   ├── withdrawal/        # Financial withdrawal system
│   │   │   └── WithdrawalTab.tsx # Withdrawal requests & history
│   │   │
│   │   ├── access/           # User & access management
│   │   │   └── AccessTab.tsx # User roles & permissions
│   │   │
│   │   ├── images/           # Image management system
│   │   │   └── ImagesTab.tsx # Multi-category image handling
│   │   │
│   │   ├── dashboard/        # Dashboard core components
│   │   │   ├── Sidebar.tsx   # Navigation sidebar
│   │   │   ├── DashboardHeader.tsx # Page headers
│   │   │   ├── StatsCard.tsx # Metric display cards
│   │   │   ├── RecentOrders.tsx # Order summaries
│   │   │   └── RevenueChart.tsx # Financial charts
│   │   │
│   │   └── ui/               # shadcn/ui component library
│   │       ├── button.tsx    # Button variants & styles
│   │       ├── input.tsx     # Form input components
│   │       ├── card.tsx      # Card layout components
│   │       ├── badge.tsx     # Status & label badges
│   │       ├── dialog.tsx    # Modal & popup dialogs
│   │       ├── table.tsx     # Data table components
│   │       └── ... (50+ UI components)
│   │
│   ├── hooks/                # Custom React hooks
│   │   ├── use-mobile.tsx    # Mobile detection hook
│   │   └── use-toast.tsx     # Toast notification system
│   │
│   ├── lib/                  # Utility libraries
│   │   └── utils.ts          # Common utility functions
│   │
│   ├── pages/                # Top-level page components
│   │   ├── Auth.tsx          # Authentication page
│   │   ├── Dashboard.tsx     # Main dashboard orchestrator
│   │   ├── Booking.tsx       # Booking workflow container
│   │   ├── NotFound.tsx      # 404 error page
│   │   └── index.tsx         # Page exports
│   │
│   ├── types/                # TypeScript type definitions
│   │   └── order.ts          # Order & booking types
│   │
│   ├── App.tsx               # Root application component
│   ├── main.tsx              # Application entry point
│   └── index.css             # Global styles & Tailwind imports
│
├── Configuration Files
├── components.json           # shadcn/ui component configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
├── tsconfig.app.json        # App-specific TypeScript config
├── tsconfig.node.json       # Node.js TypeScript config
├── vite.config.ts           # Vite bundler configuration
├── postcss.config.js        # PostCSS configuration
├── eslint.config.js         # ESLint code quality rules
├── package.json             # Project dependencies & scripts
└── README.md                # Project documentation
```

## 🛠️ Technology Stack

### **Core Technologies**

- **React 18.3.1**: Latest React with Concurrent Features, Suspense, and Error Boundaries
- **TypeScript 5.8.3**: Strict type checking with advanced type inference
- **Vite 5.4.20**: Ultra-fast build tool with Hot Module Replacement (HMR)

### **UI/UX Framework**

- **Tailwind CSS 3.4.17**: Utility-first CSS framework with custom design system
- **shadcn/ui**: High-quality, accessible component library built on Radix UI
- **Lucide React**: Beautiful, customizable icon library with 1000+ icons
- **Recharts**: Responsive charting library for data visualization

### **Development Tools**

- **ESLint**: Code quality and consistency enforcement
- **PostCSS**: CSS processing with autoprefixer and optimizations
- **React Router**: Client-side routing with lazy loading support

### **Design System**

- **Color Palette**: Professional teal/green gradient theme with accessibility compliance
- **Typography**: Modern font stack with optimal readability
- **Spacing**: Consistent 8px grid system for perfect alignment
- **Shadows**: Subtle elevation system for depth and hierarchy

## 🚀 Getting Started

### **Prerequisites**

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher (or **yarn** 1.22.0+)
- **Git** for version control

### **Installation & Setup**

> **Full Stack Setup**: This application requires both frontend and backend to be running simultaneously.

#### **Frontend Setup (This Repository)**

1. **Clone the repository**

```bash
git clone https://github.com/your-username/dentpal-web-v3.git
cd dentpal-web-v3
```

2. **Install frontend dependencies**

```bash
npm install
```

3. **Configure Firebase** (Create `.env` file in root)

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=dentpal-161e5.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dentpal-161e5
VITE_FIREBASE_STORAGE_BUCKET=dentpal-161e5.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

4. **Start frontend development server**

```bash
npm run dev
```

Frontend will run on `http://localhost:5174`

#### **Backend Setup**

5. **Navigate to backend directory**

```bash
cd backend
```

6. **Install backend dependencies**

```bash
npm install
```

7. **Configure backend environment** (Copy `.env.example` to `.env`)

```bash
cp .env.example .env
# Edit .env with your Firebase Admin credentials
```

8. **Start backend development server**

```bash
npm run dev
```

Backend API will run on `http://localhost:5000`

#### **Accessing the Application**

- **Frontend**: `http://localhost:5174`
- **Backend API**: `http://localhost:5000`
- **API Health Check**: `http://localhost:5000/health`

### **Available Scripts**

```bash
# Development server with HMR
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint

# Code formatting
npm run format
```

## 🎨 Design System & UI Components

### **Component Library Structure**

```
shadcn/ui Components (50+ components):
├── Layout Components
│   ├── Card, Sheet, Dialog, Drawer
│   ├── Sidebar, Navigation Menu
│   └── Breadcrumb, Pagination
│
├── Form Components
│   ├── Input, Textarea, Select
│   ├── Checkbox, Radio Group, Switch
│   ├── Button, Toggle Group
│   └── Form, Label, Field Validation
│
├── Data Display
│   ├── Table, Data Table
│   ├── Badge, Avatar, Calendar
│   ├── Chart, Progress Bar
│   └── Skeleton, Alert, Toast
│
└── Interactive Components
    ├── Dropdown Menu, Context Menu
    ├── Popover, Tooltip, Hover Card
    ├── Accordion, Collapsible, Tabs
    └── Command Palette, Search
```

### **Design Tokens**

```css
/* Color System */
--primary: teal-600     /* Main brand color */
--secondary: cyan-600   /* Accent color */
--success: green-600    /* Success states */
--warning: orange-600   /* Warning states */
--danger: red-600       /* Error states */
--muted: gray-500       /* Disabled/muted text */

/* Typography Scale */
--text-xs: 0.75rem     /* 12px - Small labels */
--text-sm: 0.875rem    /* 14px - Body text */
--text-base: 1rem      /* 16px - Default */
--text-lg: 1.125rem    /* 18px - Subheadings */
--text-xl: 1.25rem     /* 20px - Headings */
--text-2xl: 1.5rem     /* 24px - Page titles */
--text-3xl: 1.875rem   /* 30px - Hero text */

/* Spacing System (8px grid) */
--space-1: 0.25rem     /* 4px */
--space-2: 0.5rem      /* 8px */
--space-4: 1rem        /* 16px */
--space-6: 1.5rem      /* 24px */
--space-8: 2rem        /* 32px */
```

## 🔧 Development Guidelines

### **Code Quality Standards**

- **TypeScript Strict Mode**: All components must be fully typed
- **ESLint Rules**: Enforced code style and best practices
- **Component Props**: Proper interface definitions for all props
- **Error Handling**: Comprehensive try-catch blocks and error boundaries
- **Accessibility**: WCAG 2.1 AA compliance with proper ARIA labels

### **Component Structure**

```typescript
// Standard component template
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ComponentIcon } from "lucide-react";

interface ComponentProps {
  loading?: boolean;
  error?: string | null;
  onAction?: (id: string) => void;
}

const Component = ({ loading, error, onAction }: ComponentProps) => {
  // Component logic here
  return <div className="space-y-4">{/* Component JSX */}</div>;
};

export default Component;
```

### **State Management Patterns**

- **Local State**: useState for component-specific state
- **Shared State**: Context API for cross-component state
- **Server State**: Custom hooks for API data management
- **Form State**: Controlled components with validation

## 📊 Performance Optimizations

### **Build Optimizations**

- **Code Splitting**: Lazy-loaded routes and components
- **Tree Shaking**: Dead code elimination in production builds
- **Bundle Analysis**: Optimized chunk sizes for faster loading
- **Asset Optimization**: Compressed images and minified CSS/JS

### **Runtime Performance**

- **React.memo**: Preventing unnecessary re-renders
- **useMemo/useCallback**: Expensive computation caching
- **Virtual Scrolling**: Efficient large list rendering
- **Image Lazy Loading**: Progressive image loading

## 🔐 Security Considerations

### **Authentication & Authorization**

- **JWT Tokens**: Secure authentication with refresh tokens
- **Role-Based Access**: Granular permission system
- **Input Validation**: Client and server-side validation
- **XSS Protection**: Sanitized user input handling

### **Data Protection**

- **Sensitive Data**: Proper handling of patient information
- **Encrypted Storage**: Secure local storage implementation
- **API Security**: HTTPS-only communication
- **Error Logging**: Secure error handling without data exposure

## 🚀 Deployment

### **Production Build**

```bash
# Create optimized production build
npm run build

# The build output will be in the `dist/` directory
# Deploy the contents of `dist/` to your hosting provider
```

### **Environment Variables**

```bash
# .env.production
VITE_API_URL=https://api.dentpal.com
VITE_APP_VERSION=3.0.0
VITE_ENVIRONMENT=production
```

## 🤝 Contributing

### **Development Workflow**

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### **Contribution Guidelines**

- Follow the existing code style and patterns
- Write comprehensive TypeScript types
- Include proper error handling
- Add comments for complex logic
- Update documentation for new features

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Lead Developer**: Senior React Frontend Developer
- **UI/UX Designer**: Professional Figma-to-Code Implementation
- **Product Manager**: Feature Planning & Requirements
- **QA Engineer**: Quality Assurance & Testing

## 🆘 Support

For support and questions:

- **Documentation**: Comprehensive guides in `/docs`
- **Issues**: GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for questions
- **Email**: support@dentpal.com

---

**Built with ❤️ for dental professionals worldwide**
│ │ ├── dashboard/ # Dashboard-specific components
│ │ │ ├── Dashboard.tsx # Main dashboard layout
│ │ │ ├── DashboardHeader.tsx # Top navigation header
│ │ │ ├── Sidebar.tsx # Navigation sidebar (7 sections)
│ │ │ ├── StatsCard.tsx # Statistics display cards
│ │ │ ├── RecentOrders.tsx # Recent activity table
│ │ │ └── RevenueChart.tsx # Revenue analytics chart
│ │ │
│ │ └── ui/ # shadcn/ui component library
│ │ ├── button.tsx # Button components
│ │ ├── card.tsx # Card layouts
│ │ ├── input.tsx # Form inputs
│ │ ├── table.tsx # Data tables
│ │ └── ... (40+ components)
│ │
│ ├── hooks/ # Custom React hooks
│ │ ├── use-mobile.tsx # Mobile device detection
│ │ └── use-toast.tsx # Toast notification system
│ │
│ ├── lib/ # Utility libraries
│ │ └── utils.ts # Helper functions and utilities
│ │
│ ├── pages/ # Page-level components
│ │ ├── index.tsx # Home/Router page
│ │ ├── Auth.tsx # Authentication page
│ │ ├── Dashboard.tsx # Dashboard page
│ │ └── NotFound.tsx # 404 error page
│ │
│ └── main.tsx # Application entry point
│
├── Configuration Files
├── package.json # Dependencies and scripts
├── tsconfig.json # TypeScript configuration
├── tsconfig.app.json # App-specific TS config
├── tsconfig.node.json # Node.js TS config
├── vite.config.ts # Vite build configuration
├── tailwind.config.ts # Tailwind CSS configuration
├── postcss.config.js # PostCSS configuration
├── eslint.config.js # ESLint linting rules
├── components.json # shadcn/ui configuration
├── index.html # HTML entry point
├── index.css # Global styles and design system
└── App.tsx # Root application component

````

## 🛠️ Technology Stack

### Core Technologies

- **React 18.3.1** - Modern React with hooks and concurrent features
- **TypeScript 5.8.3** - Type-safe JavaScript development
- **Vite 5.4.19** - Fast build tool and dev server
- **React Router 6.30.1** - Client-side routing

### UI & Styling

- **Tailwind CSS 3.4.17** - Utility-first CSS framework with custom design system
- **shadcn/ui** - High-quality, accessible component library (40+ components)
- **Radix UI Primitives** - Unstyled, accessible UI primitives
- **Lucide React** - Beautiful icon library for professional appearance
- **Tailwind Animate** - Animation utilities for smooth interactions
- **Custom Branding** - Professional dental practice color scheme with turquoise gradients

### Data & State Management

- **TanStack Query 5.83.0** - Server state management
- **React Hook Form 7.61.1** - Form state management
- **Zod 3.25.76** - Schema validation

### Charts & Analytics

- **Recharts 2.15.4** - Composable charting library
- **Date-fns 3.6.0** - Date utility library

### Development Tools

- **ESLint 9.32.0** - Code linting
- **TypeScript ESLint** - TypeScript-specific linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## 🎨 Design System

The application uses a comprehensive design system built on top of Tailwind CSS:

### Color Palette

- **Primary**: Teal/Turquoise theme (#14b8a6, #0d9488) for professional dental branding
- **Secondary**: Neutral grays for balanced contrast and readability
- **Success**: Green variations for positive actions and confirmations
- **Destructive**: Red for warnings and error states
- **Muted**: Subtle grays for secondary content and backgrounds
- **Gradients**: Turquoise gradients for modern, professional appearance

### Typography

- System font stack with fallbacks
- Consistent spacing and sizing scale
- Responsive typography

### Components

- **Shadcn/ui**: 40+ pre-built components
- **Consistent spacing**: 4px base unit system
- **Accessible**: WCAG 2.1 AA compliant
- **Responsive**: Mobile-first design approach

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (recommended: latest LTS)
- npm or yarn package manager
- Modern web browser

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd dentpal-web-v3
````

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

4. **Open browser**
   Navigate to `http://localhost:5173`

### Available Scripts

```bash
# Development
npm run dev          # Start dev server with hot reload
npm run build        # Build for production
npm run build:dev    # Build for development mode
npm run preview      # Preview production build
npm run lint         # Run ESLint checks
```

## 🔧 Development Process

### 1. Project Setup

The project was initialized with Vite + React + TypeScript template and enhanced with:

- shadcn/ui component library integration
- Tailwind CSS configuration with custom design system
- TypeScript strict mode configuration
- ESLint and code quality tools

### 2. Architecture Decisions

**Component Architecture**:

- **Atomic Design**: Components organized by complexity (atoms → molecules → organisms)
- **Feature-based Organization**: Related components grouped by feature (auth, dashboard)
- **Separation of Concerns**: UI components separated from business logic

**State Management**:

- **Local State**: React useState for component-specific state
- **Server State**: TanStack Query for API data and caching
- **Form State**: React Hook Form for complex form management

**Styling Strategy**:

- **Utility-first**: Tailwind CSS for rapid development
- **Component Library**: shadcn/ui for consistent, accessible components
- **Design System**: Custom CSS variables for theme consistency

### 3. File Organization Principles

```
Feature-based organization:
src/
├── components/
│   ├── auth/          # Authentication feature
│   ├── dashboard/     # Dashboard feature
│   └── ui/            # Shared UI components
├── pages/             # Route-level components
├── hooks/             # Shared custom hooks
└── lib/               # Utilities and configurations
```

### 4. Development Workflow

1. **Component Development**:

   - Start with UI component from shadcn/ui
   - Customize with Tailwind classes
   - Add TypeScript interfaces
   - Implement business logic

2. **State Management**:

   - Local state for UI interactions
   - TanStack Query for server data
   - Form validation with Zod schemas

3. **Testing Strategy**:
   - TypeScript for compile-time checks
   - ESLint for code quality
   - Manual testing in development

## 🎯 Features

### Authentication System

- **Login/Signup Forms**: Responsive forms with validation and modern design
- **Remember Me Feature**: Persistent login option with checkbox for user convenience
- **State Management**: User session handling with local storage support
- **Route Protection**: Conditional rendering based on auth state
- **Professional Branding**: Clean logo integration without borders for better visual impact
- **Split-screen Layout**: Desktop layout with branding section and form section for modern UX

### Dashboard Interface

- **Responsive Sidebar**: Collapsible navigation with icons
- **Statistics Cards**: Key metrics display with trend indicators (Patients, Appointments, Revenue, Treatment Completion)
- **Data Visualization**: Revenue charts using Recharts
- **Multi-page Navigation**: Dashboard, Booking, Confirmation, Withdrawal, Access, Images, Users
- **Dental Practice Features**: Patient management, appointment booking, image gallery, financial tracking

### UI Components

- **40+ shadcn/ui Components**: Buttons, cards, forms, dialogs, etc.
- **Responsive Design**: Mobile-first approach
- **Dark Mode Ready**: Theme system prepared for dark mode
- **Accessibility**: WCAG 2.1 AA compliant components

## 🔄 Configuration Files

### TypeScript Configuration

- **tsconfig.json**: Main TypeScript configuration with path mapping
- **tsconfig.app.json**: Application-specific settings
- **tsconfig.node.json**: Node.js/Vite configuration

### Build Configuration

- **vite.config.ts**: Vite build settings with React plugin
- **postcss.config.js**: PostCSS with Tailwind and Autoprefixer
- **tailwind.config.ts**: Tailwind configuration with design system

### Quality Assurance

- **eslint.config.js**: ESLint rules for React and TypeScript
- **components.json**: shadcn/ui configuration

## 📋 Recent Development History

### Version 3.1.0 - Authentication Enhancement (December 2024)

**Features Added:**

- ✅ Remember Me checkbox in login form with proper state management
- ✅ Professional logo integration without background styling
- ✅ Responsive logo sizing (192px desktop, 96px mobile)
- ✅ Split-screen authentication layout with turquoise gradient background
- ✅ Enhanced form validation and user feedback
- ✅ Mobile-optimized authentication interface

**Technical Improvements:**

- ✅ Checkbox component integration from shadcn/ui
- ✅ Consistent teal color scheme across authentication components
- ✅ Clean logo presentation without borders or backgrounds
- ✅ Responsive design patterns for multiple screen sizes
- ✅ TypeScript state management for Remember Me functionality

**UI/UX Enhancements:**

- ✅ Modern gradient backgrounds for professional appearance
- ✅ Consistent spacing and typography throughout auth flow
- ✅ Improved visual hierarchy with proper contrast ratios
- ✅ Smooth transitions and hover states for interactive elements

## 🐛 Troubleshooting

### Common Issues

1. **White Screen After Login**:

   - Check browser console for JavaScript errors
   - Verify all component imports are correct
   - Ensure CSS is loading properly

2. **Build Failures**:

   - Run `npm install` to ensure all dependencies are installed
   - Check TypeScript errors with `npm run build`
   - Verify file paths and imports

3. **Development Server Issues**:
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check port availability (default: 5173)
   - Restart development server

### Development Notes

- The application uses ES modules (type: "module" in package.json)
- Path aliases configured for cleaner imports (@/components/\*)
- Hot module replacement enabled for fast development

## 🚀 Deployment

### Production Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

The build artifacts will be in the `dist/` directory, ready for deployment to any static hosting service.

## 📄 License

This project is private and proprietary to DentPal.

---

**Built with ❤️ for modern dental practices**

# dentpal-web-v3
