import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Customer Cart Store - Separate from POS Cart
 * Used for customer online shopping only
 * Does not interfere with admin POS billing
 */
const useCustomerCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      
      // Add item to cart
      addItem: (medicine, batch, quantity = 1) => {
        const items = get().items
        const existingItemIndex = items.findIndex(
          item => item.medicine.id === medicine.id && item.batch.id === batch.id
        )
        
        if (existingItemIndex >= 0) {
          // Update existing item
          const updatedItems = [...items]
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: updatedItems[existingItemIndex].quantity + quantity
          }
          set({ items: updatedItems })
        } else {
          // Add new item
          const newItem = {
            id: `${medicine.id}-${batch.id}`,
            medicine,
            batch,
            quantity,
            price: batch.selling_price // Use retail price for customers
          }
          set({ items: [...items, newItem] })
        }
      },

      // Update item quantity
      updateItemQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId)
          return
        }
        
        const items = get().items
        const updatedItems = items.map(item => 
          item.id === itemId ? { ...item, quantity } : item
        )
        set({ items: updatedItems })
      },

      // Remove item from cart
      removeItem: (itemId) => {
        const items = get().items.filter(item => item.id !== itemId)
        set({ items })
      },

      // Calculate subtotal (before GST)
      getSubtotal: () => {
        const items = get().items
        return items.reduce((total, item) => {
          return total + (item.quantity * item.price)
        }, 0)
      },

      // Calculate GST
      getGST: () => {
        const items = get().items
        return items.reduce((total, item) => {
          const itemTotal = item.quantity * item.price
          return total + (itemTotal * (item.medicine.gst_percentage || 0)) / 100
        }, 0)
      },

      // Calculate grand total
      getGrandTotal: () => {
        const subtotal = get().getSubtotal()
        const gst = get().getGST()
        return subtotal + gst
      },

      // Get total items count
      getItemsCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },

      // Clear cart
      clearCart: () => set({ items: [] }),

      // Validate cart
      validateCart: () => {
        const { items } = get()
        const errors = []

        if (items.length === 0) {
          errors.push('Cart is empty')
          return errors
        }

        // Check stock availability and expiry
        items.forEach(item => {
          if (item.quantity > item.batch.current_quantity) {
            errors.push(`Only ${item.batch.current_quantity} units available for ${item.medicine.name}`)
          }
          
          // Check expiry
          const expiryDate = new Date(item.batch.expiry_date)
          if (expiryDate <= new Date()) {
            errors.push(`${item.medicine.name} batch has expired`)
          }

          // Check if prescription required
          if (item.medicine.prescription_required) {
            errors.push(`${item.medicine.name} requires a prescription. Please upload prescription before ordering.`)
          }
        })

        return errors
      },

      // Check if medicine is in cart
      isInCart: (medicineId, batchId) => {
        const items = get().items
        return items.some(item => 
          item.medicine.id === medicineId && item.batch.id === batchId
        )
      },

      // Get cart item quantity
      getCartItemQuantity: (medicineId, batchId) => {
        const items = get().items
        const item = items.find(i => 
          i.medicine.id === medicineId && i.batch.id === batchId
        )
        return item ? item.quantity : 0
      }
    }),
    {
      name: 'customer-cart-storage', // Unique storage key
      partialize: (state) => ({ items: state.items }) // Only persist items
    }
  )
)

export default useCustomerCartStore
