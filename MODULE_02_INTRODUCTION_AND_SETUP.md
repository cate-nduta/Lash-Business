# Module 1: Introduction and Setup

## Overview

In this module, you'll learn what we're building, understand the tools we'll use, and set up your development environment. By the end of this module, you'll have everything installed and ready to start building.

**Estimated Time**: 2-3 hours

---

## Lesson 1.1: Understanding What We're Building

### What is a Client-Booking Website?

A client-booking website is an online platform where your customers can:
- View your available services
- Select a date and time for their appointment
- Book an appointment online
- Pay for their booking (deposit or full payment)
- Receive email confirmations
- Manage their bookings through an account

### Key Features We'll Build

1. **Homepage** - Beautiful landing page showcasing your business
2. **Services Page** - Display all your services with descriptions and pricing
3. **Booking Page** - Interactive calendar and booking form
4. **Payment System** - Secure payment processing
5. **Client Accounts** - Registration, login, and booking history
6. **Admin Dashboard** - Manage bookings, clients, and services
7. **Email Notifications** - Automated confirmations and reminders

### Technology Stack Overview

Don't worry if these terms are new - we'll explain everything as we go:

- **Next.js** - The framework we'll use to build the website (like WordPress, but more powerful)
- **React** - A library for building user interfaces
- **TypeScript** - JavaScript with type safety (helps prevent errors)
- **Tailwind CSS** - A CSS framework for styling (makes design easier)
- **Supabase** - A backend service for database and authentication (handles data storage)
- **Payment Gateway** - Service that processes payments (like Stripe or PayPal)

### Why These Technologies?

- **Next.js**: Makes building websites fast and easy
- **TypeScript**: Catches errors before they become problems
- **Tailwind CSS**: Speeds up design work significantly
- **Supabase**: Free tier available, easy to use, no server management needed
- **Modern Stack**: Industry-standard tools used by major companies

---

## Lesson 1.2: Installing Required Software

Before we start coding, we need to install some software on your computer. Follow these steps carefully.

### Step 1: Install Node.js

Node.js is a JavaScript runtime that allows us to run JavaScript on our computer (not just in browsers).

