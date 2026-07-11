import { NextResponse } from 'next/server';

// Stub — endpoint ainda não implementado (a app usa server-actions).
export async function GET() {
  return NextResponse.json({ error: 'Não implementado' }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ error: 'Não implementado' }, { status: 501 });
}
