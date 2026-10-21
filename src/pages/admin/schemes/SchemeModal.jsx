import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const schemeSchema = z.object({
  name: z.string().min(1, 'Scheme name is required'),
  description: z.string().optional(),
  scheme_type: z.enum(['buy_get_free', 'percentage_discount', 'flat_discount', 'custom']),
  qualifying_product_id: z.string().min(1, 'Qualifying product is required'),
  minimum_quantity: z.number().min(1, 'Minimum quantity must be at least 1'),
  free_product_id: z.string().min(1, 'Free product is required'),
  free_quantity: z.number().min(1, 'Free quantity must be at least 1'),
  unit_of_measure: z.string().min(1, 'Unit of measure is required'),
  amount: z.number().min(0, 'Amount must be a positive number').optional(),
  is_repeatable: z.boolean().default(true),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  is_active: z.boolean().default(true),
  applicable_to_all_customers: z.boolean().default(true),
  customer_type_filter: z.enum(['individual', 'retailer', 'wholesaler', 'distributor']).optional(),
  applicable_sale_types: z.array(z.enum(['retail', 'wholesale', 'distributor'])).default(['retail', 'wholesale', 'distributor'])
}).refine((data) => {
  const startDate = new Date(data.start_date)
  const endDate = new Date(data.end_date)
  return startDate <= endDate
}, {
  message: 'End date must be after or equal to start date',
  path: ['end_date']
})

