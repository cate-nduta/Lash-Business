/**
 * AI-Powered Booking Website Course Structure
 * 
 * Build a Professional Booking Website with AI: From Zero to Launch
 * 
 * A complete, step-by-step course designed for absolute beginners.
 * No coding experience required - just passion and the willingness to learn.
 * Even a 12-year-old can follow this and build a beautiful, professional website.
 */

export interface Lesson {
  id: string
  title: string
  description: string
  estimatedTime: string
  content?: string // Detailed lesson content with prompts
}

export interface Module {
  id: string
  title: string
  description: string
  estimatedTime: string
  lessons: Lesson[]
  status: 'completed' | 'pending'
}

export const aiCourseStructure: Module[] = [
  {
    id: '1',
    title: 'Introduction & Mindset (Getting Ready to Build)',
    description: 'Understand the full journey and possibilities. Learn website basics, AI role, and course scope.',
    estimatedTime: '1.5 hours',
    status: 'completed',
    lessons: [
      {
        id: '1',
        title: 'What This Course Will Help You Build',
        description: 'Overview of the complete booking website you will build and what you will achieve.',
        estimatedTime: '20 minutes',
      },
      {
        id: '2',
        title: 'What a Website Is (Simple Explanation)',
        description: 'Beginner-friendly explanation of websites, how they work, and what makes them functional.',
        estimatedTime: '20 minutes',
      },
      {
        id: '3',
        title: 'What AI Can and Cannot Do',
        description: 'Understanding AI capabilities, limitations, and realistic expectations for building websites.',
        estimatedTime: '20 minutes',
      },
      {
        id: '4',
        title: 'Why Cursor (Not ChatGPT Alone)',
        description: 'Why Cursor is the right tool for building websites and how it differs from ChatGPT.',
        estimatedTime: '20 minutes',
      },
      {
        id: '5',
        title: 'Examples of Websites You Can Build',
        description: 'Real-world examples and inspiration for websites you can create with these skills.',
        estimatedTime: '10 minutes',
      },
    ]
  },
  {
    id: '2',
    title: 'How Websites Work (Beginner Foundations)',
    description: 'Student understands how websites function at a high level. Conceptual clarity without coding.',
    estimatedTime: '2 hours',
    status: 'completed',
    lessons: [
      {
        id: '1',
        title: 'Frontend vs Backend Explained Simply',
        description: 'Understanding the difference between what users see and what happens behind the scenes.',
        estimatedTime: '25 minutes',
      },
      {
        id: '2',
        title: 'What Hosting Means',
        description: 'Learn what website hosting is, why it matters, and how it works in simple terms.',
        estimatedTime: '25 minutes',
      },
      {
        id: '3',
        title: 'What a Domain Is',
        description: 'Understanding domain names, how they work, and why they are important for your website.',
        estimatedTime: '25 minutes',
      },
      {
        id: '4',
        title: 'What a Database Is',
        description: 'Learn what databases are, why websites need them, and how they store information.',
        estimatedTime: '25 minutes',
      },
      {
        id: '5',
        title: 'How Everything Connects',
        description: 'See how frontend, backend, hosting, domain, and database work together to create a website.',
        estimatedTime: '20 minutes',
      },
    ]
  },
  {
    id: '3',
    title: 'Setting Up GitHub (Saving Your Work Safely)',
    description: 'Student can store and manage website code. Version control confidence.',
    estimatedTime: '1.5 hours',
    status: 'completed',
    lessons: [
      {
        id: '1',
        title: 'What GitHub Is',
        description: 'Understanding what GitHub is, why it matters, and how it helps you save and manage your code.',
        estimatedTime: '20 minutes',
      },
      {
        id: '2',
        title: 'Creating a GitHub Account',
        description: 'Step-by-step guide to creating your GitHub account and setting it up for your first project.',
        estimatedTime: '15 minutes',
      },
      {
        id: '3',
        title: 'Creating Your First Repository',
        description: 'Learn how to create a repository, understand what it is, and set it up for your booking website.',
        estimatedTime: '20 minutes',
      },
      {
        id: '4',
        title: 'Understanding Commits',
        description: 'Learn what commits are, why they matter, and how to use them to save your work safely.',
        estimatedTime: '20 minutes',
      },
      {
        id: '5',
        title: 'Connecting GitHub to Cursor',
        description: 'Connect your GitHub repository to Cursor so you can save your work directly from your code editor.',
        estimatedTime: '15 minutes',
      },
    ]
  },
  {
    id: '4',
    title: 'Setting Up Your AI Development Environment',
    description: 'Student can confidently use Cursor. AI-assisted coding workflow.',
    estimatedTime: '2 hours',
    status: 'completed',
    lessons: [
      {
        id: '1',
        title: 'Installing Cursor',
        description: 'Step-by-step guide to downloading and installing Cursor on your computer.',
        estimatedTime: '20 minutes',
      },
      {
        id: '2',
        title: 'Cursor Interface Overview',
        description: 'Learn the Cursor interface, understand the layout, and navigate the code editor.',
        estimatedTime: '25 minutes',
      },
      {
        id: '3',
        title: 'How Cursor Uses AI',
        description: 'Understand how Cursor integrates AI, the different AI features, and when to use them.',
        estimatedTime: '25 minutes',
      },
      {
        id: '4',
        title: 'Writing Effective Cursor Prompts',
        description: 'Learn how to write prompts that get great results from Cursor AI.',
        estimatedTime: '30 minutes',
      },
      {
        id: '5',
        title: 'Fixing Errors Using Cursor',
        description: 'Learn how to use Cursor to identify, understand, and fix errors in your code.',
        estimatedTime: '20 minutes',
      },
    ]
  },
  {
    id: '5',
    title: 'Planning Your Website (Design & Structure)',
    description: 'Define website purpose, structure, and design direction before coding.',
    estimatedTime: '2 hours',
    status: 'completed',
    lessons: [
      {
        id: '1',
        title: 'Choosing Website Type (Portfolio, Business, Blog, Booking)',
        description: 'Understanding different website types and choosing the right one for your needs.',
        estimatedTime: '25 minutes',
      },
      {
        id: '2',
        title: 'Defining Pages Needed',
        description: 'Identifying essential pages and creating a clear site structure.',
        estimatedTime: '25 minutes',
      },
      {
        id: '3',
        title: 'Choosing Colors & Theme',
        description: 'Selecting a color palette and design theme that matches your brand.',
        estimatedTime: '30 minutes',
      },
      {
        id: '4',
        title: 'Typography Basics',
        description: 'Understanding fonts, readability, and typography choices for your website.',
        estimatedTime: '25 minutes',
      },
      {
        id: '5',
        title: 'Translating Design to Cursor Prompts',
        description: 'How to describe your design vision clearly to Cursor for implementation.',
        estimatedTime: '25 minutes',
      },
    ]
  },
  {
    id: '6',
    title: 'Building the Homepage with Cursor',
    description: 'Create a professional, responsive homepage using Cursor step-by-step.',
    estimatedTime: '3 hours',
    status: 'completed',
    lessons: [
      {
        id: '1',
        title: 'Homepage Sections Explained',
        description: 'Understanding the essential sections every homepage needs and their purpose.',
        estimatedTime: '30 minutes',
      },
      {
        id: '2',
        title: 'Generating Homepage Layout',
        description: 'Using Cursor to create the initial homepage structure and layout.',
        estimatedTime: '45 minutes',
      },
      {
        id: '3',
        title: 'Editing Text & Colors',
        description: 'Refining content, updating text, and applying your color palette.',
        estimatedTime: '40 minutes',
      },
      {
        id: '4',
        title: 'Making It Mobile-Friendly',
        description: 'Ensuring your homepage looks great and works perfectly on all devices.',
        estimatedTime: '35 minutes',
      },
      {
        id: '5',
        title: 'Improving Visual Hierarchy',
        description: 'Enhancing spacing, typography, and layout to guide user attention effectively.',
        estimatedTime: '30 minutes',
      },
    ]
  },
  {
    id: '7',
    title: 'Building Additional Pages (About, Services, Contact)',
    description: 'Create essential website pages using the same techniques from your homepage.',
    estimatedTime: '3 hours',
    status: 'completed',
    lessons: [
      {
        id: '1',
        title: 'About Page Structure',
        description: 'Understanding what makes an effective About page and how to structure it.',
        estimatedTime: '30 minutes',
      },
      {
        id: '2',
        title: 'Services Page Layout',
        description: 'Creating a clear, organized Services page that showcases what you offer.',
        estimatedTime: '45 minutes',
      },
      {
        id: '3',
        title: 'Pricing & Currency',
        description: 'Displaying prices clearly and handling multiple currencies if needed.',
        estimatedTime: '40 minutes',
      },
      {
        id: '4',
        title: 'Contact Page Form',
        description: 'Building a functional contact form that visitors can use to reach you.',
        estimatedTime: '45 minutes',
      },
      {
        id: '5',
        title: 'Page Navigation',
        description: 'Connecting all your pages with clear navigation so visitors can move between them easily.',
        estimatedTime: '30 minutes',
      },
    ]
  },
  {
    id: '8',
    title: 'Email & Calendar Integration',
    description: 'Set up professional email and calendar integration for your booking website.',
    estimatedTime: '2 hours',
    status: 'completed',
    lessons: [
      {
        id: '1',
        title: 'Professional Email Explained',
        description: 'Understanding professional email vs. personal email and why it matters for your business.',
        estimatedTime: '20 minutes',
      },
      {
        id: '2',
        title: 'Setting Up Zoho Email',
        description: 'Step-by-step guide to setting up professional email with Zoho Mail.',
        estimatedTime: '35 minutes',
      },
      {
        id: '3',
        title: 'Google Gmail Option',
        description: 'Alternative option: Setting up professional email with Google Workspace.',
        estimatedTime: '25 minutes',
      },
      {
        id: '4',
        title: 'Google Calendar Integration',
        description: 'Connecting Google Calendar to your website for automatic appointment scheduling.',
        estimatedTime: '30 minutes',
      },
      {
        id: '5',
        title: 'Contact Form Email Triggers',
        description: 'Setting up your contact form to send emails when visitors submit inquiries.',
        estimatedTime: '20 minutes',
      },
    ]
  },
  {
    id: '9',
    title: 'Database Setup with Supabase',
    description: 'Set up a database to store booking data, contact form submissions, and other website data.',
    estimatedTime: '3 hours',
    status: 'completed',
    lessons: [
      {
        id: '1',
        title: 'What Supabase Is',
        description: 'Understanding what Supabase is, why you need it, and how it works for storing website data.',
        estimatedTime: '30 minutes',
      },
      {
        id: '2',
        title: 'Creating a Supabase Project',
        description: 'Step-by-step guide to creating your Supabase account and setting up your first project.',
        estimatedTime: '40 minutes',
      },
      {
        id: '3',
        title: 'Tables & Fields',
        description: 'Understanding database tables, fields, and how to structure your data effectively.',
        estimatedTime: '45 minutes',
      },
      {
        id: '4',
        title: 'Connecting Website to Supabase',
        description: 'Connecting your website to Supabase and setting up the API connection.',
        estimatedTime: '40 minutes',
      },
      {
        id: '5',
        title: 'Storing Form Data',
        description: 'Saving contact form submissions and booking data to your Supabase database.',
        estimatedTime: '30 minutes',
      },
    ]
  },
  {
    id: '10',
    title: 'Payments & Checkout (Optional)',
    description: 'Learn how to accept payments online through your booking website.',
    estimatedTime: '2 hours',
    status: 'completed',
    lessons: [
      {
        id: '1',
        title: 'How Online Payments Work',
        description: 'Understanding payment processing, payment gateways, and how online payments flow from customer to your account.',
        estimatedTime: '25 minutes',
      },
      {
        id: '2',
        title: 'PayPal or Stripe Integration',
        description: 'Step-by-step guide to integrating PayPal or Stripe payment processing into your website.',
        estimatedTime: '35 minutes',
      },
      {
        id: '3',
        title: 'Pesapal for African Countries',
        description: 'Setting up Pesapal payment gateway, ideal for businesses operating in African countries.',
        estimatedTime: '30 minutes',
      },
      {
        id: '4',
        title: 'Testing Payments',
        description: 'How to test payment integrations safely using test mode and test cards without processing real transactions.',
        estimatedTime: '20 minutes',
      },
      {
        id: '5',
        title: 'Security Basics',
        description: 'Essential security practices for handling payments, protecting customer data, and ensuring PCI compliance.',
        estimatedTime: '20 minutes',
      },
    ]
  },
  {
    id: '11',
    title: 'Domain & Deployment (Going Live)',
    description: 'Deploy your website to the internet and make it accessible to the world with a custom domain.',
    estimatedTime: '2 hrs',
    status: 'completed',
    lessons: [
      {
        id: '1',
        title: 'Buying a Domain',
        description: 'Learn how to purchase a domain name for your website, choose the right domain registrar, and understand domain pricing.',
        estimatedTime: '25 minutes',
      },
      {
        id: '2',
        title: 'Connecting Domain to Netlify',
        description: 'Step-by-step guide to connecting your custom domain to your Netlify-hosted website.',
        estimatedTime: '30 minutes',
      },
      {
        id: '3',
        title: 'SSL & HTTPS',
        description: 'Understanding SSL certificates, HTTPS security, and ensuring your website is secure for visitors.',
        estimatedTime: '20 minutes',
      },
      {
        id: '4',
        title: 'Environment Variables',
        description: 'Learn how to securely configure environment variables for your deployed website, including API keys and sensitive data.',
        estimatedTime: '25 minutes',
      },
      {
        id: '5',
        title: 'Final Deployment',
        description: 'Complete the deployment process, verify everything works correctly, and launch your website to the world.',
        estimatedTime: '20 minutes',
      },
    ]
  },
  {
    id: '12',
    title: 'Testing, Launch & Growth',
    description: 'Launch confidently, fix issues, and learn how to grow and maintain your website long-term.',
    estimatedTime: '1.5 hours',
    status: 'completed',
    lessons: [
      {
        id: '1',
        title: 'Testing Checklist',
        description: 'Comprehensive pre-launch testing across pages, forms, devices, and browsers.',
        estimatedTime: '20 minutes',
      },
      {
        id: '2',
        title: 'Fixing Errors with Cursor',
        description: 'Using Cursor to understand, debug, and fix errors even if you are not a developer.',
        estimatedTime: '25 minutes',
      },
      {
        id: '3',
        title: 'Improving Design Over Time',
        description: 'Iterating on your design with small improvements that compound over time.',
        estimatedTime: '20 minutes',
      },
      {
        id: '4',
        title: 'Updating Content',
        description: 'Keeping your website content fresh, accurate, and aligned with your business.',
        estimatedTime: '20 minutes',
      },
      {
        id: '5',
        title: 'Next Steps & Confidence',
        description: 'Becoming a confident long-term website owner with clear next steps and goals.',
        estimatedTime: '20 minutes',
      },
    ]
  },
]
