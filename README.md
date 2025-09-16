# oPINion - Share Your Thoughts on the Map

![oPINion Banner](https://img.shields.io/badge/oPINion-Interactive%20Map%20Platform-blue?style=for-the-badge&logo=mapbox&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15.5.0-black?style=flat&logo=next.js)
![React](https://img.shields.io/badge/React-19.1.0-61DAFB?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-2.56.0-3ECF8E?style=flat&logo=supabase)

An interactive map platform where you can share opinions and discover what others think about different locations around the world. Join our global community to explore local insights, reviews, and experiences.

## 🌟 Features

- **🌍 Interactive World Map** - Explore locations worldwide with MapLibre GL
- **💬 Share Opinions** - Leave comments and photos about your favorite spots
- **👥 Join Community** - Connect with travelers and locals globally
- **📱 Responsive Design** - Optimized for desktop and mobile devices
- **🎨 Dark/Light Mode** - Seamless theme switching experience
- **⚡ Real-time Updates** - Live comments and interactions
- **📸 Photo Sharing** - Upload and share location photos
- **🔍 Location Discovery** - Find interesting places and read reviews

## 🚀 Tech Stack

### Frontend

- **Next.js 15** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Utility-first CSS framework
- **MapLibre GL** - Open-source maps library

### UI & UX

- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icon library
- **next-themes** - Theme management
- **Sonner** - Toast notifications

### Backend & Infrastructure

- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication & authorization
  - Real-time subscriptions
  - File storage
- **TanStack Query** - Powerful data fetching & caching

### Analytics & Performance

- **Vercel Analytics** - Web analytics
- **Vercel Speed Insights** - Performance monitoring

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/opinion.git
   cd opinion
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in your Supabase credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase**

   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Link to your project
   supabase link --project-ref your-project-ref

   # Push migrations
   supabase db push
   ```

5. **Run development server**

   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## 📁 Project Structure

```
opinion/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   ├── auth/           # Authentication pages
│   │   ├── profile/        # User profile pages
│   │   └── location/       # Location-specific pages
│   ├── components/         # React components
│   │   ├── common/         # Shared components
│   │   ├── map/           # Map-related components
│   │   ├── pin/           # Pin/location components
│   │   └── ui/            # UI components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries
│   └── types/             # TypeScript type definitions
├── supabase/              # Database migrations & config
├── public/               # Static assets
└── prisma/               # Database schema (if used)
```

## 🎯 Key Components

- **Map Interface** - Interactive world map with location markers
- **Pin System** - Location-based opinion sharing
- **Comment System** - Real-time discussions on locations
- **User Profiles** - Personalized experience with avatars and stats
- **Photo Upload** - Location photo sharing with compression
- **Search & Discovery** - Find interesting locations and opinions

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run build:analyze` - Analyze bundle size

## 🌐 Deployment

The app is optimized for deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on every push

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Maps powered by [MapLibre](https://maplibre.org/)
- Backend by [Supabase](https://supabase.com/)
- UI components from [Radix UI](https://www.radix-ui.com/)

---

**Join the conversation!** Share your thoughts about places that matter to you. 🌍✨
