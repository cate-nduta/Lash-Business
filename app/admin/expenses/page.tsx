'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog'
import Toast from '@/components/Toast'

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  date: string
  paymentMethod: string
  vendor: string
  status: 'Pending' | 'Paid' | 'Reimbursed'
  receiptUrl?: string
  isRecurring: boolean
  recurringFrequency?: 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly'
  addedBy?: string
  createdAt: string
}

interface ArchivedExpense extends Expense {
  deletedAt?: string
  deletedBy?: string
}

const EXPENSE_CATEGORIES = [
  'Supplies & Materials',
  'Rent & Utilities',
  'Transportation & Fuel',
  'Marketing & Advertising',
  'Equipment & Maintenance',
  'Insurance',
  'Professional Services',
  'Staff & Salaries', // Hidden from non-owner admins
  'Phone & Internet',
  'Miscellaneous',
]

// Sensitive categories only visible to owner
const OWNER_ONLY_CATEGORIES = ['Staff & Salaries']

const PAYMENT_METHODS = [
  'Cash',
  'M-Pesa',
  'Bank Transfer',
  'Credit/Debit Card',
  'Cheque',
]

export default function AdminExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [archivedExpenses, setArchivedExpenses] = useState<ArchivedExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [userRole, setUserRole] = useState<string>('admin')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    vendor: '',
    status: 'Paid' as 'Pending' | 'Paid' | 'Reimbursed',
    isRecurring: false,
    recurringFrequency: 'Monthly' as 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly',
  })
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('all')
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
  const [budgets, setBudgets] = useState<Record<string, number>>({})
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/admin/current-user')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push('/admin/login')
        } else {
          setHasAccess(true)
          setUserRole(data.role || 'admin')
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
        setArchivedExpenses(data.archived || [])
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
      paymentMethod: expense.paymentMethod || '',
      vendor: expense.vendor || '',
      status: expense.status || 'Paid',
      isRecurring: expense.isRecurring || false,
      recurringFrequency: expense.recurringFrequency || 'Monthly',
    })
    setHasUnsavedChanges(false)
    // Scroll to form
    document.getElementById('expense-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  const requestDelete = (expense: Expense) => {
    setDeleteTarget(expense)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const response = await fetch('/api/admin/expenses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: 'Expense deleted successfully!' })
        loadExpenses()
        if (editingId === deleteTarget.id) {
          resetForm()
        }
        setDeleteTarget(null)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete expense' })
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setDeleting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      category: '',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: '',
      vendor: '',
      status: 'Paid',
      isRecurring: false,
      recurringFrequency: 'Monthly',
    })
    setEditingId(null)
    setReceiptFile(null)
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

  // Get categories available to current user
  const getAvailableCategories = () => {
    if (userRole === 'owner') {
      return EXPENSE_CATEGORIES
    }
    return EXPENSE_CATEGORIES.filter(cat => !OWNER_ONLY_CATEGORIES.includes(cat))
  }

  const availableCategories = getAvailableCategories()

  // Get date range based on selected period
  const getDateRangeForPeriod = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (selectedPeriod) {
      case 'day':
        return {
          start: today,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      case 'week':
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 7)
        return { start: weekStart, end: weekEnd }
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        return { start: monthStart, end: monthEnd }
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1)
        const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
        return { start: yearStart, end: yearEnd }
      default: // 'all'
        return null
    }
  }

  // Filter expenses based on search, filters, period, and user role
  const filteredExpenses = expenses.filter(expense => {
    // Hide salary expenses from non-owner admins
    if (userRole !== 'owner' && expense.category === 'Staff & Salaries') {
      return false
    }

    // Period filter
    if (selectedPeriod !== 'all') {
      const range = getDateRangeForPeriod()
      if (range) {
        const expenseDate = new Date(expense.date)
        if (expenseDate < range.start || expenseDate > range.end) {
          return false
        }
      }
    }

    const matchesSearch = searchTerm === '' || 
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = filterCategory === '' || expense.category === filterCategory
    const matchesStatus = filterStatus === '' || expense.status === filterStatus
    const matchesPayment = filterPaymentMethod === '' || expense.paymentMethod === filterPaymentMethod

    return matchesSearch && matchesCategory && matchesStatus && matchesPayment
  })

  // Export to CSV function
  const exportToCSV = () => {
    const headers = ['Date', 'Category', 'Description', 'Amount', 'Payment Method', 'Vendor', 'Status', 'Recurring']
    const rows = filteredExpenses.map(expense => [
      expense.date,
      expense.category,
      expense.description,
      expense.amount.toString(),
      expense.paymentMethod,
      expense.vendor,
      expense.status,
      expense.isRecurring ? `Yes (${expense.recurringFrequency})` : 'No'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    
    setMessage({ type: 'success', text: 'Expenses exported to CSV!' })
  }

  // Calculate totals by category
  const categoryTotals = filteredExpenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount
    return acc
  }, {} as Record<string, number>)

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  
  // Check budget alerts
  const budgetAlerts = Object.entries(categoryTotals).filter(([category, total]) => {
    const budget = budgets[category]
    return budget && total > budget
  })

  // Load budgets
  useEffect(() => {
    fetch('/api/admin/expenses/budgets')
      .then(res => res.json())
      .then(data => {
        if (data.budgets) {
          setBudgets(data.budgets)
        }
      })
      .catch(err => console.error('Error loading budgets:', err))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-baby-pink-light py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link 
              href="/admin/dashboard" 
              className="text-brown hover:text-brown-dark"
            >
              ← Back to Dashboard
            </Link>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-3xl font-display text-brown-dark mb-4">Access Restricted</h1>
            <p className="text-brown-dark mb-6">
              This page is only accessible to the business owner.
            </p>
            <p className="text-sm text-gray-600">
              Expenses tracking contains sensitive financial information and is restricted to owner access only.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      {/* Toast Notification */}
      {message && (
        <Toast
          message={message.text}
          type={message.type}
          onClose={() => setMessage(null)}
        />
      )}

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

        {/* Period Selector */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-display text-brown-dark mb-4">View Period</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedPeriod('day')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                selectedPeriod === 'day'
                  ? 'bg-brown-dark text-white shadow-lg'
                  : 'bg-pink-light/30 text-brown-dark hover:bg-pink-light/50'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setSelectedPeriod('week')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                selectedPeriod === 'week'
                  ? 'bg-brown-dark text-white shadow-lg'
                  : 'bg-pink-light/30 text-brown-dark hover:bg-pink-light/50'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setSelectedPeriod('month')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                selectedPeriod === 'month'
                  ? 'bg-brown-dark text-white shadow-lg'
                  : 'bg-pink-light/30 text-brown-dark hover:bg-pink-light/50'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setSelectedPeriod('year')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                selectedPeriod === 'year'
                  ? 'bg-brown-dark text-white shadow-lg'
                  : 'bg-pink-light/30 text-brown-dark hover:bg-pink-light/50'
              }`}
            >
              This Year
            </button>
            <button
              onClick={() => setSelectedPeriod('all')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                selectedPeriod === 'all'
                  ? 'bg-brown-dark text-white shadow-lg'
                  : 'bg-pink-light/30 text-brown-dark hover:bg-pink-light/50'
              }`}
            >
              All Time
            </button>
          </div>
          
          {selectedPeriod !== 'all' && (
            <div className="mt-4 text-sm text-brown-dark">
              <span className="font-semibold">Showing: </span>
              <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/70 text-brown-dark font-semibold shadow-sm">
                {selectedPeriod === 'day' && `Today (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`}
                {selectedPeriod === 'week' && 'This Week'}
                {selectedPeriod === 'month' && new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                {selectedPeriod === 'year' && new Date().getFullYear()}
              </span>
            </div>
          )}
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-display text-brown-dark mb-6">Expenses Management</h1>
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
            <p className="text-sm text-gray-600 mb-2">
              Total Expenses 
              {selectedPeriod !== 'all' && (
                <span className="ml-2 text-xs px-2 py-1 rounded bg-brown-dark !text-white font-semibold shadow-sm">
                  {selectedPeriod === 'day' && 'Today'}
                  {selectedPeriod === 'week' && 'This Week'}
                  {selectedPeriod === 'month' && 'This Month'}
                  {selectedPeriod === 'year' && 'This Year'}
                </span>
              )}
            </p>
            <p className="text-4xl font-bold text-red-700">{formatCurrency(totalExpenses)}</p>
            <p className="text-xs text-gray-500 mt-2">{filteredExpenses.length} expense(s)</p>
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
                  {availableCategories.map((cat) => (
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

              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-semibold text-brown-dark mb-2">
                  Payment Method *
                </label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  required
                  value={formData.paymentMethod}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                >
                  <option value="">Select payment method</option>
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="vendor" className="block text-sm font-semibold text-brown-dark mb-2">
                  Vendor/Supplier *
                </label>
                <input
                  type="text"
                  id="vendor"
                  name="vendor"
                  required
                  value={formData.vendor}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  placeholder="e.g., ABC Supplies, John Doe"
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-semibold text-brown-dark mb-2">
                  Status *
                </label>
                <select
                  id="status"
                  name="status"
                  required
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                >
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Reimbursed">Reimbursed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Receipt/Proof (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return

                    setReceiptFile(file)
                    setUploadingReceipt(true)

                    const formData = new FormData()
                    formData.append('receipt', file)

                    try {
                      const response = await fetch('/api/admin/expenses/upload-receipt', {
                        method: 'POST',
                        body: formData,
                      })
                      const data = await response.json()
                      
                      if (response.ok && data.receiptUrl) {
                        setFormData(prev => ({ ...prev, receiptUrl: data.receiptUrl }))
                        setMessage({ type: 'success', text: 'Receipt uploaded!' })
                      } else {
                        setMessage({ type: 'error', text: data.error || 'Failed to upload receipt' })
                      }
                    } catch (error) {
                      console.error('Error uploading receipt:', error)
                      setMessage({ type: 'error', text: 'Error uploading receipt' })
                    } finally {
                      setUploadingReceipt(false)
                    }
                  }}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload receipt image or PDF (Max 5MB)
                </p>
                {uploadingReceipt && <p className="text-xs text-brown-dark mt-1">Uploading...</p>}
              </div>

              <div className="md:col-span-2 bg-pink-light/20 p-4 rounded-lg border border-brown-light">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={formData.isRecurring}
                    onChange={(e) => {
                      setFormData({ ...formData, isRecurring: e.target.checked })
                      setHasUnsavedChanges(true)
                    }}
                    className="w-5 h-5 text-brown-dark focus:ring-brown-dark border-brown-light rounded"
                  />
                  <label htmlFor="isRecurring" className="text-sm font-semibold text-brown-dark">
                    This is a recurring expense
                  </label>
                </div>

                {formData.isRecurring && (
                  <div>
                    <label htmlFor="recurringFrequency" className="block text-sm font-semibold text-brown-dark mb-2">
                      Frequency
                    </label>
                    <select
                      id="recurringFrequency"
                      name="recurringFrequency"
                      value={formData.recurringFrequency}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                    >
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>
                )}
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
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-display text-brown-dark">All Expenses ({filteredExpenses.length})</h2>
            <div className="flex gap-3">
              <button
                onClick={exportToCSV}
                disabled={filteredExpenses.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>📊</span> Export to CSV
              </button>
              <button
                onClick={() => setShowBudgetModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2"
              >
                <span>💰</span> Set Budgets
              </button>
            </div>
          </div>

          {/* Budget Alerts */}
          {budgetAlerts.length > 0 && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
              <p className="font-semibold text-red-800 mb-2">⚠️ Budget Alerts</p>
              {budgetAlerts.map(([category, total]) => (
                <p key={category} className="text-sm text-red-700">
                  <strong>{category}:</strong> {formatCurrency(total)} / {formatCurrency(budgets[category])} 
                  <span className="text-red-600 font-semibold"> (Over budget!)</span>
                </p>
              ))}
            </div>
          )}

          {/* Search and Filters */}
          <div className="mb-6 p-4 bg-pink-light/20 rounded-lg border border-brown-light">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-brown-dark mb-2">
                  Search
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search description, vendor..."
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brown-dark mb-2">
                  Filter by Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark"
                >
                  <option value="">All Categories</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brown-dark mb-2">
                  Filter by Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark"
                >
                  <option value="">All Statuses</option>
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Reimbursed">Reimbursed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brown-dark mb-2">
                  Filter by Payment
                </label>
                <select
                  value={filterPaymentMethod}
                  onChange={(e) => setFilterPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark"
                >
                  <option value="">All Methods</option>
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(searchTerm || filterCategory || filterStatus || filterPaymentMethod) && (
              <div className="mt-3">
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setFilterCategory('')
                    setFilterStatus('')
                    setFilterPaymentMethod('')
                  }}
                  className="text-sm text-brown hover:text-brown-dark font-semibold"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>

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

          {filteredExpenses.length === 0 ? (
            <div className="text-center text-brown py-8">
              {expenses.length === 0 
                ? 'No expenses recorded yet. Add your first expense above.'
                : 'No expenses match your filters. Try different search criteria.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-brown-light">
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Date</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Category</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Description</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Vendor</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Amount</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Payment</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Status</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Receipt</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((expense) => (
                      <tr key={expense.id} className="border-b border-brown-light/30 hover:bg-pink-light/20">
                        <td className="py-3 px-4 text-brown text-sm">
                          {formatDate(expense.date)}
                          {expense.isRecurring && (
                            <div className="text-xs text-purple-600 font-semibold mt-1">
                              🔄 {expense.recurringFrequency}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-brown">
                          <span className="inline-block px-3 py-1 bg-pink-light text-brown-dark rounded-full text-sm font-semibold">
                            {expense.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-brown text-sm">{expense.description}</td>
                        <td className="py-3 px-4 text-brown text-sm">{expense.vendor || 'N/A'}</td>
                        <td className="py-3 px-4 text-red-700 font-semibold">{formatCurrency(expense.amount)}</td>
                        <td className="py-3 px-4 text-sm text-black">
                          <span className="inline-block px-2 py-1 rounded text-xs font-semibold" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-on-secondary)' }}>
                            {expense.paymentMethod || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-black">
                          <span
                            className="inline-block px-2 py-1 rounded text-xs font-semibold"
                            style={{
                              backgroundColor:
                                expense.status === 'Paid'
                                  ? 'color-mix(in srgb, var(--color-primary) 75%, white 25%)'
                                  : expense.status === 'Pending'
                                  ? 'color-mix(in srgb, var(--color-secondary) 70%, white 30%)'
                                  : 'color-mix(in srgb, var(--color-accent) 70%, white 30%)',
                              color:
                                expense.status === 'Paid'
                                  ? 'var(--color-on-primary)'
                                  : expense.status === 'Pending'
                                  ? 'var(--color-text)'
                                  : 'var(--color-on-secondary)',
                            }}
                          >
                            {expense.status || 'Paid'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {expense.receiptUrl ? (
                            <a
                              href={expense.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 font-semibold"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-gray-400">No receipt</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(expense)}
                              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => requestDelete(expense)}
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

        {/* Archived Expenses */}
        <div className="bg-white rounded-lg shadow-lg p-8 mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-display text-brown-dark">Archived Expenses</h2>
              <p className="text-sm text-brown-dark/70">
                A read-only log of every deleted expense, including who removed it and when.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowArchived((prev) => !prev)}
              className="px-4 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors font-semibold"
            >
              {showArchived ? 'Hide Archive' : `View Archive (${archivedExpenses.length})`}
            </button>
          </div>

          {showArchived && (
            archivedExpenses.length === 0 ? (
              <div className="mt-6 text-center text-brown py-6">
                No archived expenses yet. Deleted expenses will appear here with full detail.
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-brown-light text-left">
                      <th className="py-3 px-4 text-brown-dark font-semibold">Deleted On</th>
                      <th className="py-3 px-4 text-brown-dark font-semibold">Category</th>
                      <th className="py-3 px-4 text-brown-dark font-semibold">Description</th>
                      <th className="py-3 px-4 text-brown-dark font-semibold">Amount</th>
                      <th className="py-3 px-4 text-brown-dark font-semibold">Deleted By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedExpenses.map((expense) => (
                      <tr key={expense.id} className="border-b border-brown-light/40 hover:bg-pink-light/20 transition-colors">
                        <td className="py-3 px-4 text-brown-dark">
                          {expense.deletedAt
                            ? new Date(expense.deletedAt).toLocaleString()
                            : '-'}
                        </td>
                        <td className="py-3 px-4 text-brown-dark font-medium">{expense.category}</td>
                        <td className="py-3 px-4 text-brown-dark/80">{expense.description}</td>
                        <td className="py-3 px-4 text-brown-dark font-semibold">
                          {expense.amount.toLocaleString(undefined, { style: 'currency', currency: 'KES' })}
                        </td>
                        <td className="py-3 px-4 text-brown-dark/70">{expense.deletedBy || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
            <h2 className="text-2xl font-display text-brown-dark mb-4">Confirm Deletion</h2>
            <p className="text-sm text-brown-dark/80 mb-6">
              You are about to delete <span className="font-semibold text-brown-dark">{deleteTarget.description || deleteTarget.category}</span>.
              This action cannot be undone. Are you sure you want to continue?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => !deleting && setDeleteTarget(null)}
                className="px-4 py-2 bg-white border-2 border-brown-light text-brown-dark rounded-lg hover:bg-brown-light/40 transition-colors font-semibold shadow-sm"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-gradient-to-r from-red-500 via-rose-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:via-rose-600 hover:to-red-700 transition-all font-semibold shadow-md flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <span className="animate-pulse">Deleting…</span>
                  </>
                ) : (
                  <>
                    <span>🗑️</span>
                    <span className="font-bold tracking-wide">Delete Expense</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onSave={handleSaveAndLeave}
        onLeave={handleLeaveWithoutSaving}
        onCancel={handleCancelDialog}
        saving={saving}
      />

      {/* Budget Management Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-8 max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-display text-brown-dark mb-6">Set Category Budgets</h2>
            <p className="text-sm text-brown mb-6">
              Set monthly budget limits for each expense category. You'll receive alerts when spending exceeds these limits.
            </p>

            <div className="space-y-4 mb-6">
              {EXPENSE_CATEGORIES.map((category) => (
                <div key={category} className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-brown-dark mb-1">
                      {category}
                    </label>
                  </div>
                  <div className="w-48">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={budgets[category] || 0}
                      onChange={(e) => setBudgets({ ...budgets, [category]: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark"
                      placeholder="0"
                    />
                  </div>
                  <span className="text-sm text-brown-dark font-medium">KSH</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBudgetModal(false)}
                className="flex-1 px-4 py-2 text-brown-dark border-2 border-brown-light rounded-lg hover:bg-brown-light/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/admin/expenses/budgets', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ budgets }),
                    })
                    
                    if (response.ok) {
                      setMessage({ type: 'success', text: 'Budgets saved successfully!' })
                      setShowBudgetModal(false)
                    } else {
                      setMessage({ type: 'error', text: 'Failed to save budgets' })
                    }
                  } catch (error) {
                    console.error('Error saving budgets:', error)
                    setMessage({ type: 'error', text: 'An error occurred' })
                  }
                }}
                className="flex-1 px-4 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors font-semibold"
              >
                Save Budgets
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