**For Windows:**
1. Go to [https://nodejs.org/](https://nodejs.org/)
2. Download the "LTS" (Long Term Support) version
3. Run the installer
4. Accept all default options
5. Click "Install"

**For Mac:**
1. Go to [https://nodejs.org/](https://nodejs.org/)
2. Download the "LTS" version
3. Open the downloaded `.pkg` file
4. Follow the installation wizard
5. Accept all default options

**For Linux:**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or use your package manager
sudo apt install nodejs npm
```

**Verify Installation:**
1. Open your terminal (Command Prompt on Windows, Terminal on Mac/Linux)
2. Type: `node --version`
3. You should see something like: `v20.x.x` (any version 18 or higher is fine)
4. Type: `npm --version`
5. You should see something like: `10.x.x`

✅ **Checkpoint**: If both commands show version numbers, you're good to go!

### Step 2: Install a Code Editor

You'll need a code editor to write and edit code. We recommend **Visual Studio Code** (it's free and powerful).

**Installation:**
1. Go to [https://code.visualstudio.com/](https://code.visualstudio.com/)
2. Download for your operating system
3. Run the installer
4. Accept all default options

**Recommended Extensions for VS Code:**
After installing VS Code, install these helpful extensions:

1. Open VS Code
2. Click the Extensions icon (square icon on the left sidebar) or press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (Mac)
3. Search for and install:
   - **ES7+ React/Redux/React-Native snippets**
   - **Tailwind CSS IntelliSense**
   - **Prettier - Code formatter**
   - **ESLint**
   - **TypeScript and JavaScript Language Features** (usually pre-installed)

### Step 3: Install Git (Optional but Recommended)

Git is a version control system that helps you track changes to your code.

**For Windows:**
1. Go to [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. Download and run the installer
3. Accept all default options

**For Mac:**
```bash
# Using Homebrew (if you have it)
brew install git

# Or download from: https://git-scm.com/download/mac
```

**For Linux:**
```bash
sudo apt install git  # Ubuntu/Debian
# or
sudo yum install git  # CentOS/RHEL
```

**Verify Installation:**
Open terminal and type: `git --version`
You should see: `git version 2.x.x`

---

## Lesson 1.3: Creating Your Project Folder

Now let's create a folder for your project and set it up.

### Step 1: Create Project Folder

1. Open your terminal/command prompt
2. Navigate to where you want to create your project (e.g., Desktop or Documents)
3. Create a new folder:

**Windows:**
```bash
cd Desktop
mkdir booking-website
cd booking-website
```

**Mac/Linux:**
```bash
cd ~/Desktop
mkdir booking-website
cd booking-website
```

### Step 2: Initialize Your Project

In your terminal (make sure you're in the `booking-website` folder), run:

```bash
npm init -y
```

This creates a `package.json` file that will track your project's dependencies.

### Step 3: Open in VS Code

1. Open Visual Studio Code
2. Go to File → Open Folder
3. Select your `booking-website` folder
4. You should now see your project folder in the left sidebar

---

## Lesson 1.4: Installing Next.js and Dependencies

Now we'll install Next.js and all the tools we need to build our website.

### Step 1: Install Next.js

In your terminal (make sure you're in the `booking-website` folder), run:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
```

This command will:
- Create a Next.js project in the current folder (`.`)
- Set up TypeScript
- Configure Tailwind CSS
- Set up ESLint (code quality tool)
- Use the App Router (modern Next.js structure)
- Configure import aliases

**You'll be asked some questions:**
- Would you like to use `src/` directory? → **No** (we already said `--no-src-dir`)
- Would you like to use App Router? → **Yes** (already set)
- Would you like to customize the default import alias? → **No** (already set)

Press Enter to accept defaults for any other questions.

**This may take 2-5 minutes** - be patient!

### Step 2: Verify Installation

After installation completes, you should see:
- A `node_modules` folder (contains all dependencies)
- Several new files and folders
- A message saying "Success! Created a new Next.js app"

### Step 3: Install Additional Dependencies

We need to install some additional packages for our booking website:

```bash
npm install @supabase/supabase-js googleapis resend date-fns
```

**What these do:**
- `@supabase/supabase-js` - Client library for Supabase (database)
- `googleapis` - Google Calendar API integration
- `resend` - Email sending service
- `date-fns` - Date manipulation utilities

### Step 4: Install Development Dependencies

```bash
npm install -D @types/node @types/react @types/react-dom
```

These are TypeScript type definitions that help with code completion and error checking.

---

## Lesson 1.5: Understanding the Project Structure

Let's explore what Next.js created for us.

### Project Structure Overview

```
booking-website/
├── app/                    # Main application folder (App Router)
│   ├── layout.tsx         # Root layout (wraps all pages)
│   ├── page.tsx           # Homepage
│   ├── globals.css        # Global styles
│   └── favicon.ico        # Website icon
├── public/                # Static files (images, etc.)
├── node_modules/          # Installed packages (don't edit)
├── .gitignore            # Files to ignore in Git
├── next.config.js        # Next.js configuration
├── package.json          # Project dependencies and scripts
├── postcss.config.js     # PostCSS configuration (for Tailwind)
├── tailwind.config.js    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

### Key Files Explained

**`app/layout.tsx`**
- This is the root layout that wraps every page
- Here you can add things like navigation, footer, or global styles
- Think of it as the "frame" of your website

**`app/page.tsx`**
- This is your homepage
- Whatever you put here will show on `http://localhost:3000`

**`app/globals.css`**
- Global CSS styles
- Tailwind CSS directives are imported here

**`package.json`**
- Lists all your project dependencies
- Contains scripts to run your project

**`next.config.js`**
- Configuration for Next.js
- We'll modify this later for image optimization, etc.

### Understanding the App Router

Next.js uses a file-based routing system:
- `app/page.tsx` → `/` (homepage)
- `app/about/page.tsx` → `/about`
- `app/booking/page.tsx` → `/booking`
- `app/services/page.tsx` → `/services`

This makes it easy to create new pages - just create a new folder with a `page.tsx` file!

---

## Lesson 1.6: Running Your Development Server

Let's start your website and see it in action!

### Step 1: Start the Development Server

In your terminal (make sure you're in the `booking-website` folder), run:

```bash
npm run dev
```

You should see output like:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Ready in 2.3s
```

### Step 2: View Your Website

1. Open your web browser
2. Go to: `http://localhost:3000`
3. You should see the default Next.js welcome page!

### Step 3: Make Your First Change

1. Open `app/page.tsx` in VS Code
2. Find the main content
3. Change some text
4. Save the file (`Ctrl+S` or `Cmd+S`)
5. Go back to your browser - the page should automatically update!

This is called **Hot Module Replacement (HMR)** - changes appear instantly without refreshing!

### Step 4: Stop the Server

When you're done working:
- Press `Ctrl+C` in your terminal to stop the development server
- You can restart it anytime with `npm run dev`

---

## Lesson 1.7: Setting Up Environment Variables

Environment variables store sensitive information like API keys. We'll set these up now (even though we'll use them later).

### Step 1: Create `.env.local` File

1. In your project root, create a new file called `.env.local`
2. This file will store your environment variables
3. **Important**: This file should NEVER be committed to Git (it's already in `.gitignore`)

### Step 2: Add Placeholder Variables

Open `.env.local` and add:

```env
# Base URL (change this when you deploy)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Supabase (we'll set this up in Module 5)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key

# Google Calendar (we'll set this up in Module 3)
GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_PROJECT_ID=
GOOGLE_CALENDAR_ID=primary

# Email Service (we'll set this up in Module 7)
RESEND_API_KEY=

# Payment Gateway (we'll set this up in Module 4)
PAYMENT_GATEWAY_API_KEY=
```

**Note**: We'll fill in these values as we build each feature. For now, just create the file.

### Step 3: Restart Development Server

After creating `.env.local`:
1. Stop your server (`Ctrl+C`)
2. Restart it (`npm run dev`)
3. Environment variables are loaded when the server starts

---

## Lesson 1.8: Understanding Package.json Scripts

Let's look at the scripts available in your `package.json`:

### Available Scripts

Open `package.json` and find the `"scripts"` section:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

**What each script does:**

- `npm run dev` - Starts development server (what we've been using)
- `npm run build` - Creates production build (for deployment)
- `npm start` - Runs production server (after building)
- `npm run lint` - Checks code for errors and style issues

### When to Use Each

- **Development**: Always use `npm run dev` when building
- **Testing Production Build**: Use `npm run build` then `npm start`
- **Before Deploying**: Always run `npm run lint` to check for errors

---

## Module 1 Checkpoint

Before moving to Module 2, make sure you can:

✅ Install Node.js and verify it works  
✅ Install VS Code with recommended extensions  
✅ Create a Next.js project successfully  
✅ Run the development server and see the website  
✅ Make a change and see it update automatically  
✅ Understand the basic project structure  
✅ Create `.env.local` file  

### Troubleshooting Common Issues

**Problem**: `npm` command not found  
**Solution**: Make sure Node.js is installed and restart your terminal

**Problem**: Port 3000 already in use  
**Solution**: Either stop the other process using port 3000, or run: `npm run dev -- -p 3001`

**Problem**: Changes not showing in browser  
**Solution**: Hard refresh with `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

**Problem**: VS Code not showing file suggestions  
**Solution**: Make sure TypeScript extension is installed and enabled

---

## What's Next?

Congratulations! You've completed Module 1. You now have:
- ✅ All required software installed
- ✅ A working Next.js project
- ✅ Development environment set up
- ✅ Understanding of the project structure

**Ready for Module 2?**  
Open `MODULE_02_BUILDING_THE_FOUNDATION.md` to start building your website's foundation!

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [VS Code Keyboard Shortcuts](https://code.visualstudio.com/docs/getstarted/keybindings)

