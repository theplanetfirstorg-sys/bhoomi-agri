import Anthropic from '@anthropic-ai/sdk';
import { buildFarmContext, buildSystemPrompt } from './context';
import { query, queryOne } from '../db/client';
import { ConversationMessage } from '../types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';

interface ChatOptions {
  userId: string;
  conversationId?: string;
  farmId?: string;
  cropId?: string;
  message: string;
  attachments?: Array<{ type: 'image' | 'pdf'; url: string; filename: string }>;
}

interface ChatResult {
  conversationId: string;
  response: string;
}

export async function chat(options: ChatOptions): Promise<ChatResult> {
  const { userId, message, attachments = [] } = options;

  // Build farm context + system prompt
  const ctx = await buildFarmContext(userId, options.farmId);
  const systemPrompt = buildSystemPrompt(ctx);

  // Load or create conversation
  let conversation = options.conversationId
    ? await queryOne<{ id: string; messages: ConversationMessage[]; ai_query_count: number }>(
        'SELECT id, messages, ai_query_count FROM conversations WHERE id = $1 AND user_id = $2',
        [options.conversationId, userId]
      )
    : null;

  if (!conversation) {
    const created = await queryOne<{ id: string; messages: ConversationMessage[]; ai_query_count: number }>(
      `INSERT INTO conversations (user_id, farm_id, crop_id, messages, ai_query_count)
       VALUES ($1, $2, $3, '[]'::jsonb, 0) RETURNING id, messages, ai_query_count`,
      [userId, options.farmId ?? null, options.cropId ?? null]
    );
    conversation = created!;
  }

  const history = (conversation.messages as ConversationMessage[]) ?? [];

  // Build message content — handle attachments
  const userContent: Anthropic.MessageParam['content'] = [];

  for (const attachment of attachments) {
    if (attachment.type === 'image') {
      // Fetch image from S3 as base64
      try {
        const res = await fetch(attachment.url);
        const buf = await res.arrayBuffer();
        const base64 = Buffer.from(buf).toString('base64');
        const mediaType = attachment.filename.match(/\.png$/i) ? 'image/png'
          : attachment.filename.match(/\.gif$/i) ? 'image/gif'
          : attachment.filename.match(/\.webp$/i) ? 'image/webp'
          : 'image/jpeg';
        userContent.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } });
      } catch {
        userContent.push({ type: 'text', text: `[Image attached: ${attachment.filename}]` });
      }
    } else if (attachment.type === 'pdf') {
      userContent.push({ type: 'text', text: `[Soil report PDF attached: ${attachment.filename}. Please extract and interpret all soil nutrient values.]` });
    }
  }

  userContent.push({ type: 'text', text: message });

  // Build messages array for Claude
  const claudeMessages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: userContent },
  ];

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: claudeMessages,
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
      } as Anthropic.Tool,
    ],
  });

  const assistantText = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  // Persist conversation
  const userMsg: ConversationMessage = {
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
    attachments: attachments.length > 0 ? attachments : undefined,
  };

  const assistantMsg: ConversationMessage = {
    role: 'assistant',
    content: assistantText,
    timestamp: new Date().toISOString(),
  };

  const updatedMessages = [...history, userMsg, assistantMsg];

  await query(
    `UPDATE conversations
     SET messages = $2::jsonb, ai_query_count = ai_query_count + 1,
         title = CASE WHEN title IS NULL THEN $3 ELSE title END
     WHERE id = $1`,
    [
      conversation.id,
      JSON.stringify(updatedMessages),
      message.slice(0, 80),
    ]
  );

  return { conversationId: conversation.id, response: assistantText };
}

// ─── Care Plan Generation ─────────────────────────────────────────────────────

export async function generateCarePlan(cropData: {
  cropType: string;
  variety: string | null;
  plantingDate: string | null;
  growingMethod: string;
  goal: string;
  plotArea: string;
  sunExposure: string | null;
  irrigation: string | null;
  soilPh: number | null;
  farmerLocation: string;
}): Promise<string> {
  const prompt = `Generate a complete, structured care plan for:
- Crop: ${cropData.cropType}${cropData.variety ? ` (${cropData.variety})` : ''}
- Planted: ${cropData.plantingDate ?? 'recently'}
- Growing method: ${cropData.growingMethod}
- Goal: ${cropData.goal}
- Plot: ${cropData.plotArea}, ${cropData.sunExposure ?? 'unknown exposure'}
- Irrigation: ${cropData.irrigation ?? 'unknown'}
- Soil pH: ${cropData.soilPh ?? 'unknown'}
- Location: ${cropData.farmerLocation}, Sri Lanka

Return a JSON object with this exact structure:
{
  "watering_schedule": [{ "day": 1, "frequency": "daily", "amount_liters": 2, "time_of_day": "morning", "notes": "..." }],
  "fertiliser_schedule": [{ "week": 2, "type": "NPK 10-10-10", "dose": "50g/plant", "method": "soil drench", "notes": "..." }],
  "pest_watch": [{ "pest_or_disease": "...", "risk_period": "week 3-6", "symptoms": "...", "prevention": "...", "treatment": "..." }],
  "alerts": [{ "trigger": "...", "message": "...", "severity": "info|warning|critical", "due_days_from_planting": 14 }],
  "growth_stages": [{ "name": "germination", "start_day": 0, "end_day": 7, "description": "...", "key_tasks": ["..."] }],
  "expected_harvest_days": 90
}

Use Sri Lankan product names and local growing conditions. Be specific and practical.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  // Extract JSON from response
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ?? text.match(/\{[\s\S]*\}/);
  return jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : text;
}
