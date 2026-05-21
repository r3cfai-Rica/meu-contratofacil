import { jsPDF } from "jspdf";
import { formatCurrencyBRL, formatCurrencyUSD, formatDateByLang } from "./format";

type Lang = "pt-BR" | "en-US";

const STRINGS = {
  "pt-BR": {
    brand: "CONTRATOFÁCIL",
    provider: "PRESTADOR",
    client: "CLIENTE",
    providerRole: "Contratada",
    clientRole: "Contratante",
    totalValue: "Valor total",
    payment: "Pagamento",
    start: "Início",
    end: "Término",
    indefinite: "Indeterminado",
    description: "DESCRIÇÃO DO SERVIÇO",
    clauses: "CLÁUSULAS",
    clauseWord: /^CLÁUSULA\s/i,
    signature: "ASSINATURA DIGITAL",
    name: "Nome",
    document: "CPF",
    signedAt: "Assinado em",
    ip: "IP",
    page: (i: number, n: number) => `Página ${i} de ${n}`,
    paymentLabels: {
      one_time: "À vista",
      installments: "Parcelado",
      recurring: "Recorrente",
    } as Record<string, string>,
  },
  "en-US": {
    brand: "EASYCONTRACT",
    provider: "PROVIDER",
    client: "CLIENT",
    providerRole: "Contractor",
    clientRole: "Client",
    totalValue: "Total value",
    payment: "Payment",
    start: "Start",
    end: "End",
    indefinite: "Open-ended",
    description: "SERVICE DESCRIPTION",
    clauses: "CLAUSES",
    clauseWord: /^(CLAUSE|CLÁUSULA)\s/i,
    signature: "DIGITAL SIGNATURE",
    name: "Name",
    document: "Tax ID",
    signedAt: "Signed at",
    ip: "IP",
    page: (i: number, n: number) => `Page ${i} of ${n}`,
    paymentLabels: {
      one_time: "One-time",
      installments: "Installments",
      recurring: "Recurring",
    } as Record<string, string>,
  },
} as const;

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
  provider_logo_url?: string | null;
  client_name?: string | null;
  signer_name?: string | null;
  signer_document?: string | null;
  signer_display_name?: string | null;
  signature_data?: string | null;
  signature_type?: string | null;
  signed_at?: string | null;
  signer_ip?: string | null;
  language?: Lang;
}

const MARGIN = 56;

async function loadImageAsDataUrl(
  url: string,
): Promise<{ dataUrl: string; width: number; height: number; format: "PNG" | "JPEG" } | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
    const isJpeg = blob.type.includes("jpeg") || blob.type.includes("jpg");
    return { dataUrl, width: dims.width, height: dims.height, format: isJpeg ? "JPEG" : "PNG" };
  } catch {
    return null;
  }
}

export async function generateContractPdf(data: ContractPdfData): Promise<jsPDF> {
  const lang: Lang = data.language === "en-US" ? "en-US" : "pt-BR";
  const S = STRINGS[lang];
  const formatMoney = (v: number) =>
    lang === "en-US" ? formatCurrencyUSD(v) : formatCurrencyBRL(v);
  const fmtDate = (v: string | Date) => formatDateByLang(v, lang);

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

  const logo = data.provider_logo_url
    ? await loadImageAsDataUrl(data.provider_logo_url)
    : null;

  if (logo) {
    const maxH = 36;
    const maxW = 140;
    const ratio = logo.width / Math.max(1, logo.height);
    let h = maxH;
    let w = h * ratio;
    if (w > maxW) {
      w = maxW;
      h = w / ratio;
    }
    try {
      doc.addImage(logo.dataUrl, logo.format, MARGIN, y - 4, w, h);
    } catch {
      // ignore
    }
    if (data.provider_name) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(data.provider_name, MARGIN + w + 12, y + h / 2 + 3);
    }
    y += h;
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(99, 102, 241);
    doc.text(S.brand, MARGIN, y);
  }

  doc.setTextColor(120);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(data.contract_number, pageWidth - MARGIN, MARGIN, { align: "right" });
  y += 8;
  doc.setDrawColor(220);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 24;

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

  doc.setDrawColor(230);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(MARGIN, y, contentWidth, 70, 6, 6, "F");
  doc.setTextColor(100);
  doc.setFontSize(8);
  doc.text(S.provider, MARGIN + 12, y + 16);
  doc.text(S.client, MARGIN + contentWidth / 2 + 12, y + 16);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(data.provider_name || "—", MARGIN + 12, y + 36);
  doc.text(data.client_name || "—", MARGIN + contentWidth / 2 + 12, y + 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(S.providerRole, MARGIN + 12, y + 52);
  doc.text(S.clientRole, MARGIN + contentWidth / 2 + 12, y + 52);
  y += 90;

  const facts: Array<[string, string]> = [
    [S.totalValue, formatMoney(Number(data.total_value))],
    [S.payment, S.paymentLabels[data.payment_method] ?? data.payment_method],
    [S.start, fmtDate(data.start_date)],
    [S.end, data.end_date ? fmtDate(data.end_date) : S.indefinite],
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

  if (data.service_description) {
    ensureSpace(60);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(S.description, MARGIN, y);
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

  if (data.clauses) {
    ensureSpace(40);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(S.clauses, MARGIN, y);
    y += 14;
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(data.clauses, contentWidth);
    lines.forEach((line: string) => {
      ensureSpace(13);
      if (S.clauseWord.test(line.trim())) {
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

  ensureSpace(180);
  doc.setDrawColor(220);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 20;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(S.signature, MARGIN, y);
  y += 16;

  if (data.signature_data) {
    try {
      doc.addImage(data.signature_data, "PNG", MARGIN, y, 200, 70);
    } catch {
      // ignore
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
    doc.text(`${S.name}: ${data.signer_name}`, MARGIN, y);
    y += 12;
  }
  if (data.signer_document) {
    doc.text(`${S.document}: ${data.signer_document}`, MARGIN, y);
    y += 12;
  }
  if (data.signed_at) {
    const d = new Date(data.signed_at);
    doc.text(`${S.signedAt}: ${d.toLocaleString(lang)}`, MARGIN, y);
    y += 12;
  }
  if (data.signer_ip) {
    doc.text(`${S.ip}: ${data.signer_ip}`, MARGIN, y);
    y += 12;
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `${data.contract_number} · ${S.page(i, pageCount)}`,
      pageWidth / 2,
      pageHeight - 24,
      { align: "center" },
    );
  }

  return doc;
}
