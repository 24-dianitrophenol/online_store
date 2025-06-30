# M.A Online Store

A modern e-commerce platform built with React, TypeScript, Tailwind CSS, and Supabase.

## Features

- 🛍️ Product catalog with categories and search
- 🛒 Shopping cart functionality
- 📱 Responsive design with mobile-first approach
- 🌙 Dark/light theme support
- 👨‍💼 Admin dashboard for product management
- 📊 Real-time inventory tracking
- 💬 Customer support chat
- 🎯 Promotional campaigns
- 📦 Order management system

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Deployment**: Vercel
- **State Management**: React Context
- **Routing**: React Router DOM
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ma-online-store
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Update `.env` with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

5. Run the development server:
```bash
npm run dev
```

## Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy automatically on push to main branch

The `vercel.json` configuration ensures:
- ✅ No 404 errors on page refresh (SPA routing)
- ✅ Admin routes work correctly
- ✅ Database access maintained in production
- ✅ Proper CORS headers for API calls

### Database Setup

1. Create a new Supabase project
2. Run the migrations in the `supabase/migrations` folder
3. Set up Row Level Security (RLS) policies
4. Configure storage buckets for images

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── admin/          # Admin-specific components
│   ├── common/         # Shared components
│   ├── layout/         # Layout components
│   └── products/       # Product-related components
├── context/            # React Context providers
├── hooks/              # Custom React hooks
├── lib/                # External library configurations
├── pages/              # Page components
├── services/           # API and database services
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Admin Access

Access the admin dashboard at `/admin-user` with the following credentials:
- Username: `admin`
- Password: `admin123`

## Features Overview

### Customer Features
- Browse products by category
- Search and filter products
- Add items to cart
- Place orders via WhatsApp
- View promotions and deals
- Contact support

### Admin Features
- Product management (CRUD operations)
- Image upload and management
- Order tracking
- Inventory management
- Analytics dashboard
- Real-time sync with main website

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, contact us at support@mastore.com or use the in-app chat feature.