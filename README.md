# EventPass

Event Accreditation Management System - A standalone application for managing event credentials with QR code verification.

## Features

- **Project Management**: Create and manage multiple event projects
- **Accreditation Records**: Add, edit, and manage accreditations with photos
- **Phase-Based Access**: Control access for Bump-In, Live, and Bump-Out phases
- **QR Code Verification**: Scan badges to verify access in real-time
- **ID Document Tracking**: Track QID, Passport, and Hayya visa expiry
- **Access Groups**: Organize attendees into groups (VIP, Staff, Media, etc.)
- **Excel Import/Export**: Bulk operations via spreadsheet
- **Reports & Statistics**: Track scans, approvals, and project metrics
- **User Management**: Role-based access control (Admin, Manager, Staff, Validator)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **UI**: shadcn/ui + Tailwind CSS
- **Storage**: Supabase (for photos)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd EventPass
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Initialize the database:
```bash
npm run db:push
npm run db:seed
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

### Test Credentials

When `DEV_AUTH_ENABLED=true`, use these credentials:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@eventpass.local | admin123 |
| Manager | manager@eventpass.local | admin123 |
| Staff | staff@eventpass.local | admin123 |
| Validator | validator@eventpass.local | admin123 |

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run linter

npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:seed      # Seed database with test data
npm run db:reset     # Reset and reseed database
```

## Project Structure

```
EventPass/
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Seed script
├── src/
│   ├── app/
│   │   ├── admin/       # Admin pages
│   │   ├── api/         # API routes
│   │   ├── validator/   # QR scanner
│   │   └── verify/      # Public verification
│   ├── components/
│   │   ├── ui/          # shadcn/ui components
│   │   └── accreditation/  # Feature components
│   └── lib/
│       ├── auth.ts      # NextAuth config
│       ├── prisma.ts    # Prisma client
│       ├── storage.ts   # Supabase storage
│       └── validations/ # Zod schemas
└── package.json
```

## API Routes

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/[id]` - Get project
- `PATCH /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project

### Accreditations
- `GET /api/accreditations` - List accreditations
- `POST /api/accreditations` - Create accreditation
- `GET /api/accreditations/[id]` - Get accreditation
- `PATCH /api/accreditations/[id]` - Update accreditation
- `POST /api/accreditations/[id]/approve` - Approve
- `POST /api/accreditations/[id]/reject` - Reject
- `POST /api/accreditations/[id]/revoke` - Revoke
- `POST /api/accreditations/[id]/reinstate` - Reinstate
- `POST /api/accreditations/[id]/photo` - Upload photo

### Scanning
- `POST /api/scan` - Verify QR code
- `GET /api/scans` - List scan history

### Other
- `GET /api/verify/[token]` - Public verification
- `GET /api/export` - Excel export
- `POST /api/import` - Excel import
- `GET /api/reports` - Statistics

## Roles & Permissions

| Role | Projects | Accreditations | Approve | Scan | Users |
|------|----------|----------------|---------|------|-------|
| Admin | Full | Full | Yes | Yes | Full |
| Manager | Create/Edit | Full | Yes | Yes | No |
| Staff | View | Create/Edit | No | No | No |
| Validator | View | View | No | Yes | No |

## Photo Storage

Photos are stored in Supabase Storage. Configure in `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_BUCKET="accreditation-photos"
```

## Production Deployment

1. Set up PostgreSQL database
2. Configure environment variables
3. Run migrations: `npx prisma migrate deploy`
4. Build: `npm run build`
5. Start: `npm run start`

## License

Private - All rights reserved
