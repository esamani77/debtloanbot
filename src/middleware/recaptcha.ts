import { Request, Response, NextFunction } from 'express';
import https from 'node:https';

const ENABLED = process.env.RECAPTCHA_ENABLED === 'true';
const SECRET = process.env.RECAPTCHA_SECRET_KEY ?? '';
const MIN_SCORE = parseFloat(process.env.RECAPTCHA_MIN_SCORE ?? '0.5');

interface RecaptchaVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  'error-codes'?: string[];
}

function postForm(url: string, body: string): Promise<RecaptchaVerifyResponse> {
  return new Promise((resolve, reject) => {
    const { hostname, pathname } = new URL(url);
    const req = https.request(
      {
        hostname,
        path: pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk: Buffer) => { raw += chunk.toString(); });
        res.on('end', () => {
          try { resolve(JSON.parse(raw) as RecaptchaVerifyResponse); }
          catch (e) { reject(e); }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

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
      remoteip: req.ip ?? '',
    });

    const data = await postForm(
      'https://www.google.com/recaptcha/api/siteverify',
      params.toString()
    );

    if (!data.success || (data.score !== undefined && data.score < MIN_SCORE)) {
      res.status(400).json({ error: 'CAPTCHA_FAILED' });
      return;
    }

    next();
  } catch (err) {
    console.error('[recaptcha] verification error:', err);
    res.status(500).json({ error: 'CAPTCHA_ERROR' });
  }
}
