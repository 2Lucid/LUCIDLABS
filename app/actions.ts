"use server";

import { supabaseAdmin, callGemini } from '@/lib/supabase';
import {
    CONTEXT_SYSTEM_PROMPT, contextUserPrompt,
    QUIZ_SYSTEM_PROMPT, quizUserPrompt,
    homeworkSystemPrompt, homeworkUserPrompt,
    flashcardsSystemPrompt, flashcardsUserPrompt,
    revisionSystemPrompt, revisionUserPrompt,
    tutorSystemPrompt, tutorStudentSystemPrompt,
    judgeSystemPrompt
} from '@/lib/config/prompts.config';
import {
    QUIZ_QUESTION_COUNT, FLASHCARD_COUNT,
    JUDGE_THRESHOLD, SUBJECTS_BY_LEVEL,
    DATASET_TARGETS, TOTAL_TARGET, CONTEXT_STYLES,
    QUIZ_MODES, FLASHCARD_MODES, REVISION_LENGTHS,
    STUDENT_LEVELS
} from '@/lib/config/pipeline.config';

// ============================================================
// HELPER FOR SAFE JSON PARSING
// ============================================================
function parseAIJson(text: string) {
    let clean = text.trim();
    if (clean.startsWith('```json')) {
        clean = clean.substring(7);
    } else if (clean.startsWith('```')) {
        clean = clean.substring(3);
    }
    if (clean.endsWith('```')) {
        clean = clean.substring(0, clean.length - 3);
    }
    return JSON.parse(clean.trim());
}

// ============================================================
// PIPELINE RUN MANAGEMENT
// ============================================================

export async function createPipelineRun(config: any) {
    const { data, error } = await supabaseAdmin
        .from('pipeline_runs')
        .insert([{ config, status: 'running', phase: 'context' }])
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data;
}

export async function updatePipelineRun(id: string, updates: any) {
    const { error } = await supabaseAdmin
        .from('pipeline_runs')
        .update(updates)
        .eq('id', id);
    if (error) throw new Error(error.message);
}

