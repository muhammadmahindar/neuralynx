# Neuralynx Frontend

A modern React dashboard for AI-powered content optimization, built with TypeScript, Vite, and Tailwind CSS.

## 🏗️ Architecture

- **Module-based structure**: Feature modules for scalability
- **AI-powered tools**: Content optimization and SEO enhancement
- **Modern editor**: PlateJS rich text editor with AI integration

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)

### Installation

```bash
git clone <repository-url>
cd neuralynx/website
npm install
```

## 🔧 Development

### Local Development

```bash
npm run dev
# Runs at http://localhost:5173
```

### Build

```bash
npm run build
# Outputs to dist/ directory
```

## 🎯 Features

- **Content Management**: Create, edit, and manage content
- **AI Optimization**: AI-powered content optimization and SEO enhancement
- **Rich Text Editor**: PlateJS editor with AI integration
- **Analytics**: Content performance tracking
- **Topics Management**: Organize content by topics
- **Settings**: Domain and configuration management

## 📁 Project Structure

```
src/
├── components/             # Reusable UI components
│   ├── ui/                # Base UI components (shadcn/ui)
│   ├── editor/            # Rich text editor components
│   └── layouts/           # Layout components
├── modules/               # Feature modules
│   ├── content/           # Content management
│   ├── analytics/         # Analytics dashboard
│   ├── topics/            # Topics management
│   └── settings/          # Settings & configuration
├── contexts/              # React contexts
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and configurations
└── types/                 # TypeScript type definitions
```

## 🛠️ Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **PlateJS** - Rich text editor
- **shadcn/ui** - UI component library
- **OpenAI API** - AI content optimization

## 🧪 Testing

```bash
# Lint code
npm run lint

# Type checking
npm run type-check
```

## 📝 License

MIT License
