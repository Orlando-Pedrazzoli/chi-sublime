// 📄 src/lib/pdf/generate.ts
/**
 * Chi Sublime — Geração de PDFs (@react-pdf/renderer)
 * ============================================================
 *
 * Orquestrador: renderiza cada template para um Buffer, pronto a
 * servir num route handler (Content-Type: application/pdf) ou a
 * anexar num email.
 *
 * Só corre no servidor (renderToBuffer usa APIs de Node). Ficheiro
 * .ts → usa createElement em vez de JSX.
 *
 * Os tipos de dados de cada template são re-exportados para os
 * callers construírem o payload a partir dos seus DTOs.
 */

import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';

/** O tipo de elemento que renderToBuffer aceita (um <Document>). Os
 * nossos templates devolvem um <Document>, mas o wrapper de componente
 * esconde isso do TS — daí o cast controlado. */
type PdfElement = Parameters<typeof renderToBuffer>[0];

import { ReceiptPdf, type ReceiptPdfData } from './templates/Receipt';
import { FinancialReportPdf, type FinancialReportData } from './templates/FinancialReport';
import { CashRegisterReportPdf, type CashRegisterReportData } from './templates/CashRegisterReport';

export type { ReceiptPdfData, ReceiptItem } from './templates/Receipt';
export type { FinancialReportData, ReportCategoryRow } from './templates/FinancialReport';
export type { CashRegisterReportData, MethodRow } from './templates/CashRegisterReport';

/** Talão de balcão (não fiscal) de uma venda. */
export async function renderReceiptPdf(data: ReceiptPdfData): Promise<Buffer> {
  return renderToBuffer(createElement(ReceiptPdf, data) as PdfElement);
}

/** Relatório financeiro / IVA de um período. */
export async function renderFinancialReportPdf(data: FinancialReportData): Promise<Buffer> {
  return renderToBuffer(createElement(FinancialReportPdf, data) as PdfElement);
}

/** Fecho de caixa de um dia. */
export async function renderCashRegisterReportPdf(data: CashRegisterReportData): Promise<Buffer> {
  return renderToBuffer(createElement(CashRegisterReportPdf, data) as PdfElement);
}
