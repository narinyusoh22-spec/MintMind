import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const auth = req.headers.get('Authorization') ?? ''
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
    const { message, task = 'coach' } = await req.json()
    const { data: transactions } = await supabase.from('transactions').select('type,description,amount,category,date').order('date', { ascending: false }).limit(100)
    const system = 'คุณคือผู้ช่วยวางแผนการเงินส่วนบุคคลภาษาไทย ตอบสั้น กระชับ เป็นมิตร ห้ามให้คำแนะนำซื้อขายหลักทรัพย์หรือภาษีแบบเฉพาะเจาะจง ใช้ข้อมูลที่ให้เท่านั้น หากข้อมูลน้อยให้บอกตรง ๆ'
    const prompt = `${system}\nงาน: ${task}\nรายการเงินล่าสุด: ${JSON.stringify(transactions ?? [])}\nคำถามผู้ใช้: ${message}`
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) })
    const result = await response.json()
    if (!response.ok) throw new Error(result?.error?.message ?? 'Gemini request failed')
    const answer = result.candidates?.[0]?.content?.parts?.[0]?.text ?? 'ไม่พบคำตอบจาก Gemini'
    return Response.json({ answer }, { headers: corsHeaders })
  } catch (error) { return Response.json({ error: error.message }, { status: 500, headers: corsHeaders }) }
})
