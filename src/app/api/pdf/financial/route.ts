// 📄 src/app/api/pdf/financial/route.ts
import { getFinancialReportAction } from '@/lib/server-actions/reports';
import { renderFinancialReportPdf } from '@/lib/pdf/generate';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!from || !to) return new Response('Parâmetros from/to em falta.', { status: 400 });

  const res = await getFinancialReportAction({ from, to });
  if (!res.success) {
    const status = res.error.code === 'unauthorized' ? 401 : 400;
    return new Response(res.error.message, { status });
  }

  const d = res.data;
  const pdf = await renderFinancialReportPdf({
    periodLabel: d.periodLabel,
    generatedAt: new Date(),
    totalIncome: d.totalIncome,
    totalExpense: d.totalExpense,
    net: d.net,
    vatCollected: d.vatCollected,
    vatPaid: d.vatPaid,
    incomeByCategory: d.incomeByCategory,
    expenseByCategory: d.expenseByCategory,
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="relatorio-financeiro-${from}_${to}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
