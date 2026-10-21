import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,

  // Initialize auth state
  initialize: async () => {
    console.log('🔄 Starting auth initialization...')
    
    if (!supabase) {
      console.log('❌ Supabase not configured')
      set({ loading: false })
      return
    }
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('⏰ Auth initialization timeout - stopping loading')
      set({ loading: false, error: 'Authentication timeout. Please check your Supabase credentials.' })
    }, 10000) // 10 second timeout
    
    try {
      console.log('🔍 Getting session from Supabase...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      // Clear timeout if we get a response
      clearTimeout(timeoutId)
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError)
        throw sessionError
      }
      
      console.log('📋 Session data:', session ? 'User found' : 'No user')
      
      if (session?.user) {
        console.log('👤 User ID:', session.user.id)
        console.log('📧 User email:', session.user.email)
        
        // Try to get profile, but don't fail if it doesn't exist yet
        try {
          console.log('🔍 Fetching user profile...')
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (profileError) {
            console.log('⚠️ Profile error (might not exist yet):', profileError.message)
            set({ user: session.user, profile: null, loading: false })
          } else {
            console.log('✅ Profile loaded:', profile.role)
            set({ user: session.user, profile, loading: false })
          }
        } catch (profileError) {
          console.log('⚠️ Profile fetch failed:', profileError.message)
          set({ user: session.user, profile: null, loading: false })
        }
      } else {
        console.log('👋 No authenticated user - showing login')
        set({ loading: false })
      }
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('❌ Auth initialization failed:', error)
      set({ error: error.message, loading: false })
    }
  },

  // Sign in
  signIn: async (email, password) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' }
    
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      
      // Try to get profile
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()
        set({ user: data.user, profile, loading: false })
      } catch (profileError) {
        set({ user: data.user, profile: null, loading: false })
      }
      return { success: true }
    } catch (error) {
      set({ error: error.message, loading: false })
      return { success: false, error: error.message }
    }
  },

  // Sign up
  signUp: async (email, password, userData) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' }
    
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password, 
        options: { data: userData } 
      })
      if (error) throw error
      
      set({ loading: false })
      return { success: true, data }
    } catch (error) {
      set({ error: error.message, loading: false })
      return { success: false, error: error.message }
    }
  },

  // Sign out
  signOut: async () => {
    if (!supabase) return
    
    set({ loading: true })
    try {
      await supabase.auth.signOut()
      set({ user: null, profile: null, loading: false })
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  },

  // Update profile
  updateProfile: async (updates) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' }
    
    try {
      const { user } = get()
      if (!user) throw new Error('No user logged in')
      
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()
      
      set({ profile: updatedProfile })
      return { success: true }
    } catch (error) {
      set({ error: error.message })
      return { success: false, error: error.message }
    }
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Check permissions
  hasPermission: (requiredRole) => {
    const { profile, user } = get()
    if (!profile || !user) return false
    
    // Whitelist of admin emails - only these can access admin dashboard
    const ALLOWED_ADMIN_EMAILS = [
      'aslentechsolutions@gmail.com',
      // Add more admin emails here as needed
    ]
    
    // If requiring admin role, check email whitelist
    if (requiredRole === 'admin') {
      const isAllowedAdmin = ALLOWED_ADMIN_EMAILS.includes(user.email?.toLowerCase())
      const hasAdminRole = profile.role === 'admin'
      return isAllowedAdmin && hasAdminRole
    }
    
    const roleHierarchy = {
      'patient': 1,
      'staff': 2,
      'pharmacist': 3,
      'admin': 4,
      'retailer': 2,
      'wholesaler': 2
    }
    
    return roleHierarchy[profile.role] >= roleHierarchy[requiredRole]
  },

  // Get redirect path based on role
  getRedirectPath: () => {
    const { profile, user } = get()
    console.log('🔍 getRedirectPath - Profile:', profile)
    console.log('📧 User email:', user?.email)
    
    if (!profile) {
      console.log('⚠️ No profile, redirecting to login')
      return '/login'
    }
    
    console.log('👤 User role:', profile.role)
    
    // Whitelist of admin emails - only these can access admin dashboard
    const ALLOWED_ADMIN_EMAILS = [
      'aslentechsolutions@gmail.com',
      // Add more admin emails here as needed
    ]
    
    // If user has admin role but email is not in whitelist, redirect to customer portal
    if (profile.role === 'admin') {
      const isAllowedAdmin = ALLOWED_ADMIN_EMAILS.includes(user?.email?.toLowerCase())
      if (!isAllowedAdmin) {
        console.log('⚠️ User has admin role but email not in whitelist, redirecting to customer portal')
        return '/customer/store'
      }
      console.log('➡️ Redirecting to /admin (authorized)')
      return '/admin'
    }
    
    switch (profile.role) {
      case 'pharmacist':
        console.log('➡️ Redirecting to /pharmacist')
        return '/pharmacist'
      case 'staff':
        console.log('➡️ Redirecting to /staff')
        return '/staff'
      case 'patient':
        console.log('➡️ Redirecting to /customer/store (patient role)')
        return '/customer/store'
      case 'retailer':
        console.log('➡️ Redirecting to /retailer')
        return '/retailer'
      case 'wholesaler':
        console.log('➡️ Redirecting to /wholesaler')
        return '/wholesaler'
      default:
        console.log('⚠️ Unknown role:', profile.role, '- redirecting to customer store')
        return '/customer/store'
    }
  }
}))

export default useAuthStore