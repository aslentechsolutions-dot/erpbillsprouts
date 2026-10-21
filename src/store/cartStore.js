import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useCartStore = create((set, get) => ({
  items: [],
  customer: null,
  saleType: null, // null initially, 'retail' or 'wholesale' when selected
  paymentMethod: 'cash',
  discount: 0,
  
  // Add item to cart
  addItem: (medicine, batch, quantity, freeQuantity = 0) => {
    const items = get().items
    const existingItemIndex = items.findIndex(
      item => item.medicine.id === medicine.id && item.batch.id === batch.id
    )
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...items]
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: updatedItems[existingItemIndex].quantity + quantity,
        freeQuantity: updatedItems[existingItemIndex].freeQuantity + freeQuantity
      }
      set({ items: updatedItems })
    } else {
      // Add new item
      const saleType = get().saleType
      const newItem = {
        id: `${medicine.id}-${batch.id}`,
        medicine,
        batch,
        quantity,
        freeQuantity,
        price: saleType === 'wholesale' ? batch.wholesale_price : batch.selling_price,
        discount: 0,
        appliedScheme: null // Will be populated by checkAndApplyScheme
      }
      set({ items: [...items, newItem] })
    }
  },

  // Check and apply scheme to an item
  checkAndApplyScheme: async (itemId) => {
    const items = get().items
    const item = items.find(i => i.id === itemId)
    
    if (!item) return

    try {
      const { customer, saleType } = get()
      
      // Call RPC to check applicable scheme
      const { data, error } = await supabase.rpc('get_applicable_scheme', {
        p_customer_id: customer?.id || null,
        p_medicine_id: item.medicine.id,
        p_quantity: item.quantity,
        p_sale_type: saleType
      })

      if (error) throw error

      const schemeResult = data?.[0]
      
      // Update item with scheme information
      const updatedItems = items.map(i => 
        i.id === itemId ? {
          ...i,
          freeQuantity: schemeResult?.free_quantity_result || 0,
          appliedScheme: schemeResult?.scheme_id ? {
            scheme_id: schemeResult.scheme_id,
            scheme_name: schemeResult.scheme_name,
            free_product_id: schemeResult.free_product_id,
            free_quantity: schemeResult.free_quantity_result,
            description: schemeResult.scheme_description,
            is_repeatable: schemeResult.is_repeatable
          } : null
        } : i
      )
      
      set({ items: updatedItems })
    } catch (error) {
      console.error('Error checking scheme:', error)
      // Continue without scheme on error
    }
  },

  // Update item quantity and check scheme
  updateItemQuantity: async (itemId, quantity, freeQuantity = 0) => {
    const items = get().items
    const updatedItems = items.map(item => 
      item.id === itemId ? { ...item, quantity, freeQuantity: 0 } : item // Reset free quantity, will be recalculated
    )
    set({ items: updatedItems })
    
    // Check if scheme applies after quantity change
    await get().checkAndApplyScheme(itemId)
  },

  // Update item discount
  updateItemDiscount: (itemId, discount) => {
    const items = get().items
    const updatedItems = items.map(item => 
      item.id === itemId ? { ...item, discount } : item
    )
    set({ items: updatedItems })
  },

  // Remove item from cart
  removeItem: (itemId) => {
    const items = get().items.filter(item => item.id !== itemId)
    set({ items })
  },

  // Set customer
  setCustomer: (customer) => set({ customer }),

  // Set sale type
  setSaleType: (saleType) => {
    set({ saleType })
    // Update prices when sale type changes
    const items = get().items.map(item => ({
      ...item,
      price: saleType === 'retail' ? item.batch.selling_price : item.batch.wholesale_price
    }))
    set({ items })
  },

  // Set payment method
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),

  // Set discount
  setDiscount: (discount) => set({ discount }),

  // Calculate subtotal (only for paid quantities, not free)
  getSubtotal: () => {
    const items = get().items
    return items.reduce((total, item) => {
      const itemTotal = item.quantity * item.price // Only paid quantity
      const itemDiscount = (itemTotal * item.discount) / 100
      return total + (itemTotal - itemDiscount)
    }, 0)
  },

  // Calculate GST (only on paid quantities)
  getGST: () => {
    const items = get().items
    return items.reduce((total, item) => {
      const itemTotal = item.quantity * item.price // Only paid quantity
      const itemDiscount = (itemTotal * item.discount) / 100
      const taxableAmount = itemTotal - itemDiscount
      return total + (taxableAmount * item.medicine.gst_percentage) / 100
    }, 0)
  },

  // Calculate total discount amount
  getTotalDiscount: () => {
    const items = get().items
    const itemDiscounts = items.reduce((total, item) => {
      const itemTotal = item.quantity * item.price
      return total + (itemTotal * item.discount) / 100
    }, 0)
    
    const subtotal = get().getSubtotal() + itemDiscounts
    const cartDiscount = (subtotal * get().discount) / 100
    
    return itemDiscounts + cartDiscount
  },

  // Calculate grand total
  getGrandTotal: () => {
    const subtotal = get().getSubtotal()
    const gst = get().getGST()
    const cartDiscount = (subtotal * get().discount) / 100
    return subtotal + gst - cartDiscount
  },

  // Get total items count (paid + free)
  getItemsCount: () => {
    return get().items.reduce((total, item) => total + item.quantity + item.freeQuantity, 0)
  },

  // Get total paid quantity
  getPaidQuantity: () => {
    return get().items.reduce((total, item) => total + item.quantity, 0)
  },

  // Get total free quantity
  getFreeQuantity: () => {
    return get().items.reduce((total, item) => total + item.freeQuantity, 0)
  },

  // Clear cart
  clearCart: () => set({ 
    items: [], 
    customer: null,
    saleType: null, // Reset to no selection
    discount: 0 
  }),

  // Validate cart
  validateCart: () => {
    const { items, saleType, customer } = get()
    const errors = []

    if (items.length === 0) {
      errors.push('Cart is empty')
    }

    // Check stock availability (paid + free)
    items.forEach(item => {
      if (item.quantity + item.freeQuantity > item.batch.current_quantity) {
        errors.push(`Insufficient stock for ${item.medicine.name}. Available: ${item.batch.current_quantity}, Required: ${item.quantity + item.freeQuantity}`)
      }
      
      // Check expiry
      if (new Date(item.batch.expiry_date) <= new Date()) {
        errors.push(`${item.medicine.name} batch has expired`)
      }
    })

    // Validate wholesale requirements
    if (saleType === 'wholesale' || saleType === 'distributor') {
      if (!customer) {
        errors.push('Customer is required for wholesale/distributor billing')
      } else if (!customer.gstin) {
        errors.push('GSTIN is required for wholesale/distributor billing')
      } else if (!customer.drug_license_number) {
        errors.push('Drug License Number is required for wholesale/distributor billing')
      }
    }

    return errors
  }
}))

export default useCartStore