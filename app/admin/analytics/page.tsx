'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCurrency } from '@/contexts/CurrencyContext'
import { convertCurrency, DEFAULT_EXCHANGE_RATE_USD } from '@/lib/currency-utils'

interface Booking {
  id: string
  name: string
  service: string
  date: string
  timeSlot?: string
  finalPrice: number
  deposit: number
  createdAt: string
  status?: 'confirmed' | 'cancelled' | 'completed' | 'paid'
  paymentStatus?: string
  paidInFullAt?: string | null
  payments?: Array<{
    amount: number
    method: 'cash' | 'card' | 'mpesa'
    date: string
  }>
}

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  date: string
  createdAt: string
}

interface DailyStats {
  date: string
  servicesCount: number
  totalRevenue: number
  deposits: number
  balance: number
  expenses: number
  taxes: number
  savings: number
  profit: number
}

interface WeeklyStats {
  week: string
  servicesCount: number
  totalRevenue: number
  deposits: number
  balance: number
  expenses: number
  taxes: number
  savings: number
  profit: number
}

interface MonthlyStats {
  month: string
  servicesCount: number
  totalRevenue: number
  deposits: number
  balance: number
  expenses: number
  taxes: number
  savings: number
  profit: number
}

interface YearlyStats {
  year: string
  servicesCount: number
  totalRevenue: number
  deposits: number
  balance: number
  expenses: number
  taxes: number
  savings: number
  profit: number
}

