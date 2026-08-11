# Deploy Gemini AI Coach

1. Install and sign in to the Supabase CLI, then link this directory to your project.
2. Set the key securely: `supabase secrets set GEMINI_API_KEY=your_gemini_key`
3. Deploy: `supabase functions deploy ai-coach --no-verify-jwt`

Do not put the Gemini key in `js/config.js` or any browser file. The Edge Function reads the current user's transactions under Row Level Security and sends a compact context to Gemini 3.6 Flash.
