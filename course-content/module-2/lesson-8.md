# Lesson 8: Understanding Package.json Scripts

## Introduction

Let's understand npm scripts in package.json and how to use them for development, building, and deployment.

**Estimated Time**: 15 minutes

---

## What Are npm Scripts?

### Purpose

npm scripts are shortcuts for running common commands. They're defined in `package.json`.

### Benefits

- **Short commands**: `npm run dev` instead of long commands
- **Consistency**: Same commands across projects
- **Documentation**: Shows what commands are available

---

## Default Scripts

### Your package.json Scripts

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

### What Each Does

**`npm run dev`**
- Starts development server
- Enables hot reload
- Shows detailed errors
- **Use**: While building your website

**`npm run build`**
- Creates production build
- Optimizes code
- Checks for errors
- **Use**: Before deploying

**`npm start`**
- Starts production server
- Serves optimized build
- **Use**: After building, for production

**`npm run lint`**
- Checks code for errors
- Finds style issues
- **Use**: Regularly to catch problems

---

## Running Scripts

### Basic Usage

```bash
npm run [script-name]
```

**Examples:**
```bash
npm run dev      # Start development
npm run build    # Build for production
npm run lint     # Check code
```

### Shortcut

For `start` and `test`, you can omit `run`:
```bash
npm start    # Same as npm run start
```

---

## Adding Custom Scripts

### Example: Add a Script

In `package.json`:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write ."
  }
}
```

Then run:
```bash
npm run format
```

---

## Common Workflow

### Development

1. **Start dev server**: `npm run dev`
2. **Make changes**: Edit code
3. **See updates**: Browser auto-refreshes
4. **Check code**: `npm run lint`

### Before Deploying

1. **Check code**: `npm run lint`
2. **Build**: `npm run build`
3. **Test build**: `npm start` (locally)
4. **Deploy**: Push to hosting

---

## Key Takeaways

✅ **npm scripts** are shortcuts for common commands

✅ **`npm run dev`** - Development server

✅ **`npm run build`** - Production build

✅ **`npm start`** - Production server

✅ **`npm run lint`** - Code checking

✅ **Add custom scripts** as needed

---

## Module 2 Complete!

Congratulations! You've completed Module 2: Introduction and Setup.

**You've learned:**
- ✅ What you're building
- ✅ Installed required software
- ✅ Created your project
- ✅ Understood project structure
- ✅ Set up environment variables
- ✅ Learned npm scripts

**Next Module**: Building the Foundation - Create your homepage, navigation, and footer!

**Ready to continue?** Click "Next Module" to proceed!

---

## Additional Resources

- [npm Scripts Documentation](https://docs.npmjs.com/cli/v9/using-npm/scripts) - Official npm scripts guide
- [Next.js CLI](https://nextjs.org/docs/app/api-reference/cli) - Next.js command reference

**Remember**: You're making great progress! Keep going! 🚀

