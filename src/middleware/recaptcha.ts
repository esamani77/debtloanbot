import { Request, Response, NextFunction } from 'express';

const ENABLED = process.env.RECAPTCHA_ENABLED === 'true';
const SECRET = process.env.RECAPTCHA_SECRET_KEY ?? '';

export async function verifyCaptcha(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!ENABLED) return next();

  const token = req.body?.recaptchaToken as string | undefined;
  if (!token) {
    res.status(400).json({ error: 'CAPTCHA_REQUIRED' });
    return;
  }

  try {
    const params = new URLSearchParams({
      secret: SECRET,
      response: token,
      remoteip: (req.ip ?? ''),
    });

    const googleRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = (await googleRes.json()) as { success: boolean; 'error-codes'?: string[] };

    if (!data.success) {
      res.status(400).json({ error: 'CAPTCHA_FAILED' });
      return;
    }

    next();
  } catch (err) {
    console.error('[recaptcha] verification error:', err);
    res.status(500).json({ error: 'CAPTCHA_ERROR' });
  }
}
