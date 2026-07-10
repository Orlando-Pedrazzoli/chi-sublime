// 📄 src/lib/pdf/templates/FinancialReport.tsx
/**
 * Chi Sublime — PDF: Relatório Financeiro / IVA
 * ============================================================
 *
 * Resumo de um período: receita, despesa, resultado líquido, IVA
 * (liquidado vs suportado) e detalhe por categoria. Valores em
 * cêntimos. Documento de gestão interna.
 */

import * as React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { SALON_CONTACT_FALLBACK } from '@/lib/constants/business';
import { pdfColors, fmtMoney, fmtDateTime } from './_theme';

export interface ReportCategoryRow {
  name: string;
  amount: number; // cêntimos
}

export interface FinancialReportData {
  periodLabel: string;
  generatedAt: Date;
  totalIncome: number;
  totalExpense: number;
  net: number;
  vatCollected: number;
  vatPaid: number;
  incomeByCategory: ReportCategoryRow[];
  expenseByCategory: ReportCategoryRow[];
}

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: pdfColors.ink, fontFamily: 'Helvetica' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 2,
    borderBottomColor: pdfColors.green,
    paddingBottom: 10,
    marginBottom: 16,
  },
  brand: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: pdfColors.green },
  brandSub: { fontSize: 9, color: pdfColors.muted, marginTop: 2 },
  headRight: { textAlign: 'right', fontSize: 8, color: pdfColors.muted },
  title: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: pdfColors.green },
  period: { fontSize: 10, color: pdfColors.muted, marginTop: 2, marginBottom: 14 },
  cards: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  card: {
    flex: 1,
    padding: 10,
    borderWidth: 0.5,
    borderColor: pdfColors.line,
    backgroundColor: pdfColors.cream,
    borderRadius: 4,
  },
  cardLabel: { fontSize: 8, color: pdfColors.muted, textTransform: 'uppercase' },
  cardValue: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginTop: 4 },
  section: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: pdfColors.green,
    marginTop: 6,
    marginBottom: 6,
  },
  tHead: {
    flexDirection: 'row',
    backgroundColor: pdfColors.sand,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: pdfColors.line,
  },
  cCat: { flex: 1 },
  cAmt: { width: 100, textAlign: 'right' },
  bold: { fontFamily: 'Helvetica-Bold' },
  vatBox: { marginTop: 16, flexDirection: 'row', gap: 10 },
  vatCell: { flex: 1, padding: 8, borderWidth: 0.5, borderColor: pdfColors.line },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: pdfColors.green,
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: pdfColors.muted,
  },
});

function CategoryTable({ rows, total }: { rows: ReportCategoryRow[]; total: number }) {
  return (
    <View>
      <View style={s.tHead}>
        <Text style={[s.cCat, s.bold]}>Categoria</Text>
        <Text style={[s.cAmt, s.bold]}>Valor</Text>
      </View>
      {rows.length === 0 ? (
        <View style={s.tRow}>
          <Text style={[s.cCat, { color: pdfColors.muted }]}>Sem movimentos</Text>
          <Text style={s.cAmt}>{fmtMoney(0)}</Text>
        </View>
      ) : (
        rows.map((r, i) => (
          <View style={s.tRow} key={`${r.name}-${i}`}>
            <Text style={s.cCat}>{r.name}</Text>
            <Text style={s.cAmt}>{fmtMoney(r.amount)}</Text>
          </View>
        ))
      )}
      <View style={s.totalLine}>
        <Text style={s.bold}>Total</Text>
        <Text style={s.bold}>{fmtMoney(total)}</Text>
      </View>
    </View>
  );
}

export function FinancialReportPdf(data: FinancialReportData) {
  const netColor = data.net >= 0 ? pdfColors.green : pdfColors.red;
  return (
    <Document title={`Relatório Financeiro ${data.periodLabel}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>{SALON_CONTACT_FALLBACK.name}</Text>
            <Text style={s.brandSub}>Relatório de gestão</Text>
          </View>
          <Text style={s.headRight}>
            Gerado em{'\n'}
            {fmtDateTime(data.generatedAt)}
          </Text>
        </View>

        <Text style={s.title}>Relatório Financeiro</Text>
        <Text style={s.period}>Período: {data.periodLabel}</Text>

        <View style={s.cards}>
          <View style={s.card}>
            <Text style={s.cardLabel}>Receita</Text>
            <Text style={[s.cardValue, { color: pdfColors.green }]}>
              {fmtMoney(data.totalIncome)}
            </Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardLabel}>Despesa</Text>
            <Text style={[s.cardValue, { color: pdfColors.red }]}>
              {fmtMoney(data.totalExpense)}
            </Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardLabel}>Resultado</Text>
            <Text style={[s.cardValue, { color: netColor }]}>{fmtMoney(data.net)}</Text>
          </View>
        </View>

        <Text style={s.section}>Receita por categoria</Text>
        <CategoryTable rows={data.incomeByCategory} total={data.totalIncome} />

        <Text style={s.section}>Despesa por categoria</Text>
        <CategoryTable rows={data.expenseByCategory} total={data.totalExpense} />

        <View style={s.vatBox}>
          <View style={s.vatCell}>
            <Text style={s.cardLabel}>IVA liquidado (vendas)</Text>
            <Text style={[s.cardValue, { fontSize: 12 }]}>{fmtMoney(data.vatCollected)}</Text>
          </View>
          <View style={s.vatCell}>
            <Text style={s.cardLabel}>IVA suportado (compras)</Text>
            <Text style={[s.cardValue, { fontSize: 12 }]}>{fmtMoney(data.vatPaid)}</Text>
          </View>
          <View style={s.vatCell}>
            <Text style={s.cardLabel}>IVA a entregar</Text>
            <Text style={[s.cardValue, { fontSize: 12 }]}>
              {fmtMoney(data.vatCollected - data.vatPaid)}
            </Text>
          </View>
        </View>

        <Text style={s.footer} fixed>
          {SALON_CONTACT_FALLBACK.name} · Documento de gestão interna (não fiscal)
        </Text>
      </Page>
    </Document>
  );
}

export default FinancialReportPdf;
