import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable/es';
import logoUrl from '../assets/logo.png';

// Cores do app (verde-musgo / areia / terracota)
const BRAND: [number, number, number] = [30, 68, 57];
const BRAND_LIGHT: [number, number, number] = [239, 246, 242];
const SAND: [number, number, number] = [140, 128, 107];
const CLAY: [number, number, number] = [166, 84, 48];
const INK: [number, number, number] = [37, 34, 30];

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const dateBR = (d: string) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const fileSafe = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

let logoCache: string | null = null;
const loadLogo = async () => {
  if (logoCache) return logoCache;
  const blob = await fetch(logoUrl).then(r => r.blob());
  logoCache = await new Promise<string>(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
  return logoCache;
};

/** Cabeçalho comum: logo, título, subtítulo e período. Retorna a altura usada. */
const header = async (doc: jsPDF, title: string, subtitle: string, period: string) => {
  const logo = await loadLogo();
  const w = doc.internal.pageSize.getWidth();
  doc.addImage(logo, 'PNG', 14, 10, 18, 21.6, 'logo', 'FAST'); // logo é 480x576 (proporção 5:6)
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...INK);
  doc.text(title, 38, 19);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...SAND);
  doc.text(subtitle, 38, 25.5);
  doc.text(`Período: ${period}`, 38, 30.5);
  doc.setFontSize(8);
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} · Nosso Lar`, w - 14, 19, { align: 'right' });
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.4);
  doc.line(14, 36, w - 14, 36);
  return 42;
};

const footer = (doc: jsPDF) => {
  const pages = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...SAND);
    doc.text(`Página ${i} de ${pages}`, w - 14, h - 8, { align: 'right' });
    doc.text('Isabelly & Patrick · Nosso Lar', 14, h - 8);
  }
};

/** Caixas de totais lado a lado. */
const totalsBoxes = (doc: jsPDF, y: number, boxes: { label: string; value: string; color?: [number, number, number] }[]) => {
  const w = doc.internal.pageSize.getWidth();
  const gap = 4;
  const bw = (w - 28 - gap * (boxes.length - 1)) / boxes.length;
  boxes.forEach((b, i) => {
    const x = 14 + i * (bw + gap);
    doc.setFillColor(...BRAND_LIGHT);
    doc.roundedRect(x, y, bw, 18, 2, 2, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(...SAND);
    doc.text(b.label.toUpperCase(), x + 4, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...(b.color ?? INK));
    doc.text(b.value, x + 4, y + 13.5);
    doc.setFont('helvetica', 'normal');
  });
  return y + 24;
};

export interface StatementRow {
  date: string;
  description: string;
  category: string;
  total: number;
  share: number;
  reimbursed: boolean;
}

/** Extrato de um pagante: o que ele deve, o que já devolveu e o saldo. */
export const downloadPayerStatement = async (payerName: string, period: string, rows: StatementRow[], onlyPending: boolean) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const due = rows.reduce((s, r) => s + r.share, 0);
  const paid = rows.filter(r => r.reimbursed).reduce((s, r) => s + r.share, 0);
  let y = await header(doc, `Extrato · ${payerName}`, onlyPending ? 'Somente valores pendentes' : 'Despesas divididas com Isabelly & Patrick', period);

  y = totalsBoxes(doc, y, onlyPending
    ? [{ label: 'Total a pagar', value: brl(due - paid), color: CLAY }, { label: 'Lançamentos', value: String(rows.length) }]
    : [
        { label: 'Parte total', value: brl(due) },
        { label: 'Já pago', value: brl(paid), color: BRAND },
        { label: 'Saldo a pagar', value: brl(due - paid), color: CLAY },
      ]);

  autoTable(doc, {
    startY: y,
    head: [['Data', 'Descrição', 'Categoria', 'Valor total', `Parte de ${payerName}`, 'Situação']],
    body: rows.map(r => [dateBR(r.date), r.description, r.category, brl(r.total), brl(r.share), r.reimbursed ? 'Pago' : 'A pagar']),
    foot: [['', '', '', 'Saldo a pagar', brl(due - paid), '']],
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8.5, textColor: INK, lineColor: [232, 225, 212], lineWidth: 0.1, cellPadding: 2 },
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: BRAND_LIGHT, textColor: INK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 248, 244] },
    columnStyles: { 0: { cellWidth: 20 }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' }, 5: { cellWidth: 18 } },
    didParseCell: data => {
      if (data.section === 'foot' && (data.column.index === 3 || data.column.index === 4)) data.cell.styles.halign = 'right';
      if (data.section === 'body' && data.column.index === 5) {
        data.cell.styles.textColor = data.cell.raw === 'Pago' ? BRAND : CLAY;
      }
    },
  });

  footer(doc);
  doc.save(`extrato-${fileSafe(payerName)}-${fileSafe(period)}.pdf`);
};

export interface PayerSummaryRow {
  name: string;
  count: number;
  due: number;
  paid: number;
}

/** Relatório geral: todos os pagantes no período. */
export const downloadPayersSummary = async (period: string, rows: PayerSummaryRow[]) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const due = rows.reduce((s, r) => s + r.due, 0);
  const paid = rows.reduce((s, r) => s + r.paid, 0);
  let y = await header(doc, 'Relatório de pagantes', 'Resumo das despesas divididas com outras pessoas', period);
  y = totalsBoxes(doc, y, [
    { label: 'Total devido', value: brl(due) },
    { label: 'Já reembolsado', value: brl(paid), color: BRAND },
    { label: 'A receber', value: brl(due - paid), color: CLAY },
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Pagante', 'Lançamentos', 'Devido', 'Reembolsado', 'A receber']],
    body: rows.map(r => [r.name, String(r.count), brl(r.due), brl(r.paid), brl(r.due - r.paid)]),
    foot: [['Total', String(rows.reduce((s, r) => s + r.count, 0)), brl(due), brl(paid), brl(due - paid)]],
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9.5, textColor: INK, lineColor: [232, 225, 212], lineWidth: 0.1, cellPadding: 2.5 },
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: BRAND_LIGHT, textColor: INK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 248, 244] },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } },
    didParseCell: data => {
      if (data.section === 'foot') data.cell.styles.halign = data.column.index === 1 ? 'center' : data.column.index >= 2 ? 'right' : 'left';
    },
  });

  footer(doc);
  doc.save(`relatorio-pagantes-${fileSafe(period)}.pdf`);
};
