import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, tokenData, walletStats } = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    // Build context from wallet and token data
    let contextInfo = "";

    if (walletStats) {
      contextInfo += `\n\n📊 STATISTICHE WALLET UTENTE:
- PnL Totale: ${walletStats.totalPnlSol?.toFixed(4) || 0} SOL
- Trade Totali: ${walletStats.totalTrades || 0}
- Trade Vincenti: ${walletStats.winningTrades || 0}
- Trade Perdenti: ${walletStats.losingTrades || 0}
- Win Rate: ${walletStats.winRate?.toFixed(1) || 0}%`;
    }

    if (tokenData) {
      contextInfo += `\n\n🪙 DATI TOKEN ANALIZZATO:
- Nome: ${tokenData.name || 'N/A'}
- Simbolo: ${tokenData.symbol || 'N/A'}
- Mint: ${tokenData.mint || 'N/A'}
- Prezzo: $${tokenData.priceUsd?.toFixed(8) || 'N/A'}
- Market Cap: $${tokenData.marketCap?.toLocaleString() || 'N/A'}
- Volume 24h: $${tokenData.volume24h?.toLocaleString() || 'N/A'}
- Liquidità: $${tokenData.liquidity?.toLocaleString() || 'N/A'}
- Variazione 24h: ${tokenData.priceChange24h?.toFixed(2) || 0}%
- Supply: ${tokenData.supply?.toLocaleString() || 'N/A'}
- Holders: ${tokenData.holders || 'N/A'}
- Dev Holdings: ${tokenData.devHoldings || 'N/A'}%`;
    }

    const systemPrompt = `Sei un esperto analista di trading crypto su Solana, specializzato in meme coin e token. Parla sempre in italiano.

Il tuo ruolo è:
1. Analizzare token e fornire insight dettagliati
2. Suggerire strategie di trading basate sui dati
3. Identificare rischi e opportunità
4. Fornire consigli pratici sul timing di entry/exit

IMPORTANTE:
- Sii conciso ma preciso nelle analisi
- Usa emoji per rendere le risposte più leggibili
- Evidenzia sempre i RISCHI prima delle opportunità
- Non consigliare mai di investire più di quanto si può perdere
- Considera sempre la liquidità prima di suggerire entry

${contextInfo}`;

    // Use Groq API (OpenAI-compatible)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Riprova tra qualche secondo." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Errore Groq API" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Trading assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
