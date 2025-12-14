# Build Project Tracking System

This document explains how to track build projects from payment to delivery.

## Overview

When an invoice is marked as "paid", a build project is automatically created. This project tracks the entire workflow from payment receipt to final delivery.

## Workflow Steps

### 1. Build Slot Reserved ✓
- **When:** Automatically when invoice is marked as "paid"
- **What it means:** Payment received, build slot is now reserved for this client
- **What unlocks:**
  - Client can now proceed with intake form
  - Build timeline can be sent
  - Build can begin

### 2. Intake Form Sent ✓
- **When:** You manually mark this after sending the intake form to the client
- **What it means:** Client has received the intake form to provide their business details
- **Next step:** Wait for client to complete intake form, then send build timeline

### 3. Build Timeline Sent ✓
- **When:** You manually mark this after sending the build timeline
- **What it means:** Client knows the project timeline and milestones
- **Next step:** Begin building once client provides necessary information

### 4. Build Started ✓
- **When:** You manually mark this when you begin actual development work
- **What it means:** Active development has begun
- **Next step:** Continue building according to timeline

### 5. Additional Milestones
- You can add custom milestones as needed
- Track progress through development phases
- Update status as project progresses

## Project Statuses

- **Pending Payment** - Invoice created but not paid yet
- **Build Slot Reserved** - Payment received, slot reserved
- **Intake Form Sent** - Intake form has been sent to client
- **Build Timeline Sent** - Timeline has been shared with client
- **Build Started** - Active development has begun
- **In Progress** - Currently being built
- **Under Review** - Waiting for client review/feedback
- **Ready for Delivery** - Build complete, ready for final payment (Tier 3) or handover
- **Delivered** - Project complete and handed over
- **On Hold** - Temporarily paused
- **Cancelled** - Project cancelled

## How to Use

### Access Build Projects
Navigate to `/admin/labs-build-projects` to see all active build projects.

### When Invoice is Paid
1. Go to `/admin/labs-invoices`
2. Find the invoice
3. Click "Mark as Paid"
4. **Build project is automatically created** with status "Build Slot Reserved"

### Track Workflow Steps
1. Open the build project
2. Click the milestone buttons to mark completion:
   - "Mark Reserved" - When payment received (usually automatic)
   - "Mark Sent" - After sending intake form
   - "Mark Sent" - After sending build timeline
   - "Mark Started" - When you begin building

### Update Project Status
1. Click "Edit Project" on any project
2. Update status dropdown
3. Add notes about progress
4. Add next steps
5. Save changes

### View Project Details
Each project shows:
- Business name and contact info
- Tier selected
- Payment status (upfront/second payment)
- All completed milestones with dates
- Notes and next steps
- Quick links to invoice and email client

## Payment Tracking

### Tier 1 & 2 (100% Upfront)
- When marked paid: Full amount recorded
- Build slot automatically reserved
- Status: "Build Slot Reserved"

### Tier 3 (50/50 Split)
- First 50% paid: Build slot reserved, status "Build Slot Reserved"
- Second 50% paid: Required before delivery
- Both payments tracked separately

## Automatic Features

✅ **Auto-create project** when invoice marked as paid
✅ **Auto-reserve build slot** milestone when payment received
✅ **Track payment amounts** automatically
✅ **Link to invoice** for easy reference

## Manual Tracking

You manually track:
- When intake form is sent
- When build timeline is sent
- When build actually starts
- Custom milestones
- Project notes and next steps
- Status changes

## Benefits

1. **Never lose track** of where each project is
2. **Clear workflow** - know exactly what's next
3. **Payment visibility** - see what's been paid
4. **Milestone tracking** - dates recorded automatically
5. **Notes system** - keep internal notes and next steps
6. **Status filtering** - filter by project status
7. **Professional organization** - structured, not messy

## Integration Points

- **Invoices Page** - Link to build projects
- **Consultations Page** - Can see if build project exists
- **Build Projects Page** - Central hub for all projects

This system ensures your work stays organized and you never miss a step in the build process.

