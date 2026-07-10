// 📄 src/lib/pdf/templates/CashRegisterReport.tsx
/**
 * Chi Sublime — PDF: Fecho de Caixa
 * ============================================================
 *
 * Resumo do dia: fundo de abertura, entradas/saídas por método de
 * pagamento, esperado vs contado e diferença. Valores em cêntimos.
 * Documento de gestão interna.
 */

import * as React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { SALON_CONTACT_FALLBACK } from '@/lib/constants/business';
import { pdfColors, fmtMoney, fmtDate, fmtDateTime } from './_theme';

export interface MethodRow {
  label: string;
  value: number; // cêntimos
}

export interface CashRegisterReportData {
  date: Date;
  generatedAt: Date;
  openingCash: number;
  incomeByMethod: MethodRow[];
  expenseByMethod: MethodRow[];
  totalIncome: number;
  totalExpense: number;
  expectedCash: number;
  closingCash: number;
  difference: number;
  differenceReason?: string;
  closed: boolean;
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
  sub: { fontSize: 10, color: pdfColors.muted, marginTop: 2, marginBottom: 6 },
  badge: { fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 14 },
  section: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: pdfColors.green,
    marginTop: 10,
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
  cLabel: { flex: 1 },
  cVal: { width: 110, textAlign: 'right' },
  bold: { fontFamily: 'Helvetica-Bold' },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: pdfColors.green,
  },
  summary: { marginTop: 18, borderWidth: 0.5, borderColor: pdfColors.line, borderRadius: 4 },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: pdfColors.line,
  },
  sumRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  reason: { marginTop: 10, fontSize: 9, color: pdfColors.muted },
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

function MethodTable({ rows, total }: { rows: MethodRow[]; total: number }) {
  return (
    <View>
      <View style={s.tHead}>
        <Text style={[s.cLabel, s.bold]}>Método</Text>
        <Text style={[s.cVal, s.bold]}>Valor</Text>
      </View>
      {rows.map((r, i) => (
        <View style={s.tRow} key={`${r.label}-${i}`}>
          <Text style={s.cLabel}>{r.label}</Text>
          <Text style={s.cVal}>{fmtMoney(r.value)}</Text>
        </View>
      ))}
      <View style={s.totalLine}>
        <Text style={s.bold}>Total</Text>
        <Text style={s.bold}>{fmtMoney(total)}</Text>
      </View>
    </View>
  );
}

export function CashRegisterReportPdf(data: CashRegisterReportData) {
  const diffColor = data.difference === 0 ? pdfColors.green : pdfColors.red;
  return (
    <Document title={`Fecho de Caixa ${fmtDate(data.date)}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>{SALON_CONTACT_FALLBACK.name}</Text>
            <Text style={s.brandSub}>Fecho de caixa</Text>
          </View>
          <Text style={s.headRight}>
            Gerado em{'\n'}
            {fmtDateTime(data.generatedAt)}
          </Text>
        </View>

        <Text style={s.title}>Fecho de Caixa</Text>
        <Text style={s.sub}>Dia: {fmtDate(data.date)}</Text>
        <Text style={[s.badge, { color: data.closed ? pdfColors.green : pdfColors.red }]}>
          {data.closed ? 'FECHADA' : 'EM ABERTO'}
        </Text>

        <Text style={s.section}>Entradas por método</Text>
        <MethodTable rows={data.incomeByMethod} total={data.totalIncome} />

        <Text style={s.section}>Saídas por método</Text>
        <MethodTable rows={data.expenseByMethod} total={data.totalExpense} />

        <View style={s.summary}>
          <View style={s.sumRow}>
            <Text>Fundo de abertura</Text>
            <Text>{fmtMoney(data.openingCash)}</Text>
          </View>
          <View style={s.sumRow}>
            <Text>Esperado em caixa</Text>
            <Text style={s.bold}>{fmtMoney(data.expectedCash)}</Text>
          </View>
          <View style={s.sumRow}>
            <Text>Contado (fecho)</Text>
            <Text style={s.bold}>{fmtMoney(data.closingCash)}</Text>
          </View>
          <View style={s.sumRowLast}>
            <Text style={s.bold}>Diferença</Text>
            <Text style={[s.bold, { color: diffColor }]}>{fmtMoney(data.difference)}</Text>
          </View>
        </View>

        {data.differenceReason ? (
          <Text style={s.reason}>Justificação: {data.differenceReason}</Text>
        ) : null}

        <Text style={s.footer} fixed>
          {SALON_CONTACT_FALLBACK.name} · Documento de gestão interna (não fiscal)
        </Text>
      </Page>
    </Document>
  );
}

export default CashRegisterReportPdf;