export default function AdminAnalytics() {
  const { currency, formatCurrency: formatCurrencyContext } = useCurrency()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [taxPercentage, setTaxPercentage] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [pinVerified, setPinVerified] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [verifyingPin, setVerifyingPin] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year'>('day')
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
  const router = useRouter()

  useEffect(() => {
    const alreadyVerified = typeof window !== 'undefined' && window.sessionStorage.getItem('analytics-pin-verified') === 'true'
    if (alreadyVerified) {
      setPinVerified(true)
    }

    fetch('/api/admin/current-user', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push('/admin/login')
        } else {
          setHasAccess(true)
        }
        setLoading(false)
      })
      .catch(() => {
        setHasAccess(false)
        setLoading(false)
        router.push('/admin/login')
      })
  }, [router])

  useEffect(() => {
    if (hasAccess && pinVerified) {
      setLoading(true)
      loadData()
    }
  }, [hasAccess, pinVerified])

  const loadData = async () => {
    try {
      const [bookingsRes, expensesRes, settingsRes] = await Promise.all([
        fetch('/api/admin/bookings', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/admin/expenses', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/admin/settings', { credentials: 'include', cache: 'no-store' }),
      ])

      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json()
        setBookings(bookingsData.bookings || [])
      }

      if (expensesRes.ok) {
        const expensesData = await expensesRes.json()
        setExpenses(expensesData.expenses || [])
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        setTaxPercentage(settingsData.business?.taxPercentage || 0)
      } else {
        // If settings fail to load, default to 0 and log error
        console.warn('Failed to load tax percentage from settings, defaulting to 0')
        setTaxPercentage(0)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyPin = async (event: React.FormEvent) => {
    event.preventDefault()
    setPinError('')
    setVerifyingPin(true)

    try {
      const response = await fetch('/api/admin/analytics/verify-pin', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setPinError(data.error || 'Incorrect PIN')
        return
      }

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('analytics-pin-verified', 'true')
      }
      setPinVerified(true)
    } catch (error) {
      setPinError('Unable to verify PIN. Please try again.')
    } finally {
      setVerifyingPin(false)
    }
  }

  const filterBookingsByDateRange = (bookings: Booking[]) => {
    const start = new Date(dateRange.start)
    const end = new Date(dateRange.end)
    end.setHours(23, 59, 59, 999) // Include the entire end date

    return bookings.filter(booking => {
      const bookingDate = new Date(booking.date)
      return bookingDate >= start && bookingDate <= end
    })
  }

  const filterExpensesByDateRange = (expenses: Expense[]) => {
    const start = new Date(dateRange.start)
    const end = new Date(dateRange.end)
    end.setHours(23, 59, 59, 999) // Include the entire end date

    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date)
      return expenseDate >= start && expenseDate <= end
    })
  }

  const getCollectedAmount = (booking: Booking) => {
    if (booking.status === 'cancelled') return 0
    const finalPrice = Number(booking.finalPrice || 0)
    const deposit = Number(booking.deposit || 0)
    const paymentsTotal = Array.isArray(booking.payments)
      ? booking.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
      : 0
    const collected = Math.max(deposit, paymentsTotal)
    return finalPrice > 0 ? Math.min(collected, finalPrice) : collected
  }

  const calculateDailyStats = (): DailyStats[] => {
    const filteredBookings = filterBookingsByDateRange(bookings)
    const filteredExpenses = filterExpensesByDateRange(expenses)
    const dailyMap = new Map<string, DailyStats>()

    filteredBookings.forEach(booking => {
      const dateKey = booking.date.split('T')[0]
      const existing = dailyMap.get(dateKey) || {
        date: dateKey,
        servicesCount: 0,
        totalRevenue: 0,
        deposits: 0,
        balance: 0,
        expenses: 0,
        taxes: 0,
        savings: 0,
        profit: 0,
      }

      existing.servicesCount += 1
      existing.totalRevenue += getCollectedAmount(booking)
      existing.deposits += booking.deposit
      existing.balance += Math.max((booking.finalPrice || 0) - getCollectedAmount(booking), 0)

      dailyMap.set(dateKey, existing)
    })

    filteredExpenses.forEach(expense => {
      const dateKey = expense.date.split('T')[0]
      const existing = dailyMap.get(dateKey) || {
        date: dateKey,
        servicesCount: 0,
        totalRevenue: 0,
        deposits: 0,
        balance: 0,
        expenses: 0,
        taxes: 0,
        savings: 0,
        profit: 0,
      }

      existing.expenses += expense.amount
      dailyMap.set(dateKey, existing)
    })

    // Calculate profit, taxes, and savings for all entries
    dailyMap.forEach((stat) => {
      stat.profit = stat.totalRevenue - stat.expenses
      stat.taxes = stat.profit > 0 ? stat.profit * (taxPercentage / 100) : 0
      stat.savings = stat.profit - stat.taxes
    })

    return Array.from(dailyMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const calculateWeeklyStats = (): WeeklyStats[] => {
    const filteredBookings = filterBookingsByDateRange(bookings)
    const filteredExpenses = filterExpensesByDateRange(expenses)
    const weeklyMap = new Map<string, WeeklyStats>()

    filteredBookings.forEach(booking => {
      const date = new Date(booking.date)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0]
      const weekLabel = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

      const existing = weeklyMap.get(weekKey) || {
        week: weekLabel,
        servicesCount: 0,
        totalRevenue: 0,
        deposits: 0,
        balance: 0,
        expenses: 0,
        taxes: 0,
        savings: 0,
        profit: 0,
      }

      existing.servicesCount += 1
      existing.totalRevenue += getCollectedAmount(booking)
      existing.deposits += booking.deposit
      existing.balance += Math.max((booking.finalPrice || 0) - getCollectedAmount(booking), 0)

      weeklyMap.set(weekKey, existing)
    })

    filteredExpenses.forEach(expense => {
      const date = new Date(expense.date)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const weekKey = weekStart.toISOString().split('T')[0]
      const weekLabel = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

      const existing = weeklyMap.get(weekKey) || {
        week: weekLabel,
        servicesCount: 0,
        totalRevenue: 0,
        deposits: 0,
        balance: 0,
        expenses: 0,
        taxes: 0,
        savings: 0,
        profit: 0,
      }

      existing.expenses += expense.amount
      weeklyMap.set(weekKey, existing)
    })

    // Calculate profit, taxes, and savings for all entries
    weeklyMap.forEach((stat) => {
      stat.profit = stat.totalRevenue - stat.expenses
      stat.taxes = stat.profit > 0 ? stat.profit * (taxPercentage / 100) : 0
      stat.savings = stat.profit - stat.taxes
    })

    return Array.from(weeklyMap.values())
      .sort((a, b) => {
        const dateA = a.week.match(/\d+/)?.[0] ? new Date(a.week) : new Date(0)
        const dateB = b.week.match(/\d+/)?.[0] ? new Date(b.week) : new Date(0)
        return dateB.getTime() - dateA.getTime()
      })
  }

  const calculateMonthlyStats = (): MonthlyStats[] => {
    const filteredBookings = filterBookingsByDateRange(bookings)
    const filteredExpenses = filterExpensesByDateRange(expenses)
    const monthlyMap = new Map<string, MonthlyStats>()

    filteredBookings.forEach(booking => {
      const date = new Date(booking.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

      const existing = monthlyMap.get(monthKey) || {
        month: monthLabel,
        servicesCount: 0,
        totalRevenue: 0,
        deposits: 0,
        balance: 0,
        expenses: 0,
        taxes: 0,
        savings: 0,
        profit: 0,
      }

      existing.servicesCount += 1
      existing.totalRevenue += getCollectedAmount(booking)
      existing.deposits += booking.deposit
      existing.balance += Math.max((booking.finalPrice || 0) - getCollectedAmount(booking), 0)

      monthlyMap.set(monthKey, existing)
    })

    filteredExpenses.forEach(expense => {
      const date = new Date(expense.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

      const existing = monthlyMap.get(monthKey) || {
        month: monthLabel,
        servicesCount: 0,
        totalRevenue: 0,
        deposits: 0,
        balance: 0,
        expenses: 0,
        taxes: 0,
        savings: 0,
        profit: 0,
      }

      existing.expenses += expense.amount
      monthlyMap.set(monthKey, existing)
    })

    // Calculate profit, taxes, and savings for all entries
    monthlyMap.forEach((stat) => {
      stat.profit = stat.totalRevenue - stat.expenses
      stat.taxes = stat.profit > 0 ? stat.profit * (taxPercentage / 100) : 0
      stat.savings = stat.profit - stat.taxes
    })

    return Array.from(monthlyMap.values())
      .sort((a, b) => {
        const dateA = new Date(a.month)
        const dateB = new Date(b.month)
        return dateB.getTime() - dateA.getTime()
      })
  }

  const calculateYearlyStats = (): YearlyStats[] => {
    const filteredBookings = filterBookingsByDateRange(bookings)
    const filteredExpenses = filterExpensesByDateRange(expenses)
    const yearlyMap = new Map<string, YearlyStats>()

    filteredBookings.forEach(booking => {
      const date = new Date(booking.date)
      const year = date.getFullYear().toString()

      const existing = yearlyMap.get(year) || {
        year: year,
        servicesCount: 0,
        totalRevenue: 0,
        deposits: 0,
        balance: 0,
        expenses: 0,
        taxes: 0,
        savings: 0,
        profit: 0,
      }

      existing.servicesCount += 1
      existing.totalRevenue += getCollectedAmount(booking)
      existing.deposits += booking.deposit
      existing.balance += Math.max((booking.finalPrice || 0) - getCollectedAmount(booking), 0)

      yearlyMap.set(year, existing)
    })

    filteredExpenses.forEach(expense => {
      const date = new Date(expense.date)
      const year = date.getFullYear().toString()

      const existing = yearlyMap.get(year) || {
        year: year,
        servicesCount: 0,
        totalRevenue: 0,
        deposits: 0,
        balance: 0,
        expenses: 0,
        taxes: 0,
        savings: 0,
        profit: 0,
      }

      existing.expenses += expense.amount
      yearlyMap.set(year, existing)
    })

    // Calculate profit, taxes, and savings for all entries
    yearlyMap.forEach((stat) => {
      stat.profit = stat.totalRevenue - stat.expenses
      stat.taxes = stat.profit > 0 ? stat.profit * (taxPercentage / 100) : 0
      stat.savings = stat.profit - stat.taxes
    })

    return Array.from(yearlyMap.values())
      .sort((a, b) => parseInt(b.year) - parseInt(a.year))
  }

  const getTotalStats = () => {
    const filteredBookings = filterBookingsByDateRange(bookings)
    const filteredExpenses = filterExpensesByDateRange(expenses)
    
    const totals = filteredBookings.reduce((acc, booking) => {
      const collectedAmount = getCollectedAmount(booking)
      acc.servicesCount += 1
      acc.totalRevenue += collectedAmount
      acc.deposits += booking.deposit
      acc.balance += Math.max((booking.finalPrice || 0) - collectedAmount, 0)
      return acc
    }, {
      servicesCount: 0,
      totalRevenue: 0,
      deposits: 0,
      balance: 0,
      expenses: 0,
      taxes: 0,
      savings: 0,
      profit: 0,
    })

    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    totals.expenses = totalExpenses
    totals.profit = totals.totalRevenue - totals.expenses
    totals.taxes = totals.profit > 0 ? totals.profit * (taxPercentage / 100) : 0
    totals.savings = totals.profit - totals.taxes

    return totals
  }

  // Helper function to convert analytics amount to selected currency
  // Note: Analytics data is stored in KES, so we convert if USD is selected
  const convertAnalyticsAmount = (amount: number): number => {
    if (currency === 'USD') {
      return convertCurrency(amount, 'KES', 'USD', { usdToKes: DEFAULT_EXCHANGE_RATE_USD })
    }
    return amount
  }
  
  const formatCurrency = (amount: number) => {
    return formatCurrencyContext(convertAnalyticsAmount(amount))
  }

const formatPeriodLabel = (stat: DailyStats | WeeklyStats | MonthlyStats | YearlyStats) => {
  if ('date' in stat) {
    return new Date(stat.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if ('week' in stat) {
    return stat.week
  }

  if ('year' in stat) {
    return stat.year
  }

  return stat.month
}

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  if (hasAccess && !pinVerified) {
    return (
      <div className="min-h-screen bg-baby-pink-light py-8 px-4">
        <div className="max-w-md mx-auto">
          <div className="mb-6">
            <Link 
              href="/admin/dashboard" 
              className="text-brown hover:text-brown-dark"
            >
              ← Back to Dashboard
            </Link>
          </div>
          <form onSubmit={handleVerifyPin} className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-5xl mb-4 text-center">🔒</div>
            <h1 className="text-3xl font-display text-brown-dark mb-3 text-center">Analytics PIN</h1>
            <p className="text-brown-dark/80 mb-6 text-center">
              Enter the analytics PIN to view revenue, expenses, profit, and reports.
            </p>
            <label htmlFor="analyticsPin" className="block text-sm font-semibold text-brown-dark mb-2">
              PIN
            </label>
            <input
              id="analyticsPin"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
              placeholder="Enter PIN"
              autoFocus
            />
            {pinError && (
              <p className="mt-3 text-sm text-red-600">{pinError}</p>
            )}
            <button
              type="submit"
              disabled={verifyingPin || !pin.trim()}
              className="mt-6 w-full bg-brown-dark hover:bg-brown text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              {verifyingPin ? 'Checking...' : 'View Analytics'}
            </button>
            <p className="mt-4 text-xs text-brown-dark/60 text-center">
              Set the PIN with the ANALYTICS_PIN environment variable. Default is 1234 if none is configured.
            </p>
          </form>
        </div>
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
              Please log in to access analytics.
            </p>
            <p className="text-sm text-gray-600">
              Analytics is available to authenticated admins with the analytics PIN.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const dailyStats = calculateDailyStats()
  const weeklyStats = calculateWeeklyStats()
  const monthlyStats = calculateMonthlyStats()
  const yearlyStats = calculateYearlyStats()
  const totalStats = getTotalStats()

  const currentStats = selectedPeriod === 'day' ? dailyStats : selectedPeriod === 'week' ? weeklyStats : selectedPeriod === 'month' ? monthlyStats : yearlyStats

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <Link 
            href="/admin/dashboard" 
            className="text-brown hover:text-brown-dark"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-display text-brown-dark mb-8">Analytics & Reports</h1>

          {/* Date Range Selector */}
          <div className="mb-4 sm:mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-semibold text-brown-dark mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brown-dark mb-2">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
              />
            </div>
          </div>

          {/* Period Selector */}
          <div className="mb-6">
            <div className="flex gap-4">
              <button
                onClick={() => setSelectedPeriod('day')}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  selectedPeriod === 'day'
                    ? 'bg-brown-dark text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setSelectedPeriod('week')}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  selectedPeriod === 'week'
                    ? 'bg-brown-dark text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setSelectedPeriod('month')}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  selectedPeriod === 'month'
                    ? 'bg-brown-dark text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setSelectedPeriod('year')}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  selectedPeriod === 'year'
                    ? 'bg-brown-dark text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="bg-pink-light/30 rounded-lg p-6 border-2 border-brown-light">
              <p className="text-sm text-gray-600 mb-2">Total Services</p>
              <p className="text-3xl font-bold text-brown-dark">{totalStats.servicesCount}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-6 border-2 border-green-200">
              <p className="text-sm text-gray-600 mb-2">Total Revenue</p>
              <p className="text-3xl font-bold text-green-700">{formatCurrency(totalStats.totalRevenue)}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-6 border-2 border-red-200">
              <p className="text-sm text-gray-600 mb-2">Total Expenses</p>
              <p className="text-3xl font-bold text-red-700">{formatCurrency(totalStats.expenses)}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-6 border-2 border-purple-200">
              <p className="text-sm text-gray-600 mb-2">Total Taxes</p>
              <p className="text-3xl font-bold text-purple-700">{formatCurrency(totalStats.taxes)}</p>
            </div>
            <div className={`rounded-lg p-6 border-2 ${totalStats.profit >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
              <p className="text-sm text-gray-600 mb-2">Net Profit</p>
              <p className={`text-3xl font-bold ${totalStats.profit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                {formatCurrency(totalStats.profit)}
              </p>
            </div>
            <div className={`rounded-lg p-6 border-2 ${totalStats.savings >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'}`}>
              <p className="text-sm text-gray-600 mb-2">Savings</p>
              <p className={`text-3xl font-bold ${totalStats.savings >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
                {formatCurrency(totalStats.savings)}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
              <p className="text-sm text-gray-600 mb-2">Total Deposits</p>
              <p className="text-3xl font-bold text-blue-700">{formatCurrency(totalStats.deposits)}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-6 border-2 border-orange-200">
              <p className="text-sm text-gray-600 mb-2">Outstanding Balance</p>
              <p className="text-3xl font-bold text-orange-700">{formatCurrency(totalStats.balance)}</p>
            </div>
          </div>
        </div>

        {/* Detailed Stats Table */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-display text-brown-dark mb-6">
            {selectedPeriod === 'day' ? 'Daily' : selectedPeriod === 'week' ? 'Weekly' : selectedPeriod === 'month' ? 'Monthly' : 'Yearly'} Breakdown
          </h2>

          {currentStats.length === 0 ? (
            <div className="text-center text-brown py-8">
              No data available for the selected date range.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-brown-light">
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">
                      {selectedPeriod === 'day' ? 'Date' : selectedPeriod === 'week' ? 'Week' : selectedPeriod === 'month' ? 'Month' : 'Year'}
                    </th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Services</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Revenue</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Expenses</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Taxes</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Savings</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Profit</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Deposits</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {currentStats.map((stat, index) => (
                    <tr key={index} className="border-b border-brown-light/30 hover:bg-pink-light/20">
                      <td className="py-3 px-4 text-brown font-medium">
                        {formatPeriodLabel(stat)}
                      </td>
                      <td className="py-3 px-4 text-brown font-semibold">{stat.servicesCount}</td>
                      <td className="py-3 px-4 text-green-700 font-semibold">{formatCurrency(stat.totalRevenue)}</td>
                      <td className="py-3 px-4 text-red-700 font-semibold">{formatCurrency(stat.expenses)}</td>
                      <td className="py-3 px-4 text-purple-700 font-semibold">{formatCurrency(stat.taxes)}</td>
                      <td className={`py-3 px-4 font-semibold ${stat.savings >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
                        {formatCurrency(stat.savings)}
                      </td>
                      <td className={`py-3 px-4 font-semibold ${stat.profit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                        {formatCurrency(stat.profit)}
                      </td>
                      <td className="py-3 px-4 text-blue-700 font-semibold">{formatCurrency(stat.deposits)}</td>
                      <td className="py-3 px-4 text-orange-700 font-semibold">{formatCurrency(stat.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

