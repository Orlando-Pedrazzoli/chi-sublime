// 📄 src/app/api/upload/route.ts
/**
 * Chi Sublime — Upload de imagens (Cloudinary)
 * ============================================================
 *
 * POST multipart/form-data:
 *   - file:   a imagem (máx. 8 MB, apenas image/*)
 *   - folder: 'team' | 'services' | 'general'
 *
 * Segurança: apenas administradores autenticados. As credenciais
 * Cloudinary vivem no servidor — o browser nunca as vê.
 *
 * Resposta: { url, publicId } — o url (secure_url, CDN) é o que
 * se grava no MongoDB (Staff.photo / Service.image).
 */

import { NextResponse } from 'next/server';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_FOLDERS = new Set(['team', 'services', 'general']);

export async function POST(request: Request) {
  // 1) Só admins
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // 2) Cloudinary configurado?
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: 'Upload de imagens não configurado no servidor' },
      { status: 503 },
    );
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

  // 3) Ler e validar o ficheiro
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Ficheiro em falta' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Apenas imagens são permitidas' }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Imagem demasiado grande (máx. 8 MB)' }, { status: 413 });
  }

  const sub = String(form.get('folder') ?? 'general');
  const folder = ALLOWED_FOLDERS.has(sub) ? sub : 'general';
  const baseFolder = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER || 'chi-sublime';

  // 4) Upload
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `${baseFolder}/${folder}`,
          resource_type: 'image',
          // Normalização: limita a 1600px e serve formato/qualidade autos
          transformation: [{ width: 1600, height: 1600, crop: 'limit' }],
        },
        (err, res) => (err || !res ? reject(err) : resolve(res)),
      );
      stream.end(buffer);
    });

    return NextResponse.json({ url: result.secure_url, publicId: result.public_id });
  } catch (err) {
    console.error('[api/upload]', err);
    return NextResponse.json({ error: 'Falha no upload. Tenta novamente.' }, { status: 502 });
  }
}
