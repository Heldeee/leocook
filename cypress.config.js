import { defineConfig } from 'cypress'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

export default defineConfig({
  allowCypressEnv: false,
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://127.0.0.1:4173',
    setupNodeEvents(on, config) {
      on('task', {
        async createTestUser({ name = 'Alice E2E', email, password = 'motdepasse123' } = {}) {
          const finalEmail = email || `e2e-${Date.now()}@example.test`
          const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false }
          })

          const { data: created, error } = await supabase.auth.admin.createUser({
            email: finalEmail,
            password,
            email_confirm: true,
            user_metadata: { name }
          })

          if (error) throw error

          const { data: familyData, error: familyError } = await supabase
            .from('families')
            .insert({ name: `Famille ${name}` })
            .select('id')
            .single()

          if (familyError) throw familyError

          const { error: memberError } = await supabase
            .from('family_members')
            .insert({ user_id: created.user.id, family_id: familyData.id, role: 'owner' })

          if (memberError) throw memberError

          const { error: upsertError } = await supabase
            .from('users')
            .upsert({ id: created.user.id, name, email: finalEmail })

          if (upsertError) throw upsertError

          return { email: finalEmail, password, userId: created.user.id, name }
        },

        async seedRecipe({ userId, recipeName = 'Gratin E2E', ingredientName = 'Courgette E2E', tagName = 'test' } = {}) {
          const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false }
          })

          const { data: existingFamily, error: familyFindError } = await supabase
            .from('families')
            .select('id')
            .like('name', 'Famille E2E')
            .maybeSingle()

          if (familyFindError) throw familyFindError

          const { data: familyData, error: familyError } = existingFamily
            ? { data: existingFamily, error: null }
            : await supabase
                .from('families')
                .insert({ name: 'Famille E2E' })
                .select('id')
                .single()

          if (familyError) throw familyError

          const { error: memberError } = await supabase
            .from('family_members')
            .upsert({ user_id: userId, family_id: familyData.id, role: 'owner' }, { onConflict: 'family_id,user_id' })

          if (memberError) throw memberError

          const { data: unitData, error: unitError } = await supabase
            .from('units')
            .select('id')
            .ilike('abbreviation', 'g')
            .maybeSingle()

          if (unitError) throw unitError

          const { data: existingIngredient, error: ingredientFindError } = await supabase
            .from('ingredients')
            .select('id')
            .ilike('name', ingredientName)
            .maybeSingle()

          if (ingredientFindError) throw ingredientFindError

          const ingredientId = existingIngredient?.id ?? (
            await supabase.from('ingredients').insert({ name: ingredientName }).select('id').single()
          ).data.id

          const { data: existingTag, error: tagFindError } = await supabase
            .from('tags')
            .select('id')
            .ilike('name', tagName)
            .maybeSingle()

          if (tagFindError) throw tagFindError

          const tagId = existingTag?.id ?? (
            await supabase.from('tags').insert({ name: tagName }).select('id').single()
          ).data.id

          const { data: recipeData, error: recipeError } = await supabase
            .from('recipes')
            .insert({
              name: recipeName,
              author_id: userId,
              family_id: familyData.id,
              private: true,
              servings: 6,
            })
            .select('id')
            .single()

          if (recipeError) throw recipeError

          const { error: ingredientRelationError } = await supabase
            .from('recipe_ingredients')
            .upsert({
              recipe_id: recipeData.id,
              ingredient_id: ingredientId,
              quantity: 2,
              unit_id: unitData.id,
            }, { onConflict: 'recipe_id,ingredient_id' })

          if (ingredientRelationError) throw ingredientRelationError

          const { error: tagRelationError } = await supabase
            .from('recipe_tags')
            .upsert({ recipe_id: recipeData.id, tag_id: tagId }, { onConflict: 'recipe_id,tag_id' })

          if (tagRelationError) throw tagRelationError

          const { error: stepError } = await supabase
            .from('recipe_steps')
            .upsert({
              recipe_id: recipeData.id,
              step_number: 1,
              instruction: 'Cuire au four',
              duration_seconds: 60,
            }, { onConflict: 'recipe_id,step_number' })

          if (stepError) throw stepError

          return { recipeId: recipeData.id, recipeName, ingredientName }
        }
      })
      return config
    },
  },
})
