# Campus Barter Web App

## Overview
A full-stack marketplace application for college students to buy, sell, and barter items on campus. Built with React, Express.js, Node.js, and PostgreSQL.

## Purpose
Connect students to trade textbooks, furniture, electronics, and other campus essentials through a trusted marketplace designed specifically for college communities.

## Tech Stack
- **Frontend**: React with TypeScript, Wouter (routing), TanStack Query (data fetching), Shadcn UI components, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT tokens with bcrypt password hashing
- **Fonts**: Inter (body text), Outfit (headings)

## Current State
**Phase 1 Complete**: All schemas and frontend components built with polished UI/UX
- Complete data models for Users, Items, and Messages
- Authentication pages (Login/Signup) with validation
- Dashboard with filtering and grid layout
- Item creation form with barter/sell toggle
- Item details page with messaging
- Messages page with conversation interface
- Responsive design with consistent spacing and typography

**Next Phase**: Backend API implementation and database integration

## Features

### MVP Features (In Progress)
1. **User Authentication**
   - Signup with name, email, password, college ID
   - Login with JWT authentication
   - Password hashing using bcrypt
   - Auth-protected routes

2. **Item Listings**
   - Create items with title, description, category, image URL
   - Item types: "barter" or "sell"
   - Barter items: specify expected exchange
   - Sell items: specify price
   - Filter by type (all/barter/sell) and category
   - View all listings in grid layout
   - View individual item details

3. **Messaging System**
   - Send messages to item owners
   - Conversation threads grouped by item
   - Real-time message display
   - Message history

### Future Enhancements
- User profile pages with listing history
- Real-time messaging with WebSocket
- Image upload instead of URL-only
- Advanced search and filtering
- Item status tracking (available, traded, sold)

## Project Structure

### Frontend (`client/src/`)
- **pages/** - Main application pages
  - `Login.tsx` - User login page
  - `Signup.tsx` - User registration page
  - `Dashboard.tsx` - Item listings with filters
  - `AddItem.tsx` - Create new item form
  - `ItemDetails.tsx` - Single item view with messaging
  - `Messages.tsx` - Conversation interface

- **components/** - Reusable UI components
  - `Navbar.tsx` - Top navigation with user menu
  - `ItemCard.tsx` - Item display card
  - `ProtectedRoute.tsx` - Auth route wrapper
  - `ui/` - Shadcn component library

- **lib/** - Utility functions
  - `auth.tsx` - Authentication context and hooks
  - `queryClient.ts` - TanStack Query configuration

### Backend (`server/`)
- `index.ts` - Express server setup
- `routes.ts` - API route definitions (to be implemented)
- `storage.ts` - Storage interface (to be implemented)
- `db.ts` - Database connection (to be implemented)

### Shared (`shared/`)
- `schema.ts` - Database models and TypeScript types
  - Users table: id, name, email, password, collegeId
  - Items table: id, userId, title, description, category, imageUrl, itemType, expectedExchange, price
  - Messages table: id, senderId, receiverId, itemId, messageText

## Design Guidelines
Following `design_guidelines.md` for consistent, professional UI:
- **Typography**: Inter for body, Outfit for headings
- **Colors**: Blue primary (#1e6cf7), clean neutrals
- **Spacing**: Consistent 4/6/8/12 unit system
- **Components**: Shadcn UI with custom campus marketplace styling
- **Layout**: Responsive grid (1-4 columns based on viewport)

## Database Schema
PostgreSQL with Drizzle ORM:
- **users**: Authentication and profile data
- **items**: Item listings with barter/sell support
- **messages**: User-to-user messaging
- Relations: Users → Items (one-to-many), Items → Messages (one-to-many), Users ↔ Messages (many-to-many)

## API Endpoints (To Be Implemented)
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/items` - Fetch all items
- `GET /api/items/:id` - Fetch single item
- `POST /api/items` - Create new item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item
- `GET /api/messages` - Fetch user messages
- `GET /api/messages/:itemId` - Fetch messages for item
- `POST /api/messages` - Send message

## Running the Project
1. Install dependencies: `npm install`
2. Push database schema: `npm run db:push`
3. Start development server: `npm run dev`
4. Access at: http://localhost:5000

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `SESSION_SECRET` - JWT secret key (auto-configured)
- Additional database credentials (PGPORT, PGUSER, PGPASSWORD, etc.)

## Recent Changes
- **2025-01-19**: Created complete data schema with Users, Items, Messages models
- **2025-01-19**: Built all frontend pages with authentication, item management, and messaging
- **2025-01-19**: Configured design tokens with Inter and Outfit fonts
- **2025-01-19**: Implemented routing with protected routes for authenticated users
