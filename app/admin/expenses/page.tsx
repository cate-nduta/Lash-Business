'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog'

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  date: string
  createdAt: string
}

const EXPENSE_CATEGORIES = [
  'Supplies & Materials',
  'Rent & Utilities',
  'Transportation & Fuel',
  'Marketing & Advertising',
  'Equipment & Maintenance',
  'Insurance',
  'Professional Services',
  'Staff & Salaries',
  'Phone & Internet',
  'Miscellaneous',
]

export default function AdminExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/admin/auth')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push('/admin/login')
        } else {
          loadExpenses()
        }
      })
  }, [router])

  const loadExpenses = async () => {
    try {
      const response = await fetch('/api/admin/expenses')
      if (response.ok) {
        const data = await response.json()
        setExpenses(data.expenses || [])
      }
    } catch (error) {
      console.error('Error loading expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    setHasUnsavedChanges(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
      }

      if (editingId) {
        // Update existing expense
        const response = await fetch('/api/admin/expenses', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            ...expenseData,
          }),
        })

        const data = await response.json()

        if (response.ok && data.success) {
          setMessage({ type: 'success', text: 'Expense updated successfully!' })
          loadExpenses()
          resetForm()
        } else {
          setMessage({ type: 'error', text: data.error || 'Failed to update expense' })
        }
      } else {
        // Create new expense
        const response = await fetch('/api/admin/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expenseData),
        })

        const data = await response.json()

        if (response.ok && data.success) {
          setMessage({ type: 'success', text: 'Expense added successfully!' })
          loadExpenses()
          resetForm()
        } else {
          setMessage({ type: 'error', text: data.error || 'Failed to add expense' })
        }
      }
    } catch (error) {
      console.error('Error saving expense:', error)
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSaving(false)
      setHasUnsavedChanges(false)
    }
  }

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id)
    setFormData({
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      date: expense.date.split('T')[0],
    })
    setHasUnsavedChanges(false)
    // Scroll to form
    document.getElementById('expense-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return
    }

    try {
      const response = await fetch('/api/admin/expenses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: 'Expense deleted successfully!' })
        loadExpenses()
        if (editingId === id) {
          resetForm()
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete expense' })
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
      setMessage({ type: 'error', text: 'An error occurred' })
    }
  }

  const resetForm = () => {
    setFormData({
      category: '',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
    })
    setEditingId(null)
    setHasUnsavedChanges(false)
  }

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (hasUnsavedChanges) {
      e.preventDefault()
      setPendingNavigation(href)
      setShowUnsavedDialog(true)
    }
  }

  const handleSaveAndLeave = async () => {
    if (editingId || formData.category || formData.description || formData.amount) {
      const form = document.getElementById('expense-form') as HTMLFormElement
      if (form) {
        form.requestSubmit()
        // Wait a bit for save to complete
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    setShowUnsavedDialog(false)
    setHasUnsavedChanges(false)
    if (pendingNavigation) {
      router.push(pendingNavigation)
    }
  }

  const handleLeaveWithoutSaving = () => {
    setShowUnsavedDialog(false)
    setHasUnsavedChanges(false)
    resetForm()
    if (pendingNavigation) {
      router.push(pendingNavigation)
    }
  }

  const handleCancelDialog = () => {
    setShowUnsavedDialog(false)
    setPendingNavigation(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return `KSH ${amount.toLocaleString()}`
  }

  // Calculate totals by category
  const categoryTotals = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount
    return acc
  }, {} as Record<string, number>)

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Link 
            href="/admin/dashboard" 
            className="text-brown hover:text-brown-dark"
            onClick={(e) => handleLinkClick(e, '/admin/dashboard')}
          >
            ← Back to Dashboard
          </Link>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Summary Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-display text-brown-dark mb-6">Expenses Management</h1>
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
            <p className="text-sm text-gray-600 mb-2">Total Expenses</p>
            <p className="text-4xl font-bold text-red-700">{formatCurrency(totalExpenses)}</p>
          </div>
        </div>

        {/* Add/Edit Expense Form */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6" id="expense-form">
          <h2 className="text-2xl font-display text-brown-dark mb-6">
            {editingId ? 'Edit Expense' : 'Add New Expense'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-brown-dark mb-2">
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                >
                  <option value="">Select a category</option>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-semibold text-brown-dark mb-2">
                  Amount (KSH) *
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  required
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label htmlFor="date" className="block text-sm font-semibold text-brown-dark mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  required
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-semibold text-brown-dark mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  placeholder="Enter expense description..."
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors disabled:opacity-50 font-semibold"
              >
                {saving ? 'Saving...' : editingId ? 'Update Expense' : 'Add Expense'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Expenses List */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-display text-brown-dark mb-6">All Expenses</h2>

          {/* Category Summary */}
          {Object.keys(categoryTotals).length > 0 && (
            <div className="mb-6 p-4 bg-pink-light/30 rounded-lg border-2 border-brown-light">
              <h3 className="text-lg font-semibold text-brown-dark mb-3">Expenses by Category</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries(categoryTotals)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, total]) => (
                    <div key={category} className="bg-white rounded p-3 border border-brown-light">
                      <p className="text-xs text-gray-600 mb-1">{category}</p>
                      <p className="text-sm font-semibold text-brown-dark">{formatCurrency(total)}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {expenses.length === 0 ? (
            <div className="text-center text-brown py-8">
              No expenses recorded yet. Add your first expense above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-brown-light">
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Date</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Category</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Description</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Amount</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((expense) => (
                      <tr key={expense.id} className="border-b border-brown-light/30 hover:bg-pink-light/20">
                        <td className="py-3 px-4 text-brown">{formatDate(expense.date)}</td>
                        <td className="py-3 px-4 text-brown">
                          <span className="inline-block px-3 py-1 bg-pink-light text-brown-dark rounded-full text-sm font-semibold">
                            {expense.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-brown">{expense.description}</td>
                        <td className="py-3 px-4 text-red-700 font-semibold">{formatCurrency(expense.amount)}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(expense)}
                              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(expense.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onSave={handleSaveAndLeave}
        onLeave={handleLeaveWithoutSaving}
        onCancel={handleCancelDialog}
        saving={saving}
      />
    </div>
  )
}

