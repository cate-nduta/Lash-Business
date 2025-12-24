# Lesson 9.3: Tables & Fields

**Estimated Time**: 45 minutes

---

## Introduction

Database tables are like spreadsheets that organize your data. This lesson explains what tables and fields are, how to create them in Supabase, and how to structure your data effectively for your booking website.

**What You'll Learn:**
- What database tables are
- What fields/columns are
- How to create tables in Supabase
- How to choose the right field types
- How to structure data for your website

---

## Understanding Tables

### Tables Are Like Spreadsheets

**Think of a table like a spreadsheet:**
- **Spreadsheet** - Rows and columns of data
- **Table** - Same concept in database

**In a spreadsheet:**
- Columns: Name, Email, Message
- Rows: Each form submission
- Cells: Individual data points

**In a database table:**
- Columns = Fields
- Rows = Records
- Cells = Data values

**Table = Organized data storage!**

---

## What Are Fields?

### Fields Are Columns

**Fields define:**
- What data you store
- Type of data (text, number, date)
- Rules for the data

**Example fields for contact form:**
- `name` - Text field
- `email` - Email field
- `message` - Text field
- `created_at` - Date/time field

**Each field stores one type of information!**

---

## Creating Your First Table

### Contact Form Table

**For storing contact form submissions, you need:**

**Table name:** `contact_submissions`

**Fields:**
- `id` - Unique identifier (auto-generated)
- `name` - Visitor's name (text)
- `email` - Visitor's email (email)
- `message` - Their message (text)
- `created_at` - When submitted (timestamp)

---

## Step-by-Step: Create Table in Supabase

### Step 1: Open Table Editor

**1. In Supabase dashboard:**
- Click "Table Editor" in sidebar
- You'll see your tables (empty at first)

**2. Create new table:**
- Click "New Table" button
- Or click "Create a new table"

---

### Step 2: Name Your Table

**1. Enter table name:**
- Use lowercase
- Use underscores for spaces
- Be descriptive

**Examples:**
- `contact_submissions`
- `bookings`
- `services`

**2. Add description (optional):**
- What this table stores
- Helps you remember

---

### Step 3: Add Fields

**For contact form table, add these fields:**

**1. id field:**
- Name: `id`
- Type: `uuid` (or `bigint`)
- Primary key: Yes
- Default: Auto-generate

**2. name field:**
- Name: `name`
- Type: `text`
- Nullable: No (required)

**3. email field:**
- Name: `email`
- Type: `text` (or `varchar`)
- Nullable: No (required)

**4. message field:**
- Name: `message`
- Type: `text`
- Nullable: No (required)

**5. created_at field:**
- Name: `created_at`
- Type: `timestamptz`
- Default: `now()` (current timestamp)

---

## Field Types Explained

### Common Field Types

**1. Text Types:**
- `text` - Unlimited text
- `varchar(n)` - Limited text (n characters)
- Use for: Names, messages, descriptions

**2. Number Types:**
- `integer` - Whole numbers
- `bigint` - Large whole numbers
- `decimal` - Decimal numbers
- Use for: Prices, quantities, IDs

**3. Date/Time Types:**
- `timestamp` - Date and time
- `timestamptz` - Date/time with timezone
- `date` - Just date
- Use for: Created dates, booking times

**4. Boolean:**
- `boolean` - True/false
- Use for: Yes/no, active/inactive

**5. UUID:**
- `uuid` - Unique identifier
- Use for: Primary keys, unique IDs

---

## Creating Tables with Cursor

### Using SQL

**You can create tables using SQL:**

