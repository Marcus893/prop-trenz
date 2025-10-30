// Test script to verify Supabase connection
// Run this in the browser console on the admin page

async function testSupabaseConnection() {
  console.log('Testing Supabase connection...')
  
  try {
    // Test 1: Check if Supabase client is available
    console.log('Supabase client:', window.supabase || 'Not found on window')
    
    // Test 2: Try to get upload logs
    const result = await db.getUploadLogs()
    console.log('Upload logs result:', result)
    
    // Test 3: Check current user
    const { data: { user } } = await supabase.auth.getUser()
    console.log('Current user:', user)
    
    // Test 4: Check if user is in users table
    if (user) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .single()
      
      console.log('User data:', userData)
      console.log('User error:', userError)
    }
    
  } catch (error) {
    console.error('Supabase test failed:', error)
  }
}

// Run the test
testSupabaseConnection()




