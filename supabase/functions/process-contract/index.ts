import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { contractId, originalContent } = await req.json();

    if (!contractId || !originalContent) {
      console.error('Missing required fields:', { contractId, hasContent: !!originalContent });
      return new Response(
        JSON.stringify({ error: 'contractId e originalContent são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing contract ${contractId}, content length: ${originalContent.length}`);

    // Update status to processing
    await supabase
      .from('contracts')
      .update({ status: 'processing', original_content: originalContent })
      .eq('id', contractId);

    // Call Lovable AI to process the contract
    const aiResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em análise e reescrita de contratos. Sua tarefa é:
1. Analisar o contrato fornecido
2. Reescrever de forma clara, organizada e profissional
3. Manter todos os termos e condições originais
4. Estruturar com seções claras e numeradas
5. Adicionar formatação markdown para melhor legibilidade
6. Destacar pontos importantes com negrito
7. Corrigir erros gramaticais se houver

Responda APENAS com o contrato reescrito, sem comentários adicionais.`
          },
          {
            role: 'user',
            content: `Por favor, analise e reescreva o seguinte contrato:\n\n${originalContent}`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`Erro na API de IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const processedContent = aiData.choices?.[0]?.message?.content || '';

    console.log(`Contract processed successfully, result length: ${processedContent.length}`);

    // Update contract with processed content
    const { error: updateError } = await supabase
      .from('contracts')
      .update({ 
        processed_content: processedContent, 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', contractId);

    if (updateError) {
      console.error('Error updating contract:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, processedContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error processing contract:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao processar contrato';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
