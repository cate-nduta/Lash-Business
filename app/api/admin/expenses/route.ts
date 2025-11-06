import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  date: string
  createdAt: string
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth(request)
    const data = readDataFile<{ expenses: Expense[] }>('expenses.json')
    return NextResponse.json({ expenses: data.expenses || [] })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching expenses:', error)
    return NextResponse.json({ expenses: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth(request)
    const body = await request.json()
    const { category, description, amount, date } = body

    if (!category || !description || !amount || !date) {
      return NextResponse.json(
        { error: 'Category, description, amount, and date are required' },
        { status: 400 }
      )
    }

    const data = readDataFile<{ expenses: Expense[] }>('expenses.json')
    const expenses = data.expenses || []

    const newExpense: Expense = {
      id: `expense-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category,
      description,
      amount: parseFloat(amount),
      date: new Date(date).toISOString(),
      createdAt: new Date().toISOString(),
    }

    expenses.push(newExpense)
    writeDataFile('expenses.json', { expenses })

    return NextResponse.json({ success: true, expense: newExpense })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating expense:', error)
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
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

    const data = readDataFile<{ expenses: Expense[] }>('expenses.json')
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

    writeDataFile('expenses.json', { expenses })

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
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 })
    }

    const data = readDataFile<{ expenses: Expense[] }>('expenses.json')
    let expenses = data.expenses || []
    const initialLength = expenses.length
    expenses = expenses.filter(e => e.id !== id)

    if (expenses.length === initialLength) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    writeDataFile('expenses.json', { expenses })

    return NextResponse.json({ success: true, message: 'Expense deleted successfully' })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting expense:', error)
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
  }
}

