#!/usr/bin/env node

const path = require('path')
const fs = require('fs/promises')
const { createClient } = require('@supabase/supabase-js')

require('dotenv').config({ path: path.join(process.cwd(), '.env.local') })

const DATA_DIR = path.join(process.cwd(), 'data')
const TABLE = 'app_documents'

async function readJsonFiles() {
  const entries = await fs.readdir(DATA_DIR, { withFileTypes: true })
  const jsonFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json'))

  const payloads = []

  for (const file of jsonFiles) {
    const filePath = path.join(DATA_DIR, file.name)
    const raw = await fs.readFile(filePath, 'utf-8')

    try {
      const value = JSON.parse(raw)
      const key = file.name.replace(/\.json$/, '')
      payloads.push({ key, value })
    } catch (error) {
      console.error(`Skipping ${file.name}: invalid JSON`, error)
    }
  }

  return payloads
}

async function upsertDocuments(supabase, documents) {
  const chunkSize = 50
  for (let i = 0; i < documents.length; i += chunkSize) {
    const chunk = documents.slice(i, i + chunkSize)
    const { error } = await supabase.from(TABLE).upsert(
      chunk.map((doc) => ({ ...doc, updated_at: new Date().toISOString() })),
      { onConflict: 'key' }
    )

    if (error) {
      throw error
    }

    console.log(`Upserted ${chunk.length} records into ${TABLE}`)
  }
}

async function main() {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.')
    process.exit(1)
  }

  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } })

  console.log('Reading local JSON data...')
  const documents = await readJsonFiles()

  if (!documents.length) {
    console.log('No JSON documents found to migrate.')
    return
  }

  console.log(`Preparing to upsert ${documents.length} documents into Supabase.`)
  await upsertDocuments(supabase, documents)

  console.log('Migration complete!')
}

main().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})

