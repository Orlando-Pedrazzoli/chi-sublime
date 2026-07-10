// 📄 src/lib/pdf/templates/Receipt.tsx
/**
 * Chi Sublime — PDF: Talão de balcão (NÃO fiscal)
 * ============================================================
 *
 * Comprovativo interno de uma venda. O documento fiscal (fatura-
 * recibo) é emitido pelo Moloni — este talão é só para o cliente/
 * balcão. Traz aviso explícito de que não é documento fiscal.
 */

import * as React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { SALON_CONTACT_FALLBACK } from '@/lib/constants/business';
import { pdfColors, fmtMoney, fmtDateTime, paymentLabel } from './_theme';

export interface ReceiptItem {
  name: string;
  qty: number;
  unitPrice: number; // cêntimos (líquido unitário)
  total: number; // cêntimos (líquido da linha)
}

export interface ReceiptPdfData {
  receiptNumber: string;
  date: Date;
  clientName?: string;
  staffName?: string;
  items: ReceiptItem[];
  subtotal: number; // cêntimos (líquido)
  vat: number; // cêntimos
  total: number; // cêntimos (com IVA)
  tip?: number; // cêntimos
  paymentMethod: string;
}

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: pdfColors.ink, fontFamily: 'Helvetica' },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: pdfColors.green,
    paddingBottom: 10,
    marginBottom: 14,
  },
  brand: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: pdfColors.green },
  brandSub: { fontSize: 9, color: pdfColors.muted, marginTop: 2 },
  contact: { fontSize: 8, color: pdfColors.muted, marginTop: 6, lineHeight: 1.4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  metaLabel: { color: pdfColors.muted },
  title: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: pdfColors.green,
    marginTop: 8,
    marginBottom: 10,
  },
  tHead: {
    flexDirection: 'row',
    backgroundColor: pdfColors.sand,
    paddingVertical: 5,
    paddingHorizontal: 6,
    marginTop: 4,
  },
  tRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: pdfColors.line,
  },
  cName: { flex: 1 },
  cQty: { width: 34, textAlign: 'center' },
  cPrice: { width: 64, textAlign: 'right' },
  cTotal: { width: 70, textAlign: 'right' },
  bold: { fontFamily: 'Helvetica-Bold' },
  totals: { marginTop: 12, marginLeft: 'auto', width: 200 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  grand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginTop: 4,
    borderTopWidth: 1.5,
    borderTopColor: pdfColors.green,
  },
  grandText: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: pdfColors.green },
  disclaimer: {
    marginTop: 26,
    padding: 8,
    backgroundColor: pdfColors.cream,
    borderWidth: 0.5,
    borderColor: pdfColors.line,
    fontSize: 8,
    color: pdfColors.muted,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 36,
    right: 36,
    textAlign: 'center',
    fontSize: 8,
    color: pdfColors.muted,
  },
});

export function ReceiptPdf(data: ReceiptPdfData) {
  return (
    <Document title={`Talão ${data.receiptNumber}`}>
      <Page size="A5" style={s.page}>
        <View style={s.header}>
          <Text style={s.brand}>{SALON_CONTACT_FALLBACK.name}</Text>
          <Text style={s.brandSub}>Hair Style &amp; Beauty</Text>
          <Text style={s.contact}>
            {SALON_CONTACT_FALLBACK.address}, {SALON_CONTACT_FALLBACK.postalCode}{' '}
            {SALON_CONTACT_FALLBACK.city}
            {'\n'}
            {SALON_CONTACT_FALLBACK.phone} · {SALON_CONTACT_FALLBACK.email}
          </Text>
        </View>

        <Text style={s.title}>Talão de compra</Text>

        <View style={s.metaRow}>
          <Text style={s.metaLabel}>Nº</Text>
          <Text style={s.bold}>{data.receiptNumber}</Text>
        </View>
        <View style={s.metaRow}>
          <Text style={s.metaLabel}>Data</Text>
          <Text>{fmtDateTime(data.date)}</Text>
        </View>
        {data.clientName ? (
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Cliente</Text>
            <Text>{data.clientName}</Text>
          </View>
        ) : null}
        {data.staffName ? (
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Profissional</Text>
            <Text>{data.staffName}</Text>
          </View>
        ) : null}

        <View style={s.tHead}>
          <Text style={[s.cName, s.bold]}>Serviço</Text>
          <Text style={[s.cQty, s.bold]}>Qt</Text>
          <Text style={[s.cPrice, s.bold]}>Preço</Text>
          <Text style={[s.cTotal, s.bold]}>Total</Text>
        </View>
        {data.items.map((item, i) => (
          <View style={s.tRow} key={`${item.name}-${i}`}>
            <Text style={s.cName}>{item.name}</Text>
            <Text style={s.cQty}>{item.qty}</Text>
            <Text style={s.cPrice}>{fmtMoney(item.unitPrice)}</Text>
            <Text style={s.cTotal}>{fmtMoney(item.total)}</Text>
          </View>
        ))}

        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text style={s.metaLabel}>Subtotal (s/ IVA)</Text>
            <Text>{fmtMoney(data.subtotal)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.metaLabel}>IVA</Text>
            <Text>{fmtMoney(data.vat)}</Text>
          </View>
          {data.tip && data.tip > 0 ? (
            <View style={s.totalRow}>
              <Text style={s.metaLabel}>Gorjeta</Text>
              <Text>{fmtMoney(data.tip)}</Text>
            </View>
          ) : null}
          <View style={s.grand}>
            <Text style={s.grandText}>Total</Text>
            <Text style={s.grandText}>{fmtMoney(data.total + (data.tip ?? 0))}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.metaLabel}>Pagamento</Text>
            <Text>{paymentLabel(data.paymentMethod)}</Text>
          </View>
        </View>

        <Text style={s.disclaimer}>
          Este talão NÃO é um documento fiscal. A fatura-recibo válida é emitida através de software
          certificado. Solicite a fatura com o seu NIF, se pretender.
        </Text>

        <Text style={s.footer} fixed>
          {SALON_CONTACT_FALLBACK.name} · Obrigado pela sua preferência
        </Text>
      </Page>
    </Document>
  );
}

export default ReceiptPdf;
