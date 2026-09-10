import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { ticketId, message } = await req.json();

    // Initialize Supabase client with service role key for backend updates
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch knowledge base articles for context
    const { data: kbArticles, error: kbError } = await supabaseClient
      .from('knowledge_base')
      .select('title, content');

    if (kbError) throw kbError;

    const contextText = kbArticles 
      ? kbArticles.map(kb => `Topic: ${kb.title}\nDetails: ${kb.content}`).join('\n\n')
      : 'No knowledge base articles available.';

    // Construct prompt for Gemini specifically tailored for academic result inquiries
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const prompt = `You are an AI support assistant for Acadex, a university student result portal. 
A student has submitted a support ticket regarding their academic results. Answer their question using ONLY the provided knowledge base context where applicable. 
If the answer or solution is not explicitly covered in the context, politely state that an academic administrator will review the result log manually shortly. Keep your response concise, professional, and clear.

Knowledge Base Context:
${contextText}

Student Support Ticket: "${message}"

AI Response:`;

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const aiData = await aiRes.json();
    const replyText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "Your result inquiry has been received by our academic review team.";

    // Determine status: if it falls back to admin review, keep open; otherwise mark ai_resolved
    const isResolved = !replyText.toLowerCase().includes("academic administrator will review");

    // Update the support ticket record in Supabase
    const { error: updateError } = await supabaseClient
      .from('support_tickets')
      .update({
        ai_response: replyText,
        status: isResolved ? 'ai_resolved' : 'open'
      })
      .eq('id', ticketId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, aiResponse: replyText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
