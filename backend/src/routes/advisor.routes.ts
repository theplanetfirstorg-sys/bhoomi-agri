import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { requireSubscription, checkAiQueryLimit } from '../middleware/subscription';
import { chat } from '../ai/advisor';
import { uploadFile } from '../services/storage.service';
import { query, queryOne } from '../db/client';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(requireAuth);

// Get conversation history
router.get('/conversations', async (req: Request, res: Response): Promise<void> => {
  const conversations = await query(
    `SELECT id, title, farm_id, crop_id, ai_query_count, created_at, updated_at
     FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 50`,
    [req.user!.userId]
  );
  res.json({ conversations });
});

router.get('/conversations/:id', async (req: Request, res: Response): Promise<void> => {
  const conv = await queryOne(
    'SELECT * FROM conversations WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user!.userId]
  );
  if (!conv) { res.status(404).json({ error: 'Conversation not found' }); return; }
  res.json({ conversation: conv });
});

// Send message to AI advisor
router.post(
  '/chat',
  requireSubscription,
  checkAiQueryLimit,
  upload.array('attachments', 3),
  async (req: Request, res: Response): Promise<void> => {
    const { message, conversationId, farmId, cropId } = req.body;
    if (!message?.trim()) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const files = req.files as Express.Multer.File[];
    const attachments: Array<{ type: 'image' | 'pdf'; url: string; filename: string }> = [];

    for (const file of files ?? []) {
      const isImage = file.mimetype.startsWith('image/');
      const isPdf = file.mimetype === 'application/pdf';
      if (!isImage && !isPdf) continue;

      try {
        const url = await uploadFile(
          file.buffer,
          `conversations/${req.user!.userId}/${Date.now()}-${file.originalname}`,
          file.mimetype
        );
        attachments.push({ type: isImage ? 'image' : 'pdf', url, filename: file.originalname });
      } catch {
        // If upload fails, continue without attachment
      }
    }

    try {
      const result = await chat({
        userId: req.user!.userId,
        conversationId,
        farmId,
        cropId,
        message: message.trim(),
        attachments,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'AI advisor unavailable', detail: err instanceof Error ? err.message : 'Unknown' });
    }
  }
);

export default router;
