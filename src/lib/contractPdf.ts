import { jsPDF } from "jspdf";
import { formatCurrencyBRL, formatDateBR } from "./format";

const PAYMENT_LABELS: Record<string, string> = {
  one_time: "À vista",
  installments: "Parcelado",
  recurring: "Recorrente",
};

export interface ContractPdfData {
  contract_number: string;
  title: string;
  service_type: string;
  service_description?: string | null;
  total_value: number;
  payment_method: string;
  start_date: string;
  end_date?: string | null;
  clauses?: string | null;
  provider_name?: string | null;
  client_name?: string | null;
  signer_name?: string | null;
  signer_document?: string | null;
  signer_display_name?: string | null;
  signature_data?: string | null;
  signature_type?: string | null;
  signed_at?: string | null;
  signer_ip?: string | null;
}

const MARGIN = 56; // ~ 20mm at 72dpi (jsPDF "pt")

export function generateContractPdf(data: ContractPdfData): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  let y = MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(99, 102, 241); // primary
  doc.text("CONTRATOFÁCIL", MARGIN, y);
  doc.setTextColor(120);
  doc.setFont("helvetica", "normal");
  doc.text(data.contract_number, pageWidth - MARGIN, y, { align: "right" });
  y += 8;
  doc.setDrawColor(220);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 24;

  // Title
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(data.title, contentWidth);
  doc.text(titleLines, MARGIN, y);
  y += titleLines.length * 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(data.service_type, MARGIN, y);
  y += 24;

  // Parties
  doc.setDrawColor(230);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(MARGIN, y, contentWidth, 70, 6, 6, "F");
  doc.setTextColor(100);
  doc.setFontSize(8);
  doc.text("PRESTADOR", MARGIN + 12, y + 16);
  doc.text("CLIENTE", MARGIN + contentWidth / 2 + 12, y + 16);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(data.provider_name || "—", MARGIN + 12, y + 36);
  doc.text(data.client_name || "—", MARGIN + contentWidth / 2 + 12, y + 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Contratada", MARGIN + 12, y + 52);
  doc.text("Contratante", MARGIN + contentWidth / 2 + 12, y + 52);
  y += 90;

  // Key facts grid
  const facts: Array<[string, string]> = [
    ["Valor total", formatCurrencyBRL(Number(data.total_value))],
    ["Pagamento", PAYMENT_LABELS[data.payment_method] ?? data.payment_method],
    ["Início", formatDateBR(data.start_date)],
    ["Término", data.end_date ? formatDateBR(data.end_date) : "Indeterminado"],
  ];
  const colW = contentWidth / 4;
  facts.forEach(([label, value], i) => {
    const x = MARGIN + i * colW;
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text(label.toUpperCase(), x, y);
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(value, x, y + 16);
    doc.setFont("helvetica", "normal");
  });
  y += 36;
  doc.setDrawColor(230);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 24;

  // Description
  if (data.service_description) {
    ensureSpace(60);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("DESCRIÇÃO DO SERVIÇO", MARGIN, y);
    y += 14;
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);
    const descLines = doc.splitTextToSize(data.service_description, contentWidth);
    descLines.forEach((line: string) => {
      ensureSpace(14);
      doc.text(line, MARGIN, y);
      y += 14;
    });
    y += 12;
  }

  // Clauses
  if (data.clauses) {
    ensureSpace(40);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("CLÁUSULAS", MARGIN, y);
    y += 14;
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(data.clauses, contentWidth);
    lines.forEach((line: string) => {
      ensureSpace(13);
      // Bold lines that look like clause titles
      if (/^CLÁUSULA\s/i.test(line.trim())) {
        doc.setFont("helvetica", "bold");
        doc.text(line, MARGIN, y);
        doc.setFont("helvetica", "normal");
      } else {
        doc.text(line, MARGIN, y);
      }
      y += 13;
    });
    y += 16;
  }

  // Signature block
  ensureSpace(180);
  doc.setDrawColor(220);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 20;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("ASSINATURA DIGITAL", MARGIN, y);
  y += 16;

  if (data.signature_data) {
    try {
      doc.addImage(data.signature_data, "PNG", MARGIN, y, 200, 70);
    } catch {
      // ignore image errors
    }
    y += 76;
    doc.setDrawColor(180);
    doc.line(MARGIN, y, MARGIN + 240, y);
    y += 12;
  }

  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(data.signer_display_name || data.signer_name || "—", MARGIN, y);
  doc.setFont("helvetica", "normal");
  y += 14;
  doc.setFontSize(9);
  doc.setTextColor(100);
  if (data.signer_name && data.signer_name !== data.signer_display_name) {
    doc.text(`Nome: ${data.signer_name}`, MARGIN, y);
    y += 12;
  }
  if (data.signer_document) {
    doc.text(`CPF: ${data.signer_document}`, MARGIN, y);
    y += 12;
  }
  if (data.signed_at) {
    const d = new Date(data.signed_at);
    doc.text(`Assinado em: ${d.toLocaleString("pt-BR")}`, MARGIN, y);
    y += 12;
  }
  if (data.signer_ip) {
    doc.text(`IP: ${data.signer_ip}`, MARGIN, y);
    y += 12;
  }

  // Footer page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `${data.contract_number} · Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 24,
      { align: "center" },
    );
  }

  return doc;
}