```sql
CREATE TABLE contact_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

**Cursor prompt:**
```
Create a SQL script to create a contact_submissions table in Supabase with 
fields: id (uuid, primary key), name (text, required), email (text, required), 
message (text, required), and created_at (timestamp, default now).
```

---

## Booking Table Example

### For Booking Data

**Table name:** `bookings`

**Fields:**
- `id` - uuid (primary key)
- `client_name` - text (required)
- `client_email` - text (required)
- `client_phone` - text (optional)
- `service_name` - text (required)
- `booking_date` - date (required)
- `booking_time` - time (required)
- `status` - text (pending/confirmed/cancelled)
- `created_at` - timestamptz (default now())

**Cursor prompt:**
```
Create a bookings table in Supabase with fields for storing booking information:
- id (uuid, primary key)
- client_name, client_email, client_phone
- service_name, booking_date, booking_time
- status (pending/confirmed/cancelled)
- created_at (timestamp)
```

---

## Best Practices

### 1. Use Descriptive Names

**Good:**
- `contact_submissions`
- `bookings`
- `services`

**Bad:**
- `table1`
- `data`
- `stuff`

---

### 2. Choose Right Field Types

**Match type to data:**
- Names → text
- Prices → decimal
- Dates → timestamp
- Yes/No → boolean

---

### 3. Mark Required Fields

**Use NOT NULL:**
- Required fields: NOT NULL
- Optional fields: Allow NULL
- Prevents empty data

---

### 4. Add Default Values

**Useful defaults:**
- `created_at` → `now()`
- `status` → `'pending'`
- `id` → Auto-generate

---

### 5. Use Primary Keys

**Always have:**
- Primary key field
- Unique identifier
- Usually `id` field
- Auto-generated

---

## Real-World Example

### Complete Contact Form Table

**Table: `contact_submissions`**

**Fields:**
```
id          uuid        PRIMARY KEY, auto-generated
name        text        NOT NULL
email       text        NOT NULL
phone       text        NULL (optional)
message     text        NOT NULL
created_at  timestamptz DEFAULT now()
```

**SQL to create:**
```sql
CREATE TABLE contact_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

**Result:**
- Table created
- Ready to store form submissions
- All fields properly defined

---

## Viewing Your Data

### Table Editor

**In Supabase:**
- Go to Table Editor
- Click your table name
- See all data
- Add/edit/delete rows
- Visual interface

**You can:**
- View all submissions
- Edit data
- Delete records
- Export data
- Filter and search

---

## Common Mistakes

### 1. Wrong Field Types

**Bad:**
- Storing dates as text
- Storing numbers as text
- Using wrong type

**Good:**
- Use appropriate types
- Dates as timestamp
- Numbers as integer/decimal

---

### 2. Missing Primary Key

**Bad:**
- No primary key
- Can't uniquely identify rows

**Good:**
- Always have primary key
- Usually `id` field
- Auto-generated

---

### 3. Not Marking Required Fields

**Bad:**
- All fields optional
- Missing important data

**Good:**
- Mark required fields NOT NULL
- Optional fields can be NULL
- Enforce data quality

---

## Key Takeaways

1. **Tables organize data** - Like spreadsheets with rows and columns
2. **Fields are columns** - Define what data you store
3. **Choose right types** - Text for text, numbers for numbers, etc.
4. **Primary key required** - Unique identifier for each row
5. **Mark required fields** - Use NOT NULL for mandatory data
6. **Use defaults** - Auto-generate IDs, timestamps, etc.
7. **Descriptive names** - Make tables and fields clear
8. **Visual editor available** - Create tables in Supabase dashboard or with SQL

---

## What's Next?

Perfect! You understand tables and fields. Now you need to connect your website to Supabase so you can actually store data. The next lesson shows you how to connect your website to Supabase and set up the API connection.

**Ready?** Let's move to Lesson 9.4: Connecting Website to Supabase!

---

## Quick Check

Before moving on, make sure you:
- ✅ Understand what tables are (organized data storage)
- ✅ Know what fields are (columns that define data)
- ✅ Can create a table in Supabase (visual editor or SQL)
- ✅ Understand common field types (text, number, date, etc.)
- ✅ Know how to choose appropriate field types
- ✅ Understand primary keys and required fields
- ✅ Can structure data effectively for your needs

If anything is unclear, review this lesson or ask questions!
