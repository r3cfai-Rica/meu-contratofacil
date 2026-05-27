// Default professional service contract templates

export const DEFAULT_CONTRACT_CLAUSES_PT = `CLÁUSULA 1ª — DO OBJETO
O presente contrato tem como objeto a prestação dos serviços descritos acima pela CONTRATADA à CONTRATANTE, conforme escopo, prazos e condições aqui estabelecidos.

CLÁUSULA 2ª — DO VALOR E DA FORMA DE PAGAMENTO
Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA o valor total descrito neste instrumento, de acordo com a forma de pagamento definida (à vista, parcelado ou recorrente). O atraso no pagamento ensejará multa de 2% (dois por cento) sobre o valor devido, acrescida de juros de mora de 1% (um por cento) ao mês.

CLÁUSULA 3ª — DO PRAZO DE VIGÊNCIA
O presente contrato terá início na data indicada como "Data de início" e vigorará até a data de término estipulada, quando houver. Na ausência de data de término, vigorará por prazo indeterminado, podendo ser rescindido por qualquer das partes mediante aviso prévio de 30 (trinta) dias.

CLÁUSULA 4ª — DAS OBRIGAÇÕES DA CONTRATADA
A CONTRATADA se compromete a executar os serviços com diligência, qualidade técnica e dentro dos prazos acordados, mantendo sigilo sobre informações confidenciais a que tiver acesso.

CLÁUSULA 5ª — DAS OBRIGAÇÕES DA CONTRATANTE
A CONTRATANTE se compromete a fornecer todas as informações e materiais necessários à execução dos serviços, bem como efetuar os pagamentos nas datas pactuadas.

CLÁUSULA 6ª — DA RESCISÃO
Este contrato poderá ser rescindido por qualquer das partes em caso de descumprimento de qualquer cláusula, mediante notificação por escrito, com prazo de 15 (quinze) dias para regularização. A rescisão imotivada deverá observar o aviso prévio previsto na Cláusula 3ª.

CLÁUSULA 7ª — DO FORO
Fica eleito o foro da comarca do domicílio da CONTRATANTE para dirimir quaisquer dúvidas ou controvérsias oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.

E, por estarem assim justas e contratadas, as partes assinam o presente instrumento.`;

export const DEFAULT_CONTRACT_CLAUSES_EN = `CLAUSE 1 — PURPOSE
The purpose of this agreement is the provision of the services described above by the CONTRACTOR to the CLIENT, in accordance with the scope, deadlines, and conditions set forth herein.

CLAUSE 2 — PRICE AND PAYMENT TERMS
For the services rendered, the CLIENT shall pay the CONTRACTOR the total amount described in this instrument, according to the payment method defined (one-time, installments, or recurring). Late payments shall incur a penalty of 2% (two percent) of the amount due, plus default interest of 1% (one percent) per month.

CLAUSE 3 — TERM
This agreement shall start on the date indicated as "Start date" and shall remain in effect until the stipulated end date, if any. In the absence of an end date, it shall remain in effect for an indefinite term and may be terminated by either party upon 30 (thirty) days' prior written notice.

CLAUSE 4 — OBLIGATIONS OF THE CONTRACTOR
The CONTRACTOR undertakes to perform the services with diligence, technical quality, and within the agreed deadlines, maintaining confidentiality regarding any confidential information accessed during the engagement.

CLAUSE 5 — OBLIGATIONS OF THE CLIENT
The CLIENT undertakes to provide all information and materials necessary for the performance of the services, as well as to make payments on the agreed dates.

CLAUSE 6 — TERMINATION
This agreement may be terminated by either party in the event of breach of any clause, upon written notice with a 15 (fifteen) day cure period. Termination without cause must observe the prior notice set forth in Clause 3.

CLAUSE 7 — GOVERNING LAW AND VENUE
The parties elect the venue of the CLIENT's domicile to resolve any doubts or controversies arising from this agreement, expressly waiving any other, however privileged.

And, being so agreed, the parties sign this instrument.`;

export function getDefaultContractClauses(language: "pt-BR" | "en-US"): string {
  return language === "en-US" ? DEFAULT_CONTRACT_CLAUSES_EN : DEFAULT_CONTRACT_CLAUSES_PT;
}

export function splitClauses(clauses: string): string[] {
  return clauses
    .split(/\n\s*\n/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

export function joinClauses(clauses: string[]): string {
  return clauses.map((c) => c.trim()).filter((c) => c.length > 0).join("\n\n");
}

export function getDefaultContractClausesList(language: "pt-BR" | "en-US"): string[] {
  return splitClauses(getDefaultContractClauses(language));
}

// Backwards-compat export
export const DEFAULT_CONTRACT_CLAUSES = DEFAULT_CONTRACT_CLAUSES_PT;
