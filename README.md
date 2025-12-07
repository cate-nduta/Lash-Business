# LashDiary - Premium Lash Extension Booking Website

A modern, full-featured booking website for lash extension services with integrated calendar management, email marketing, payment processing, and automated reminders.

## ✨ Features

- 📅 **Online Booking System** - Easy appointment booking with calendar integration
- 📧 **Email Marketing** - Newsletter, campaigns, scheduled emails, and automation
- 💳 **Payment Processing** - M-Pesa integration for deposits and payments
- 📱 **Responsive Design** - Works perfectly on mobile, tablet, and desktop
- 🔔 **Automated Reminders** - Appointment reminders and birthday emails
- 👥 **Client Accounts** - Client registration and booking history
- 🎨 **Admin Dashboard** - Complete management system for bookings, clients, and campaigns
- 📊 **Analytics** - Track bookings, campaigns, and performance
- 🔒 **Secure** - Admin authentication and secure API endpoints

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Google Cloud account (for Calendar integration)
- Zoho Mail account (for email sending)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Lash Website"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and add your configuration (see [Setup Instructions](#setup-instructions))

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📚 Setup Instructions

For detailed setup instructions, see:

- **[SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)** - Complete setup guide
- **[GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md)** - Calendar integration
- **[COMPLETE_CRON_JOBS_SETUP.md](./COMPLETE_CRON_JOBS_SETUP.md)** - Automated cron jobs
- **[MPESA_SETUP.md](./MPESA_SETUP.md)** - Payment integration
- **[ZOHO_EMAIL_SETUP.md](./ZOHO_EMAIL_SETUP.md)** - Email configuration

## 🔧 Configuration

### Required Environment Variables

See `.env.example` for all available environment variables. Minimum required:

```env
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=your-project-id
ZOHO_SMTP_USER=your-email@zoho.com
ZOHO_SMTP_PASS=your-app-password
ADMIN_PASSWORD_HASH=your-password-hash
```

### Generate Admin Password Hash

```bash
node -e "console.log(require('crypto').createHash('sha256').update('your-password').digest('hex'))"
```

## 📦 Build & Deploy

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm run start
```

### Deployment Checklist

See **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** for a complete pre-deployment checklist.

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run seed:supabase` - Seed Supabase with data (if using Supabase)

## 📁 Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/                # API routes
│   │   ├── cron/          # Cron job endpoints
│   │   ├── admin/         # Admin API routes
│   │   └── booking/       # Booking API routes
│   ├── admin/             # Admin dashboard pages
│   ├── booking/           # Booking pages
│   └── ...                # Other pages
├── components/             # React components
├── lib/                    # Utility functions
├── data/                   # JSON data files
├── public/                 # Static assets
└── types/                  # TypeScript type definitions
```

## 🔐 Security

- Admin authentication required for admin routes
- Password hashing for secure authentication
- Input validation and sanitization
- Secure API endpoints
- Environment variables for sensitive data

## 📧 Email Features

- Booking confirmations
- Appointment reminders (automated)
- Birthday emails (automated)
- Email marketing campaigns
- Scheduled email sending
- Newsletter subscriptions

## 🤖 Automated Cron Jobs

The website includes 4 automated cron jobs:

1. **Appointment Reminders** - Sends reminders 6 hours before appointments (hourly)
2. **Birthday Emails** - Sends birthday discount codes (daily at 9 AM)
3. **Scheduled Emails** - Processes scheduled campaigns (every 15 minutes)
4. **Cleanup Inactive** - Removes unused accounts (daily at 2 AM)

See **[COMPLETE_CRON_JOBS_SETUP.md](./COMPLETE_CRON_JOBS_SETUP.md)** for setup instructions.

## 🧪 Testing

### Test Cron Jobs

Visit these URLs to test cron job endpoints:

- `https://yourdomain.com/api/cron/send-reminders`
- `https://yourdomain.com/api/cron/send-birthday-emails`
- `https://yourdomain.com/api/cron/process-scheduled-emails`
- `https://yourdomain.com/api/cron/cleanup-inactive-accounts`

See **[CRON_JOBS_TESTING_GUIDE.md](./CRON_JOBS_TESTING_GUIDE.md)** for detailed testing instructions.

## 📖 Documentation

- **[SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)** - Complete setup guide
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Pre-deployment checklist
- **[WEBSITE_FEATURES_SUMMARY.md](./WEBSITE_FEATURES_SUMMARY.md)** - Features overview
- **[COMPLETE_CRON_JOBS_SETUP.md](./COMPLETE_CRON_JOBS_SETUP.md)** - Cron jobs setup
- **[CRON_JOBS_TESTING_GUIDE.md](./CRON_JOBS_TESTING_GUIDE.md)** - Testing guide

## 🐛 Troubleshooting

### Common Issues

**Build Errors:**
- Check that all environment variables are set
- Verify Node.js version (18.x or higher)
- Run `npm install` to ensure dependencies are installed

**Email Not Sending:**
- Verify Zoho SMTP credentials
- Check environment variables
- Review email service logs

**Calendar Not Syncing:**
- Verify Google Calendar API credentials
- Check that calendar is shared with service account
- Review Google Cloud Console for API errors

**Cron Jobs Not Running:**
- Check cron-job.org execution history
- Verify URLs are correct (no redirects)
- Check CRON_SECRET if using security

See individual setup guides for detailed troubleshooting.

## 📝 License

This project is private and proprietary.

## 🤝 Support

For setup help, refer to the documentation files in the repository:
- Setup guides in the root directory
- API documentation in code comments
- Troubleshooting sections in each guide

## 🎯 Next Steps

1. ✅ Complete setup using [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)
2. ✅ Configure cron jobs using [COMPLETE_CRON_JOBS_SETUP.md](./COMPLETE_CRON_JOBS_SETUP.md)
3. ✅ Review [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) before deploying
4. ✅ Deploy to your hosting platform
5. ✅ Test all features after deployment

---

**Built with:** Next.js 14, React, TypeScript, Tailwind CSS

**Deployment Ready:** ✅ Yes

**Production Status:** Ready for deployment