export async function getPipelineRuns() {
    const { data, error } = await supabaseAdmin
        .from('pipeline_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
    if (error) return [];
    return data;
}

// ============================================================
// PHASE 1: CONTEXT GENERATION
// ============================================================

export async function generateContexts(params: {
    subject: string;
    level: string;
    count: number;
    style: string;
    pipelineRunId?: string;
}) {
    const { subject, level, count, style, pipelineRunId } = params;

    let result;
    try {
        result = await callGemini({
            systemPrompt: CONTEXT_SYSTEM_PROMPT,
            prompt: contextUserPrompt(subject, level, count, style),
            model: 'gemini-flash-latest',
            temperature: 0.9,
            jsonMode: true,
        });
    } catch (e) {
        console.error("Gemini API Error in generateContexts:", e);
        throw e;
    }

    let parsed;
    try {
        parsed = parseAIJson(result.text);
    } catch (e) {
        console.error("JSON Parse Error in generateContexts. Result text was:", result.text);
        throw e;
    }

    const entries = parsed.entries || [];

    // Save to DB
    const toInsert = entries.map((entry: any) => ({
        subject,
        level,
        style,
        content: JSON.stringify(entry),
        is_used: false,
        pipeline_run_id: pipelineRunId || null,
        metadata: { tokens: result.tokens, model: result.model },
    }));

    try {
        const { data, error } = await supabaseAdmin
            .from('contexts')
            .insert(toInsert)
            .select();

        if (error) {
            console.error("Supabase insert error:", error);
            throw new Error(error.message);
        }
        return { contexts: data, tokens: result.tokens };
    } catch (e) {
        console.error("Supabase execution error in generateContexts:", e);
        throw e;
    }
}

// ============================================================
// COMBINATION UNIQUENESS TRACKING
// ============================================================

/**
 * Atomic combo check+register in a single DB call.
 * Returns true if the combo was NEW (inserted), false if it already existed.
 */
async function tryRegisterCombo(combo: {
    task_type: string;
    subject: string;
    level: string;
    mode: string;
    topic: string;
    example_id?: string;
}): Promise<boolean> {
    const { data, error } = await supabaseAdmin.rpc('try_register_combo', {
        p_task_type: combo.task_type,
        p_subject: combo.subject,
        p_level: combo.level,
        p_mode: combo.mode || '',
        p_topic: combo.topic,
        p_example_id: combo.example_id || null,
    });
    if (error) {
        console.error('tryRegisterCombo error:', error);
        return false;
    }
    return data === true;
}

// ============================================================
// PHASE 2: EXAMPLE GENERATION
// ============================================================

/**
 * Atomic context claiming in a SINGLE DB call via PostgreSQL RPC.
 * Finds a random unused context and locks it atomically.
 */
async function getUnusedContext(taskType: string, subject?: string, level?: string) {
    const { data, error } = await supabaseAdmin.rpc('claim_unused_context', {
        p_task_type: taskType,
        p_subject: subject || null,
        p_level: level || null,
    });
    if (error) {
        console.error('claim_unused_context error:', error);
        return null;
    }
    // RPC returns an array; take the first (and only) row
    return data && data.length > 0 ? data[0] : null;
}

async function getMixedContexts(taskType: string, level: string, mainSubject: string) {
    const trackColumn = `used_${taskType}`;
    // For extra contexts, we do not need strict atomicity simply to fetch topics. 
    // They will be atomically locked below.
    const { data } = await supabaseAdmin
        .from('contexts')
        .select('*')
        .eq(trackColumn, false)
        .eq('level', level)
        .neq('subject', mainSubject)
        .limit(2);
    return data || [];
}

async function revertContextUse(taskType: string, contextId: string) {
    await supabaseAdmin
        .from('contexts')
        .update({ [`used_${taskType}`]: false })
        .eq('id', contextId);
}

async function saveExample(example: any) {
    const { data, error } = await supabaseAdmin
        .from('examples')
        .insert([example])
        .select()
        .single();
    if (error) throw new Error(error.message);
    return data;
}

// --- Quiz Generator ---
export async function generateQuizExample(params: {
    subject?: string;
    level?: string;
    mode: string;
    pipelineRunId?: string;
}) {
    const context = await getUnusedContext('quiz', params.subject, params.level);
    if (!context) throw new Error(`No unused context for ${params.subject || 'ANY'} ${params.level || 'ANY'}`);

    const actualSubject = context.subject;
    const actualLevel = context.level;

    const contextData = JSON.parse(context.content);
    const topic = contextData.title || contextData.content?.substring(0, 50) || actualSubject;

    let contextsString = `${actualSubject}: ${contextData.content || JSON.stringify(contextData)}`;
    let subjectsList = actualSubject;
    const contextIdsToMark = [context.id];

    if (params.mode === 'all_subjects' || params.mode === 'recall') {
        const extraContexts = await getMixedContexts('quiz', actualLevel, actualSubject);
        for (const ec of extraContexts) {
            const data = JSON.parse(ec.content);
            contextsString += `\n\n--- Autre matière ---\n${ec.subject}: ${data.content || JSON.stringify(data)}`;
            subjectsList += `, ${ec.subject}`;
            contextIdsToMark.push(ec.id);
            await supabaseAdmin.from('contexts').update({ used_quiz: true }).eq('id', ec.id);
        }
    }

    try {
        const promptStr = quizUserPrompt({
            mode: params.mode,
            date: new Date().toISOString().split('T')[0],
            subject: actualSubject,
            subjects: subjectsList,
            contexts: contextsString,
        });

        const result = await callGemini({
            systemPrompt: QUIZ_SYSTEM_PROMPT,
            prompt: promptStr,
            model: 'gemini-flash-latest',
            temperature: 0.7,
            jsonMode: true,
        });

        const parsed = parseAIJson(result.text);

        const example = await saveExample({
            task_type: 'quiz',
            subject: actualSubject,
            level: actualLevel,
            mode: params.mode,
            topic,
            context_id: context.id,
            content: parsed,
            system_prompt: QUIZ_SYSTEM_PROMPT,
            user_prompt: promptStr,
            tokens_used: result.tokens.total,
            model_used: result.model,
            pipeline_run_id: params.pipelineRunId || null,
        });

        const combo = { task_type: 'quiz', subject: actualSubject, level: actualLevel, mode: params.mode, topic, example_id: example.id };
        await tryRegisterCombo(combo);
        return { example, tokens: result.tokens };
    } catch (e) {
        for (const cid of contextIdsToMark) {
            await revertContextUse('quiz', cid);
        }
        throw e;
    }
}

// --- Homework Generator ---
export async function generateHomeworkExample(params: {
    subject?: string;
    level?: string;
    pipelineRunId?: string;
}) {
    const context = await getUnusedContext('homework', params.subject, params.level);
    if (!context) throw new Error(`No unused context for ${params.subject || 'ANY'} ${params.level || 'ANY'}`);

    const actualSubject = context.subject;
    const actualLevel = context.level;

    const contextData = JSON.parse(context.content);
    const topic = contextData.homework || contextData.title || actualSubject;

    try {
        const promptStr = homeworkUserPrompt({
            subject: actualSubject,
            level: actualLevel,
            date: contextData.date || new Date().toISOString().split('T')[0],
            homeworkContent: contextData.homework || contextData.content || JSON.stringify(contextData),
        });

        const sysPrompt = homeworkSystemPrompt(actualLevel);
        const result = await callGemini({
            systemPrompt: sysPrompt,
            prompt: promptStr,
            model: 'gemini-flash-latest',
            temperature: 0.7,
            jsonMode: true,
        });

        const parsed = parseAIJson(result.text);

        const example = await saveExample({
            task_type: 'homework',
            subject: actualSubject,
            level: actualLevel,
            mode: '',
            topic,
            context_id: context.id,
            content: parsed,
            system_prompt: sysPrompt,
            user_prompt: promptStr,
            tokens_used: result.tokens.total,
            model_used: result.model,
            pipeline_run_id: params.pipelineRunId || null,
        });

        await tryRegisterCombo({ task_type: 'homework', subject: actualSubject, level: actualLevel, mode: '', topic, example_id: example.id });
        return { example, tokens: result.tokens };
    } catch (e) {
        await revertContextUse('homework', context.id);
        throw e;
    }
}

// --- Flashcard Generator ---
export async function generateFlashcardExample(params: {
    subject?: string;
    level?: string;
    mode: string;
    pipelineRunId?: string;
}) {
    const context = await getUnusedContext('flashcards', params.subject, params.level);
    if (!context) throw new Error(`No unused context for ${params.subject || 'ANY'} ${params.level || 'ANY'}`);

    const actualSubject = context.subject;
    const actualLevel = context.level;

    const contextData = JSON.parse(context.content);
    const topic = contextData.title || actualSubject;

    try {
        const promptStr = flashcardsUserPrompt({
            subject: actualSubject,
            level: actualLevel,
            mode: params.mode,
            context: contextData.content || JSON.stringify(contextData),
        });

        const sysPrompt = flashcardsSystemPrompt(actualLevel);
        const result = await callGemini({
            systemPrompt: sysPrompt,
            prompt: promptStr,
            model: 'gemini-flash-latest',
            temperature: 0.7,
            jsonMode: true,
        });

        const parsed = parseAIJson(result.text);

        const example = await saveExample({
            task_type: 'flashcards',
            subject: actualSubject,
            level: actualLevel,
            mode: params.mode,
            topic,
            context_id: context.id,
            content: parsed,
            system_prompt: sysPrompt,
            user_prompt: promptStr,
            tokens_used: result.tokens.total,
            model_used: result.model,
            pipeline_run_id: params.pipelineRunId || null,
        });

        await tryRegisterCombo({ task_type: 'flashcards', subject: actualSubject, level: actualLevel, mode: params.mode, topic, example_id: example.id });
        return { example, tokens: result.tokens };
    } catch (e) {
        await revertContextUse('flashcards', context.id);
        throw e;
    }
}

// --- Revision Sheet Generator ---
export async function generateRevisionExample(params: {
    subject?: string;
    level?: string;
    length: string;
    pipelineRunId?: string;
}) {
    const context = await getUnusedContext('revision', params.subject, params.level);
    if (!context) throw new Error(`No unused context for ${params.subject || 'ANY'} ${params.level || 'ANY'}`);

    const actualSubject = context.subject;
    const actualLevel = context.level;

    const contextData = JSON.parse(context.content);
    const topic = contextData.title || actualSubject;

    try {
        const promptStr = revisionUserPrompt({
            length: params.length,
            subject: actualSubject,
            level: actualLevel,
            context: contextData.content || JSON.stringify(contextData),
        });

        const sysPrompt = revisionSystemPrompt(actualLevel);
        const result = await callGemini({
            systemPrompt: sysPrompt,
            prompt: promptStr,
            model: 'gemini-flash-latest',
            temperature: 0.7,
            jsonMode: true,
        });

        const parsed = parseAIJson(result.text);

        const example = await saveExample({
            task_type: 'revision',
            subject: actualSubject,
            level: actualLevel,
            mode: params.length,
            topic,
            context_id: context.id,
            content: parsed,
            system_prompt: sysPrompt,
            user_prompt: promptStr,
            tokens_used: result.tokens.total,
            model_used: result.model,
            pipeline_run_id: params.pipelineRunId || null,
        });

        await tryRegisterCombo({ task_type: 'revision', subject: actualSubject, level: actualLevel, mode: params.length, topic, example_id: example.id });
        return { example, tokens: result.tokens };
    } catch (e) {
        await revertContextUse('revision', context.id);
        throw e;
    }
}

export async function generateTutorExample(params: {
    subject?: string;
    level?: string;
    pipelineRunId?: string;
}) {
    const context = await getUnusedContext('tutor', params.subject, params.level);
    if (!context) throw new Error(`No unused context for ${params.subject || 'ANY'} ${params.level || 'ANY'}`);

    const actualSubject = context.subject;
    const actualLevel = context.level;

    const contextData = JSON.parse(context.content);
    const topic = contextData.title || actualSubject;

    try {
        const tutorSys = tutorSystemPrompt(actualSubject, actualLevel);
        const studentSys = tutorStudentSystemPrompt(actualSubject, actualLevel);
        const contextText = contextData.content || JSON.stringify(contextData);
        const conversation: Array<{ role: string; content: string }> = [];

        // Turn 1: Student poses a hesitant question with typical error
        const studentT1 = await callGemini({
            systemPrompt: studentSys,
            prompt: `Contexte du cours : ${contextText}\n\nPose une question hésitante sur ce cours, avec une erreur typique de ton niveau.`,
            model: 'gemini-flash-latest',
            temperature: 0.9,
            jsonMode: false,
        });
        conversation.push({ role: 'user', content: studentT1.text });

        // Turn 2: Tutor guides with a question
        const tutorT2 = await callGemini({
            systemPrompt: tutorSys,
            messages: [{ role: 'user', content: studentT1.text }],
            model: 'gemini-flash-latest',
            temperature: 0.7,
            jsonMode: false,
        });
        conversation.push({ role: 'assistant', content: tutorT2.text });

        // Turn 3: Student partially corrects
        const studentT3 = await callGemini({
            systemPrompt: studentSys,
            messages: [
                { role: 'model', content: studentT1.text },
                { role: 'user', content: tutorT2.text },
            ],
            prompt: 'Corrige partiellement ton erreur grâce à la question du tuteur.',
            model: 'gemini-flash-latest',
            temperature: 0.9,
            jsonMode: false,
        });
        conversation.push({ role: 'user', content: studentT3.text });

        // Turn 4: Tutor confirms and consolidates
        const tutorT4 = await callGemini({
            systemPrompt: tutorSys,
            messages: [
                { role: 'user', content: studentT1.text },
                { role: 'model', content: tutorT2.text },
                { role: 'user', content: studentT3.text },
            ],
            model: 'gemini-flash-latest',
            temperature: 0.7,
            jsonMode: false,
        });
        conversation.push({ role: 'assistant', content: tutorT4.text });

        const totalTokens = studentT1.tokens.total + tutorT2.tokens.total + studentT3.tokens.total + tutorT4.tokens.total;

        const example = await saveExample({
            task_type: 'tutor',
            subject: actualSubject,
            level: actualLevel,
            mode: '',
            topic,
            context_id: context.id,
            content: { conversation },
            system_prompt: tutorSys,
            user_prompt: conversation[0].content,
            tokens_used: totalTokens,
            model_used: 'gemini-flash-latest',
            pipeline_run_id: params.pipelineRunId || null,
        });

        await tryRegisterCombo({ task_type: 'tutor', subject: actualSubject, level: actualLevel, mode: '', topic, example_id: example.id });
        return { example, tokens: { total: totalTokens, prompt: 0, response: 0 } };
    } catch (e) {
        await revertContextUse('tutor', context.id);
        throw e;
    }
}

// ============================================================
// PHASE 3: JUDGE (LLM-as-a-Judge)
// ============================================================

async function _performJudgment(lockedEx: any) {
    try {
        const prompt = `DONNÉE À ÉVALUER :\n${JSON.stringify(lockedEx.content, null, 2)}`;
        const sysPrompt = judgeSystemPrompt(lockedEx.task_type, lockedEx.level, lockedEx.subject, lockedEx.mode || '');

        const result = await callGemini({
            systemPrompt: sysPrompt,
            prompt,
            model: 'gemini-flash-latest',
            temperature: 0.3,
        });

        const verdict = JSON.parse(result.text);
        const score = verdict.note || 0;
        const isGold = score >= JUDGE_THRESHOLD;

        // Save judgment
        await supabaseAdmin.from('judgments').insert([{
            example_id: lockedEx.id,
            score,
            is_gold: isGold,
            reason: verdict.raison || '',
            criteria: verdict,
            tokens_used: result.tokens.total,
        }]);

        // Update example with final scores
        await supabaseAdmin
            .from('examples')
            .update({ is_judged: true, judge_score: score, is_gold: isGold })
            .eq('id', lockedEx.id);

        return { score, isGold, reason: verdict.raison, tokens: result.tokens };
    } catch (e) {
        // Rollback lock if Gemini fails
        await supabaseAdmin.from('examples').update({ is_judged: false, judge_score: null }).eq('id', lockedEx.id);
        throw e;
    }
}

export async function judgeExample(exampleId: string) {
    const { data: locked, error: lockError } = await supabaseAdmin
        .from('examples')
        .update({ is_judged: true, judge_score: -1 })
        .eq('id', exampleId)
        .eq('is_judged', false)
        .select('*')
        .single();

    if (lockError || !locked) {
        throw new Error('Example is already judged or locked by another thread');
    }

    return await _performJudgment(locked);
}

export async function judgeUnjudgedBatch(limit: number = 10) {
    let gold = 0, rejected = 0;
    const results = [];

    for (let i = 0; i < limit; i++) {
        let lockedEx = null;
        // Atomic lock attempt pool
        for (let attempts = 0; attempts < 5; attempts++) {
            const { data } = await supabaseAdmin.from('examples').select('id').eq('is_judged', false).limit(100);
            if (!data || data.length === 0) break;
            
            const targetId = data[Math.floor(Math.random() * data.length)].id;
            
            const { data: locked } = await supabaseAdmin
                .from('examples')
                .update({ is_judged: true, judge_score: -1 }) // lock!
                .eq('id', targetId)
                .eq('is_judged', false)
                .select('*')
                .single();
                
            if (locked) {
                lockedEx = locked;
                break;
            }
        }

        if (!lockedEx) break; // No more available unjudged examples

        try {
            const result = await _performJudgment(lockedEx);
            if (result.isGold) gold++;
            else rejected++;
            results.push(result);
        } catch (e: any) {
            console.error(`Judge error for ${lockedEx.id}:`, e.message);
        }
    }

    return { judged: results.length, gold, rejected, results };
}

export async function overrideJudgeScore(judgmentId: string, exampleId: string, newScore: number) {
    const isGold = newScore >= 9; // JUDGE_THRESHOLD equivalent
    
    // Update Judgment
    await supabaseAdmin
        .from('judgments')
        .update({ 
            score: newScore, 
            is_gold: isGold,
            reason: "Manuel : Note corrigée par l'administrateur humain."
        })
        .eq('id', judgmentId);

    // Update Example
    await supabaseAdmin
        .from('examples')
        .update({ 
            judge_score: newScore, 
            is_gold: isGold 
        })
        .eq('id', exampleId);
}

export async function getRecentJudgments(limit: number = 20) {
    const { data: judgments, error } = await supabaseAdmin
        .from('judgments')
        .select(`
            id, score, is_gold, reason, created_at, example_id,
            examples ( id, task_type, subject, level, content )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);
        
        
    if (error) console.error("Error fetching judgments:", error);
    return judgments || [];
}

// ============================================================
// AUTOPILOT — INTELLIGENT AUTO-COMPLETION
// ============================================================

interface AutopilotCycleResult {
    phase: 'context' | 'generate' | 'judge' | 'done';
    taskType: string;
    generated: number;
    judged: number;
    gold: number;
    contextsMade: number;
    tokensUsed: number;
    errors: string[];
    stats: { total: number; gold: number; unjudged: number; byTask: Record<string, { total: number; gold: number }> };
}

/**
 * A single Autopilot cycle. Called repeatedly by the frontend.
 * Each cycle:
 * 1. Gets current stats
 * 2. If unjudged examples > threshold → judge them first
 * 3. Otherwise, pick the most "behind" task type and generate a batch
 * 4. Auto-generate contexts if running low
 */
export async function runAutopilotCycle(concurrency: number = 5, ignoreTargets: boolean = false, allowedTasks?: string[]): Promise<AutopilotCycleResult> {
    const errors: string[] = [];
    let generated = 0, judged = 0, goldCount = 0, contextsMade = 0, tokensUsed = 0;

    // 1. Get current stats
    const { data: rawStats } = await supabaseAdmin.rpc('get_dashboard_stats_rpc');
    const stats = rawStats || { total_examples: 0, gold_examples: 0, judged_examples: 0, by_task: {} };
    const unjudged = (stats.total_examples || 0) - (stats.judged_examples || 0);

    const currentByTask = stats.by_task || {};
    const targets: Record<string, number> = {
        quiz: DATASET_TARGETS.quiz.count,
        tutor: DATASET_TARGETS.tutor.count,
        flashcards: DATASET_TARGETS.flashcards.count,
        revision: DATASET_TARGETS.revision.count,
        homework: DATASET_TARGETS.homework.count,
    };

    const activeTargets = allowedTasks && allowedTasks.length > 0 
        ? Object.fromEntries(Object.entries(targets).filter(([k]) => allowedTasks.includes(k)))
        : targets;

    const resultStats = {
        total: stats.total_examples || 0,
        gold: stats.gold_examples || 0,
        unjudged,
        byTask: currentByTask,
    };

    // Check if we're done
    if (!ignoreTargets && (stats.gold_examples || 0) >= TOTAL_TARGET) {
        return { phase: 'done', taskType: '-', generated: 0, judged: 0, gold: 0, contextsMade: 0, tokensUsed: 0, errors: [], stats: resultStats };
    }

    // 2. JUDGE PHASE — if unjudged examples accumulate, trigger a batch judgment wave.
    // We use a threshold of 15 to prevent multiple PCs from aggressively fighting over single
    // examples (1-by-1 ping-pong) as soon as they are generated.
    if (unjudged >= 15) {
        const batchSize = Math.min(unjudged, concurrency * 4);
        const judgeResults = await _autopilotJudgeBatch(batchSize, concurrency);
        return {
            phase: 'judge',
            taskType: 'judge',
            generated: 0,
            judged: judgeResults.judged,
            gold: judgeResults.gold,
            contextsMade: 0,
            tokensUsed: judgeResults.tokens,
            errors: judgeResults.errors,
            stats: resultStats,
        };
    }

    // 3. PRIORITIZE — find the task type most "behind" its GOLD target
    let bestTask = Object.keys(activeTargets)[0] || 'quiz';
    let bestDeficit = -Infinity;
    const skippedTasks: string[] = [];
    for (const [task, target] of Object.entries(activeTargets)) {
        const goldForTask = currentByTask[task]?.gold || 0;
        if (!ignoreTargets && goldForTask >= target) {
            skippedTasks.push(task);
            continue; // Task completed — skip it entirely
        }
        
        let deficit = (target - goldForTask) / target; // 0..1, higher = more behind
        // If ignoreTargets acts dynamically and it exceeded target, base selection on least amount to keep balance
        if (ignoreTargets && goldForTask >= target) {
            deficit = -goldForTask;
        }

        if (deficit > bestDeficit) {
            bestDeficit = deficit;
            bestTask = task;
        }
    }

    // If all tasks are complete, just judge remaining
    if (!ignoreTargets && bestDeficit <= 0) {
        if (unjudged > 0) {
            const judgeResults = await _autopilotJudgeBatch(unjudged, concurrency);
            return { phase: 'judge', taskType: 'judge', generated: 0, judged: judgeResults.judged, gold: judgeResults.gold, contextsMade: 0, tokensUsed: judgeResults.tokens, errors: judgeResults.errors, stats: resultStats };
        }
        return { phase: 'done', taskType: '-', generated: 0, judged: 0, gold: 0, contextsMade: 0, tokensUsed: 0, errors: [], stats: resultStats };
    }

    // 4. CONTEXT CHECK — generate contexts if low
    let usedColumn = 'is_used';
    if (bestTask === 'quiz') usedColumn = 'used_quiz';
    else if (bestTask === 'homework') usedColumn = 'used_homework';
    else if (bestTask === 'flashcards') usedColumn = 'used_flashcards';
    else if (bestTask === 'revision') usedColumn = 'used_revision';
    else if (bestTask === 'tutor') usedColumn = 'used_tutor';

    const { count: unusedCtxCount } = await supabaseAdmin
        .from('contexts')
        .select('id', { count: 'exact', head: true })
        .eq(usedColumn, false);

    if ((unusedCtxCount || 0) < 50) {
        // Generate contexts for a random level/subject combo
        const levels = [...STUDENT_LEVELS];
        const level = levels[Math.floor(Math.random() * levels.length)];
        const subjects = SUBJECTS_BY_LEVEL[level] || [];
        const subject = subjects[Math.floor(Math.random() * subjects.length)];
        const style = CONTEXT_STYLES[Math.floor(Math.random() * CONTEXT_STYLES.length)];
        
        try {
            const ctxResult = await generateContexts({ subject, level, count: 5, style });
            contextsMade = ctxResult.contexts.length;
            tokensUsed += ctxResult.tokens.total;
        } catch (e: any) {
            errors.push(`Context gen error: ${e.message}`);
        }

        return { phase: 'context', taskType: bestTask, generated: 0, judged: 0, gold: 0, contextsMade, tokensUsed, errors, stats: resultStats };
    }

    // 5. GENERATE PHASE — generate a batch for the priority task
    const batchSize = concurrency * 2; // Generate 2 per thread
    const generatePromises: Promise<any>[] = [];

    for (let i = 0; i < batchSize; i++) {
        const level = undefined;
        const subject = undefined;

        let mode = '';
        if (bestTask === 'quiz') mode = QUIZ_MODES[Math.floor(Math.random() * QUIZ_MODES.length)];
        if (bestTask === 'flashcards') mode = FLASHCARD_MODES[Math.floor(Math.random() * FLASHCARD_MODES.length)];
        if (bestTask === 'revision') mode = REVISION_LENGTHS[Math.floor(Math.random() * REVISION_LENGTHS.length)];

        const gen = (async () => {
            try {
                let result: any;
                switch (bestTask) {
                    case 'quiz': result = await generateQuizExample({ subject, level, mode }); break;
                    case 'homework': result = await generateHomeworkExample({ subject, level }); break;
                    case 'flashcards': result = await generateFlashcardExample({ subject, level, mode }); break;
                    case 'revision': result = await generateRevisionExample({ subject, level, length: mode }); break;
                    case 'tutor': result = await generateTutorExample({ subject, level }); break;
                }
                return { success: true, tokens: result?.tokens?.total || 0 };
            } catch (e: any) {
                if (!e.message?.includes('No unused context') && !e.message?.includes('Combo already used')) {
                    errors.push(`[${bestTask}] ${e.message?.substring(0, 80)}`);
                }
                return { success: false, tokens: 0 };
            }
        })();

        generatePromises.push(gen);

        // Throttle: wait when we hit concurrency limit
        if (generatePromises.length >= concurrency) {
            const batch = await Promise.all(generatePromises.splice(0, concurrency));
            for (const r of batch) {
                if (r.success) generated++;
                tokensUsed += r.tokens;
            }
        }
    }

    // Drain remaining
    if (generatePromises.length > 0) {
        const batch = await Promise.all(generatePromises);
        for (const r of batch) {
            if (r.success) generated++;
            tokensUsed += r.tokens;
        }
    }

    return { phase: 'generate', taskType: bestTask, generated, judged: 0, gold: 0, contextsMade: 0, tokensUsed, errors, stats: resultStats };
}

/**
 * Internal: Judge a batch of unjudged examples with concurrency.
 */
async function _autopilotJudgeBatch(limit: number, concurrency: number) {
    let judgedCount = 0, goldCount = 0, totalTokens = 0;
    const errors: string[] = [];

    // Collect IDs to judge
    const { data: candidates } = await supabaseAdmin
        .from('examples')
        .select('id')
        .eq('is_judged', false)
        .limit(limit);

    if (!candidates || candidates.length === 0) {
        return { judged: 0, gold: 0, tokens: 0, errors: [] };
    }

    // Process in concurrent batches
    const queue = [...candidates];
    const workers = Array(Math.min(concurrency, queue.length)).fill(null).map(async () => {
        while (queue.length > 0) {
            const item = queue.shift();
            if (!item) break;

            try {
                // Atomic lock
                const { data: locked } = await supabaseAdmin
                    .from('examples')
                    .update({ is_judged: true, judge_score: -1 })
                    .eq('id', item.id)
                    .eq('is_judged', false)
                    .select('*')
                    .single();

                if (!locked) continue; // Already locked by another

                const result = await _performJudgment(locked);
                judgedCount++;
                if (result.isGold) goldCount++;
                totalTokens += result.tokens?.total || 0;

                // Smart Throttle: Gemini Pro limits to 150 Requests Per Minute (2.5 RPS).
                // Judgments are so fast (~1.5s) that 5 concurrent threads = ~200 RPM -> crash/fallback.
                // Adding 600ms sleep guarantees: (1.5s + 0.6s) * 5 threads = 142 RPM max!
                // This keeps ALL judgments on the PRO model without triggering limits.
                await new Promise(r => setTimeout(r, 600));
            } catch (e: any) {
                errors.push(`Judge: ${e.message?.substring(0, 60)}`);
            }
        }
    });

    await Promise.all(workers);
    return { judged: judgedCount, gold: goldCount, tokens: totalTokens, errors };
}

// ============================================================
// STATISTICS & QUERIES
// ============================================================

export async function getDashboardStats() {
    const { data: stats, error } = await supabaseAdmin.rpc('get_dashboard_stats_rpc');
    if (error) {
        console.error("RPC error:", error);
        return {
            totalExamples: 0, goldExamples: 0, judgedExamples: 0, unjudgedExamples: 0,
            totalContexts: 0, unusedContexts: 0, usedCombinations: 0, totalTokens: 0,
            estimatedCost: 0, avgScore: 0, byTask: {}
        };
    }

    const {
        total_examples,
        gold_examples,
        judged_examples,
        example_tokens,
        judgment_tokens,
        total_contexts,
        unused_contexts,
        used_combinations,
        avg_score,
        by_task
    } = stats as any;

    const BASE_CONTEXT_TOKENS = 8_000_000;
    const totalTokens = (example_tokens || 0) + (judgment_tokens || 0) + BASE_CONTEXT_TOKENS;

    return {
        totalExamples: total_examples || 0,
        goldExamples: gold_examples || 0,
        judgedExamples: judged_examples || 0,
        unjudgedExamples: (total_examples || 0) - (judged_examples || 0),
        totalContexts: total_contexts || 0,
        unusedContexts: unused_contexts || 0,
        usedCombinations: used_combinations || 0,
        totalTokens,
        estimatedCost: (totalTokens / 1000000) * 2.50,
        estimatedCo2Grams: (totalTokens / 1000000) * 100, // Roughly 100g CO2 / 1M tokens
        avgScore: avg_score || 0,
        byTask: by_task || {}
    };
}

export async function getContexts(filters?: {
    isUsed?: boolean;
    subject?: string;
    level?: string;
    limit?: number;
}) {
    let query = supabaseAdmin
        .from('contexts')
        .select('*')
        .order('created_at', { ascending: false });

    if (filters?.isUsed !== undefined) query = query.eq('is_used', filters.isUsed);
    if (filters?.subject) query = query.eq('subject', filters.subject);
    if (filters?.level) query = query.eq('level', filters.level);
    query = query.limit(filters?.limit || 100);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
}

export async function deleteContext(id: string) {
    const { error } = await supabaseAdmin.from('contexts').delete().eq('id', id);
    if (error) throw new Error(error.message);
}

export async function getExamples(filters?: {
    taskType?: string;
    isGold?: boolean;
    isJudged?: boolean;
    subject?: string;
    level?: string;
    limit?: number;
}) {
    let query = supabaseAdmin
        .from('examples')
        .select('*')
        .order('created_at', { ascending: false });

    if (filters?.taskType) query = query.eq('task_type', filters.taskType);
    if (filters?.isGold !== undefined) query = query.eq('is_gold', filters.isGold);
    if (filters?.isJudged !== undefined) query = query.eq('is_judged', filters.isJudged);
    if (filters?.subject) query = query.eq('subject', filters.subject);
    if (filters?.level) query = query.eq('level', filters.level);
    query = query.limit(filters?.limit || 100);

    const { data, error } = await query;
    if (error) return [];
    return data;
}

export async function deleteExample(id: string) {
    const { error } = await supabaseAdmin.from('examples').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
}

// ============================================================
// EXPORT JSONL (ChatML format)
// ============================================================

export async function exportGoldDataJSONL() {
    const { data: examples } = await supabaseAdmin
        .from('examples')
        .select('*')
        .eq('is_gold', true);

    if (!examples || examples.length === 0) return { jsonl: '', count: 0 };

    const lines = examples.map(ex => {
        const systemContent = ex.system_prompt || '';
        let userContent = '';
        let assistantContent = '';

        if (ex.task_type === 'tutor' && ex.content?.conversation) {
            // Multi-turn: flatten the conversation
            const messages = [{ role: 'system' as const, content: systemContent }];
            for (const turn of ex.content.conversation) {
                messages.push({ role: turn.role as any, content: turn.content });
            }
            return JSON.stringify({ messages });
        } else {
            // Single-turn: system + user + assistant
            userContent = ex.user_prompt || `Génère pour: ${ex.subject} (${ex.level})`;
            assistantContent = JSON.stringify(ex.content);
            return JSON.stringify({
                messages: [
                    { role: 'system', content: systemContent },
                    { role: 'user', content: userContent },
                    { role: 'assistant', content: assistantContent },
                ]
            });
        }
    });

    return { jsonl: lines.join('\n'), count: lines.length };
}
