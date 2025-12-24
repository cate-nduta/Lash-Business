# Lesson 6: Running Your Development Server

## Introduction

Time to see your website come to life! Let's start the development server and view your website in the browser.

**Estimated Time**: 15 minutes

---

## Starting the Development Server

### Step 1: Open Terminal

In VS Code:
- **View → Terminal**
- Or press: `Ctrl + ` (backtick)
- Or: `Ctrl + Shift + ` (backtick)

### Step 2: Run Dev Command

In the terminal, type:

```bash
npm run dev
```

### Step 3: Wait for Compilation

You'll see:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Ready in 2.3s
```

**The server is running!**

---

## Viewing Your Website

### Open in Browser

1. **Copy the URL**: `http://localhost:3000`
2. **Open browser**: Chrome, Firefox, Safari, or Edge
3. **Paste URL**: In address bar
4. **Press Enter**

You should see the Next.js welcome page!

---

## Understanding Hot Reload

### What is Hot Reload?

When you save changes to your code:
- **Page automatically refreshes**
- **Changes appear instantly**
- **No need to restart server**

### Try It!

1. Open `app/page.tsx`
2. Change some text
3. Save the file (`Ctrl + S`)
4. Watch browser update automatically!

---

## Stopping the Server

### How to Stop

In the terminal:
- Press `Ctrl + C`
- Type `Y` if prompted
- Server stops

**To restart**: Run `npm run dev` again

---

## Common Issues

### Port Already in Use

**Error**: "Port 3000 is already in use"

**Solution**: 
```bash
npm run dev -- -p 3001
```
This uses port 3001 instead.

### Changes Not Showing

**Solution**:
- Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Or: Clear browser cache

### Server Won't Start

**Solution**:
- Check for errors in terminal
- Make sure you're in project folder
- Try: `npm install` then `npm run dev`

---

## Development vs Production

### Development Mode (`npm run dev`)

- **Fast refresh**: Instant updates
- **Error messages**: Detailed errors
- **Not optimized**: Slower performance
- **For**: Building and testing

### Production Mode (`npm run build` + `npm start`)

- **Optimized**: Fast performance
- **Minified**: Smaller files
- **For**: Live website

**We'll use production mode when deploying!**

---

## Key Takeaways

✅ **`npm run dev`** starts development server

✅ **http://localhost:3000** is your local website

✅ **Hot reload** updates page automatically

✅ **`Ctrl + C`** stops the server

✅ **Development mode** is for building, production is for live site

---

## What's Next?

Excellent! Your development environment is working. In the next lesson, we'll set up environment variables for secure configuration.

**Ready to continue?** Click "Next Lesson" to proceed!