const SchemeModal = ({ scheme, medicines, onSave, onClose }) => {
  const isEditing = !!scheme
  const [saleTypes, setSaleTypes] = useState(['retail', 'wholesale', 'distributor'])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue
  } = useForm({
    resolver: zodResolver(schemeSchema),
    defaultValues: scheme ? {
      ...scheme,
      start_date: scheme.start_date,
      end_date: scheme.end_date,
      applicable_sale_types: scheme.applicable_sale_types || ['retail', 'wholesale', 'distributor']
    } : {
      scheme_type: 'buy_get_free',
      is_repeatable: true,
      is_active: true,
      applicable_to_all_customers: true,
      applicable_sale_types: ['retail', 'wholesale', 'distributor'],
      unit_of_measure: 'units',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  })

  const schemeType = watch('scheme_type')
  const applicableToAll = watch('applicable_to_all_customers')
  const qualifyingProductId = watch('qualifying_product_id')

  const onSubmit = async (data) => {
    try {
      const payload = {
        name: data.name,
        description: data.description || null,
        scheme_type: data.scheme_type,
        qualifying_product_id: data.qualifying_product_id,
        minimum_quantity: parseInt(data.minimum_quantity),
        free_product_id: data.free_product_id,
        free_quantity: parseInt(data.free_quantity),
        unit_of_measure: data.unit_of_measure,
        is_repeatable: data.is_repeatable,
        start_date: data.start_date,
        end_date: data.end_date,
        is_active: data.is_active,
        applicable_to_all_customers: data.applicable_to_all_customers,
        customer_type_filter: applicableToAll ? null : data.customer_type_filter,
        applicable_sale_types: data.applicable_sale_types
      }

      await onSave(payload)
    } catch (error) {
      console.error('Error in form submission:', error)
      toast.error('Failed to save scheme')
    }
  }

  const toggleSaleType = (type) => {
    const current = watch('applicable_sale_types') || []
    if (current.includes(type)) {
      setValue('applicable_sale_types', current.filter(t => t !== type))
    } else {
      setValue('applicable_sale_types', [...current, type])
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Scheme' : 'Create New Scheme'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isEditing ? 'Update scheme details' : 'Add a new promotional scheme'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-12">
          {/* Scheme Name */}
          <div className="pb-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Scheme Name *
            </label>
            <input
              {...register('name')}
              type="text"
              placeholder="e.g., Buy 10 Get 2 Free"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="pb-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={2}
              placeholder="Optional description of the scheme"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Scheme Type */}
          <div className="pb-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Scheme Type *
            </label>
            <select
              {...register('scheme_type')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="buy_get_free">Buy X Get Y Free</option>
              <option value="percentage_discount">Percentage Discount</option>
              <option value="flat_discount">Flat Discount</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Qualifying Product */}
          <div className="pb-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Qualifying Product (Buy) *
            </label>
            <select
              {...register('qualifying_product_id')}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base ${
                errors.qualifying_product_id ? 'border-red-300' : 'border-gray-300'
              }`}
              size={1}
            >
              <option value="">-- Select product --</option>
              {medicines.map(med => (
                <option key={med.id} value={med.id}>
                  {med.name}
                </option>
              ))}
            </select>
            {errors.qualifying_product_id && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.qualifying_product_id.message}
              </p>
            )}
          </div>

          {/* Minimum Quantity */}
          <div className="grid grid-cols-2 gap-6 pb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Minimum Quantity to Buy *
              </label>
              <input
                {...register('minimum_quantity', { valueAsNumber: true })}
                type="number"
                min="1"
                placeholder="e.g., 10"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.minimum_quantity ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.minimum_quantity && (
                <p className="mt-1 text-sm text-red-600">{errors.minimum_quantity.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Unit of Measure *
              </label>
              <input
                {...register('unit_of_measure')}
                type="text"
                placeholder="e.g., strips, tablets, packs"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.unit_of_measure ? 'border-red-300' : 'border-gray-300'
                }`}
              />
            </div>
          </div>

          {/* Free Product */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Free Product (Get) *
            </label>
            <select
              {...register('free_product_id')}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base ${
                errors.free_product_id ? 'border-red-300' : 'border-gray-300'
              }`}
              size={1}
            >
              <option value="">-- Select product --</option>
              {medicines.map(med => (
                <option key={med.id} value={med.id}>
                  {med.name}
                  {med.id === qualifyingProductId && ' (Same)'}
                </option>
              ))}
            </select>
            {errors.free_product_id && (
              <p className="mt-1 text-sm text-red-600">{errors.free_product_id.message}</p>
            )}
          </div>

          {/* Free Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Free Quantity *
            </label>
            <input
              {...register('free_quantity', { valueAsNumber: true })}
              type="number"
              min="1"
              placeholder="e.g., 2"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.free_quantity ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.free_quantity && (
              <p className="mt-1 text-sm text-red-600">{errors.free_quantity.message}</p>
            )}
          </div>

          {/* Is Repeatable */}
          <div className="flex items-center gap-3">
            <input
              {...register('is_repeatable')}
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <label className="text-sm font-medium text-gray-700">
              Repeatable Scheme (Buy 20 = Get 4 Free, etc.)
            </label>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                {...register('start_date')}
                type="date"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.start_date ? 'border-red-300' : 'border-gray-300'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <input
                {...register('end_date')}
                type="date"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.end_date ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.end_date && (
                <p className="mt-1 text-sm text-red-600">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          {/* Sale Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Applicable Sale Types
            </label>
            <div className="space-y-2">
              {['retail', 'wholesale', 'distributor'].map(type => (
                <label key={type} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={(watch('applicable_sale_types') || []).includes(type)}
                    onChange={() => toggleSaleType(type)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Customer Eligibility */}
          <div className="border-t border-gray-200 pt-4">
            <label className="flex items-center gap-3">
              <input
                {...register('applicable_to_all_customers')}
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">
                Applicable to All Customers
              </span>
            </label>

            {!applicableToAll && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Type Filter
                </label>
                <select
                  {...register('customer_type_filter')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All customer types</option>
                  <option value="individual">Individual</option>
                  <option value="retailer">Retailer</option>
                  <option value="wholesaler">Wholesaler</option>
                  <option value="distributor">Distributor</option>
                </select>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            <input
              {...register('is_active')}
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <label className="text-sm font-medium text-gray-700">
              Active
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : (isEditing ? 'Update Scheme' : 'Create Scheme')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SchemeModal
