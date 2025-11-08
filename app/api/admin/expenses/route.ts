import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { recordActivity } from '@/lib/activity-log'

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  date: string
  receiptUrl?: string
  paymentMethod?: string
  vendor?: string
  status?: 'pending' | 'approved' | 'reimbursed'
  isRecurring?: boolean
  recurringFrequency?: string
  addedBy?: string
  createdAt?: string
  updatedAt?: string
}

interface ExpenseData {
  expenses: Expense[]
}

interface ArchivedExpense extends Expense {
  deletedAt: string
  deletedBy: string
}

interface ExpenseArchiveData {
  archived: ArchivedExpense[]
}

async function archiveExpense(expense: Expense, deletedBy: string) {
  const archiveData = await readDataFile<ExpenseArchiveData>('expenses-archive.json', { archived: [] })
  const archivedEntry: ArchivedExpense = {
    ...expense,
    deletedAt: new Date().toISOString(),
    deletedBy,
  }
  const updatedArchive = {
    archived: [archivedEntry, ...(archiveData.archived || [])],
  }
  await writeDataFile('expenses-archive.json', updatedArchive)
}

export async function GET() {
  try {
    await requireAdminAuth()
    const data = await readDataFile<ExpenseData>('expenses.json', { expenses: [] })
    const archive = await readDataFile<ExpenseArchiveData>('expenses-archive.json', { archived: [] })
    return NextResponse.json({ expenses: data.expenses || [], archived: archive.archived || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'
    const body = await request.json()
    const { action } = body
    const data = await readDataFile<ExpenseData>('expenses.json', { expenses: [] })
    const expenses = data.expenses || []

    if (action === 'add') {
      const newExpense = {
        ...body.expense,
        id: `expense-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      expenses.push(newExpense)
      await writeDataFile('expenses.json', { expenses })
      await recordActivity({
        module: 'expenses',
        action: 'create',
        performedBy,
        summary: `Added expense for ${newExpense.category}`,
        targetId: newExpense.id,
        targetType: 'expense',
        details: newExpense,
      })
      return NextResponse.json({ success: true, expense: newExpense })
    }

    if (action === 'update') {
      const { id, updates } = body
      const index = expenses.findIndex((expense) => expense.id === id)
      if (index === -1) {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
      }
      expenses[index] = {
        ...expenses[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      }
      await writeDataFile('expenses.json', { expenses })
      await recordActivity({
        module: 'expenses',
        action: 'update',
        performedBy,
        summary: `Updated expense for ${expenses[index].category}`,
        targetId: expenses[index].id,
        targetType: 'expense',
        details: updates,
      })
      return NextResponse.json({ success: true, expense: expenses[index] })
    }

    if (action === 'delete') {
      const { id } = body
      const index = expenses.findIndex((expense) => expense.id === id)
      if (index === -1) {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
      }
      const [removedExpense] = expenses.splice(index, 1)
      await writeDataFile('expenses.json', { expenses })
      await archiveExpense(removedExpense, performedBy)
      await recordActivity({
        module: 'expenses',
        action: 'delete',
        performedBy,
        summary: `Deleted expense for ${removedExpense.category}`,
        targetId: removedExpense.id,
        targetType: 'expense',
        details: removedExpense,
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error managing expenses:', error)
    return NextResponse.json({ error: 'Failed to manage expenses' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdminAuth(request)
    const body = await request.json()
    const { id, category, description, amount, date } = body

    if (!id || !category || !description || !amount || !date) {
      return NextResponse.json(
        { error: 'ID, category, description, amount, and date are required' },
        { status: 400 }
      )
    }

    const data = await readDataFile<ExpenseData>('expenses.json', { expenses: [] })
    const expenses = data.expenses || []
    const expenseIndex = expenses.findIndex(e => e.id === id)

    if (expenseIndex === -1) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    expenses[expenseIndex] = {
      ...expenses[expenseIndex],
      category,
      description,
      amount: parseFloat(amount),
      date: new Date(date).toISOString(),
    }

    await writeDataFile('expenses.json', { expenses })

    return NextResponse.json({ success: true, expense: expenses[expenseIndex] })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating expense:', error)
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdminAuth(request)
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 })
    }

    const data = await readDataFile<ExpenseData>('expenses.json', { expenses: [] })
    const expenses = data.expenses || []
    const index = expenses.findIndex((expense) => expense.id === id)

    if (index === -1) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    const [removedExpense] = expenses.splice(index, 1)

    await writeDataFile('expenses.json', { expenses })
    await archiveExpense(removedExpense, performedBy)
    await recordActivity({
      module: 'expenses',
      action: 'delete',
      performedBy,
      summary: `Deleted expense for ${removedExpense.category}`,
      targetId: removedExpense.id,
      targetType: 'expense',
      details: removedExpense,
    })

    return NextResponse.json({ success: true, message: 'Expense deleted successfully' })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting expense:', error)
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
  }
}

