
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Public client (for client-side + basic reads)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service client (for server actions — full DB access + Edge Function calls)
export const supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceKey || supabaseAnonKey,
    { auth: { persistSession: false } }
);

// ============================================================
// HIGH-PERFORMANCE GEMINI CALLER — Direct Google REST API
// Bypasses the Supabase Edge Function hop for ~300ms savings per call
// Supports KEY ROTATION: Provide multiple keys separated by commas in GEMINI_API_KEYS
// ============================================================

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const RAW_API_KEYS = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
const LOCAL_GEMINI_KEYS = RAW_API_KEYS.split(',').map(k => k.trim()).filter(k => k);

let currentKeyIndex = 0; // State is maintained in the NextJS Node Server process

async function callGeminiDirect(params: {
    systemPrompt?: string;
    prompt?: string;
    messages?: Array<{ role: 'user' | 'model'; content: string }>;
    model?: string;
    temperature?: number;
    jsonMode?: boolean;
}): Promise<{ text: string; tokens: { total: number; prompt: number; response: number }; model: string }> {
    if (LOCAL_GEMINI_KEYS.length === 0) throw new Error("No Gemini API keys configured locally");

    const {
        systemPrompt,
        prompt,
        messages,
        model = 'gemini-2.5-pro',
        temperature = 0.7,
        jsonMode = true,
    } = params;

    const geminiBody: any = {
        generationConfig: {
            temperature,
            maxOutputTokens: 8192,
        },
    };

    if (jsonMode) {
        geminiBody.generationConfig.responseMimeType = 'application/json';
    }

    if (systemPrompt) {
        geminiBody.system_instruction = {
            parts: [{ text: systemPrompt }],
        };
    }

    if (messages && messages.length > 0) {
        geminiBody.contents = messages.map((m) => ({
            role: m.role,
            parts: [{ text: m.content }],
        }));
    } else if (prompt) {
        geminiBody.contents = [{ role: 'user', parts: [{ text: prompt }] }];
    } else {
        throw new Error('Either prompt or messages is required');
    }

    const modelsToTry = [model, 'gemini-2.5-flash', 'gemini-2.5-pro'];
    const uniqueModels = [...new Set(modelsToTry)];

    for (const modelName of uniqueModels) {
        // Retry logic to handle both Rate limits (RPM) and Quota limits (Daily)
        for (let retry = 0; retry < 5; retry++) {
            const usedKey = LOCAL_GEMINI_KEYS[currentKeyIndex];
            
            try {
                const response = await fetch(
                    `${GEMINI_API_BASE}/${modelName}:generateContent?key=${usedKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(geminiBody),
                    }
                );

                if (response.status === 429) {
                    const errText = await response.text();
                    
                    // Daily Free Quota Exhausted! Auto-Rotate to the next key.
                    if (errText.includes('requests_per_model_per_day') || errText.includes('RESOURCE_EXHAUSTED')) {
                        console.warn(`[Gemini] ⚠️ KEY ${currentKeyIndex + 1}/${LOCAL_GEMINI_KEYS.length} quota exhausted! Rotating key...`);
                        
                        // Switch to next key
                        currentKeyIndex = (currentKeyIndex + 1) % LOCAL_GEMINI_KEYS.length;
                        
                        if (LOCAL_GEMINI_KEYS.length > 1) {
                            // Immediately retry with the new key without waiting
                            continue; 
                        } else {
                            // If we only have 1 key, we are truly dead. Fallback to flash/next model.
                            break; 
                        }
                    }

                    // Standard Rate Limit (Requests per minute limit)
                    const waitMs = Math.pow(2, retry) * 1000 + Math.random() * 500;
                    console.warn(`[Gemini] 429 Rate Limit on ${modelName}, retrying in ${Math.round(waitMs)}ms...`);
                    await new Promise(r => setTimeout(r, waitMs));
                    continue;
                }

                if (!response.ok) {
                    const errText = await response.text();
                    console.warn(`[Gemini] ${modelName} HTTP ${response.status}: ${errText.substring(0, 200)}`);
                    break; // Try next model
                }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                const usage = data.usageMetadata || {};

                return {
                    text,
                    tokens: {
                        total: usage.totalTokenCount || 0,
                        prompt: usage.promptTokenCount || 0,
                        response: usage.candidatesTokenCount || 0,
                    },
                    model: modelName,
                };
            } catch (fetchError: any) {
                console.warn(`[Gemini] ${modelName} fetch error: ${fetchError.message}`);
                break; // Try next model
            }
        }
    }

    throw new Error('All Gemini models failed after retries');
}

async function callGeminiViaEdge(params: {
    systemPrompt?: string;
    prompt?: string;
    messages?: Array<{ role: 'user' | 'model'; content: string }>;
    model?: string;
    temperature?: number;
    jsonMode?: boolean;
}): Promise<{ text: string; tokens: { total: number; prompt: number; response: number }; model: string }> {
    const { data, error } = await supabaseAdmin.functions.invoke('gemini-proxy', {
        body: params,
    });

    if (error) {
        console.error('[callGemini] Edge Function error:', error);
        throw new Error(`Gemini proxy error: ${error.message}`);
    }

    if (data.error) {
        throw new Error(`Gemini API error: ${data.error}`);
    }

    return data;
}

/**
 * Smart caller: uses direct API if GEMINI_API_KEY is available locally,
 * otherwise falls back to the Supabase Edge Function proxy.
 */
export async function callGemini(params: {
    systemPrompt?: string;
    prompt?: string;
    messages?: Array<{ role: 'user' | 'model'; content: string }>;
    model?: string;
    temperature?: number;
    jsonMode?: boolean;
}): Promise<{ text: string; tokens: { total: number; prompt: number; response: number }; model: string }> {
    if (LOCAL_GEMINI_KEYS.length > 0) {
        return callGeminiDirect(params);
    }
    return callGeminiViaEdge(params);
}
