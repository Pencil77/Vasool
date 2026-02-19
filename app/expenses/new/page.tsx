'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useAdminContext } from '@/app/components/AdminContext'

interface UserProfile {
  auth_id: string
  username: string
  is_admin: boolean
  is_shadow?: boolean
  guardian_id?: string | null
}

interface Split {
  consumer_id: string
  amount: number
  responsible_id: string | null
}

export default function AddExpensePage() {
  const [description, setDescription] = useState('')
  const [totalAmount, setTotalAmount] = useState<number | ''>('')
  const [payerId, setPayerId] = useState<string | null>(null)
  const [groupMembers, setGroupMembers] = useState<UserProfile[]>([])
  const [splits, setSplits] = useState<Split[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const { isAdmin } = useAdminContext() // Assuming isAdmin is needed for something, though not explicitly in form logic yet.

  useEffect(() => {
    async function fetchGroupMembers() {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }
      setPayerId(user.id)

      const { data: profiles, error } = await supabase.from('profiles').select('*') // Fetch all profiles with all columns

      if (error) {
        console.error('Error fetching group members:', error.message)
        setError('Failed to load group members.')
      } else {
        const currentUserProfile = profiles.find((p) => p.auth_id === user.id)
        if (currentUserProfile) {
          setGroupMembers(profiles) // Set all fetched profiles
          // Initialize splits for the current user (payer) consuming their own share
          setSplits([
            {
              consumer_id: user.id,
              amount: 0,
              responsible_id: user.id,
            },
          ])
        } else {
          setError('Current user profile not found.')
        }
      }
      setLoading(false)
    }
    fetchGroupMembers()
  }, [supabase, router])

  const handleMemberSelection = (memberId: string, isSelected: boolean) => {
    setSplits((prevSplits) => {
      if (isSelected) {
        const member = groupMembers.find((m) => m.auth_id === memberId)
        if (member && !prevSplits.some((s) => s.consumer_id === memberId)) {
          const newSplit: Split = {
            consumer_id: member.auth_id,
            amount: 0,
            responsible_id: member.is_shadow
              ? member.guardian_id || payerId
              : member.auth_id,
          }
          return [...prevSplits, newSplit]
        }
      } else {
        return prevSplits.filter((split) => split.consumer_id !== memberId)
      }
      return prevSplits
    })
  }

  const distributeAmount = () => {
    setSplits((prevSplits) => {
      const activeSplits = prevSplits.filter((s) =>
        groupMembers.some((gm) => gm.auth_id === s.consumer_id),
      )
      if (activeSplits.length > 0 && totalAmount && totalAmount > 0) {
        const amountPerPerson = Number(totalAmount) / activeSplits.length
        return prevSplits.map((split) => {
          if (
            groupMembers.some((gm) => gm.auth_id === split.consumer_id) &&
            split.amount !== parseFloat(amountPerPerson.toFixed(2))
          ) {
            return { ...split, amount: parseFloat(amountPerPerson.toFixed(2)) }
          }
          return split
        })
      } else if (activeSplits.length === 0 && prevSplits.length > 0) {
        // If no members selected but there are splits, zero them out
        return prevSplits.map((split) => ({ ...split, amount: 0 }))
      }
      return prevSplits
    })
  }
  }

  useEffect(() => {
    distributeAmount()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmount, splits.length]) // Only re-distribute if totalAmount or number of splits changes

  const handleResponsiblePartyChange = (
    consumerId: string,
    responsibleId: string,
  ) => {
    setSplits((prevSplits) =>
      prevSplits.map((split) =>
        split.consumer_id === consumerId
          ? { ...split, responsible_id: responsibleId }
          : split,
      ),
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!description || !totalAmount || !payerId || splits.length === 0) {
      setError('Please fill all required fields and select at least one member.')
      setLoading(false)
      return
    }

    const { data: expenseData, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        description,
        total_amount: Number(totalAmount),
        payer_id: payerId,
        status: 'PENDING',
      })
      .select()
      .single()

    if (expenseError) {
      console.error('Error creating expense:', expenseError.message)
      setError('Failed to create expense.')
      setLoading(false)
      return
    }

    const expenseId = expenseData.id

    const splitsToInsert = splits.map((split) => ({
      expense_id: expenseId,
      consumer_id: split.consumer_id,
      amount: split.amount,
      responsible_id: split.responsible_id,
      status: 'PENDING',
    }))

    const { error: splitsError } = await supabase
      .from('splits')
      .insert(splitsToInsert)

    if (splitsError) {
      console.error('Error creating splits:', splitsError.message)
      setError('Failed to create splits.')
      // Optionally, roll back expense creation here
      setLoading(false)
      return
    }

    setLoading(false)
    router.push('/dashboard') // Redirect to dashboard after successful creation
  }

  if (loading) return <div className="text-center mt-8">Loading members...</div>
  if (error) return <div className="text-center mt-8 text-red-500">{error}</div>

  const realUsers = groupMembers.filter((member) => !member.is_shadow)

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Add New Expense</h1>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl space-y-6"
      >
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>

        <div>
          <label
            htmlFor="totalAmount"
            className="block text-sm font-medium text-gray-700"
          >
            Total Amount
          </label>
          <input
            type="number"
            id="totalAmount"
            value={totalAmount}
            onChange={(e) => setTotalAmount(parseFloat(e.target.value))}
            required
            min="0.01"
            step="0.01"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Who is consuming this expense?
          </label>
          <div className="grid grid-cols-2 gap-4">
            {groupMembers.map((member) => (
              <div key={member.auth_id} className="flex items-center">
                <input
                  type="checkbox"
                  id={`member-${member.auth_id}`}
                  checked={splits.some((s) => s.consumer_id === member.auth_id)}
                  onChange={(e) =>
                    handleMemberSelection(member.auth_id, e.target.checked)
                  }
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
                <label
                  htmlFor={`member-${member.auth_id}`}
                  className="ml-2 text-sm text-gray-900"
                >
                  {member.username} {member.auth_id === payerId && '(Me)'}
                </label>
              </div>
            ))}
          </div>
        </div>

        {splits.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Split Breakdown</h3>
            {splits.map((split) => {
              const consumer = groupMembers.find(
                (m) => m.auth_id === split.consumer_id,
              )
              if (!consumer) return null

              return (
                <div
                  key={split.consumer_id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-50 p-3 rounded-md"
                >
                  <div className="flex-grow">
                    <p className="font-medium text-gray-800">
                      {consumer.username} owes:{' '}
                      <span className="font-bold">${split.amount.toFixed(2)}</span>
                    </p>
                    {consumer.is_shadow && (
                      <div className="mt-2 sm:mt-0">
                        <label
                          htmlFor={`responsible-${consumer.auth_id}`}
                          className="block text-xs font-medium text-gray-600"
                        >
                          Responsible Party:
                        </label>
                        <select
                          id={`responsible-${consumer.auth_id}`}
                          value={split.responsible_id || ''}
                          onChange={(e) =>
                            handleResponsiblePartyChange(
                              consumer.auth_id,
                              e.target.value,
                            )
                          }
                          className="mt-1 block w-full sm:w-auto border border-gray-300 rounded-md shadow-sm p-1 text-sm"
                        >
                          {realUsers.map((rUser) => (
                            <option key={rUser.auth_id} value={rUser.auth_id}>
                              {rUser.username}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white p-3 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Adding Expense...' : 'Add Expense'}
        </button>
      </form>
    </div>
  )
}
