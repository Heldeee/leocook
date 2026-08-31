import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
)

const { data: created, error } = await supabase.auth.admin.createUser({
  email: 'alice@test.local',
  password: 'motdepasse123',
  email_confirm: true,
  user_metadata: { name: 'Alice Test' }
})

if (error) throw error

const { error: insertError } = await supabase
  .from('users')
  .upsert({
    id: created.user.id,
    name: 'Alice Test',
    email: 'alice@test.local'
  })

if (insertError) throw insertError

console.log('User created:', created.user.id)