"use client";

import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { DadosEmpresa } from "@/config/empresa";
import {
  NOMES_MESES,
  formatarDataPorExtenso,
  linhaEhCinzenta,
  totalDias,
  totalValor,
  valorLinha,
  type LinhaMapa,
} from "@/lib/calculos";
import { formatarMoedaTabela, formatarMoedaTexto } from "@/lib/formatacao";
import type { Feriado } from "@/lib/feriados";

Font.register({
  family: "Open Sans",
  fonts: [
    { src: "/fonts/OpenSans-Regular.ttf", fontWeight: 400, fontStyle: "normal" },
    { src: "/fonts/OpenSans-Bold.ttf", fontWeight: 700, fontStyle: "normal" },
    { src: "/fonts/OpenSans-Italic.ttf", fontWeight: 400, fontStyle: "italic" },
    { src: "/fonts/OpenSans-BoldItalic.ttf", fontWeight: 700, fontStyle: "italic" },
  ],
});
// Sem isto, o react-pdf parte palavras compridas ("Reu-nião") ao quebrar linha.
Font.registerHyphenationCallback((palavra) => [palavra]);

const CINZENTO_CLARO = "#D9D9D9";
const CINZENTO_ESCURO = "#404040";
const PRETO = "#000000";

/** Larguras das colunas da tabela, em percentagem, pela ordem exata da referência. */
const COL = {
  dia: 5,
  servico: 21,
  local: 14,
  inicioDia: 6,
  inicioHora: 6,
  termoDia: 6,
  termoHora: 6,
  totalDias: 7,
  tipo: 13,
  valor: 16,
} as const;

const estilos = StyleSheet.create({
  pagina: {
    fontFamily: "Open Sans",
    fontSize: 8,
    color: PRETO,
    paddingTop: 26,
    paddingBottom: 26,
    paddingHorizontal: 28,
  },

  // Cabeçalho
  cabecalho: { flexDirection: "row", marginBottom: 6 },
  cabecalhoEsquerda: { width: "62%", paddingRight: 12 },
  cabecalhoDireita: { width: "38%" },
  rotuloPequeno: { fontSize: 6.5, color: "#333333" },
  linhaEmpresa: { marginBottom: 1.5 },
  caixaEmpresa: {
    borderWidth: 0.75,
    borderColor: PRETO,
    paddingVertical: 1.5,
    paddingHorizontal: 5,
    marginTop: 1,
  },
  textoEmpresa: { fontSize: 10, fontWeight: 700 },
  linhaMoradaWrap: { flexDirection: "row", alignItems: "flex-end", marginTop: 1.5, marginBottom: 1.5 },
  linhaMoradaRotulo: { fontSize: 6.5, color: "#333333", marginRight: 4 },
  linhaMoradaValor: {
    fontSize: 8.5,
    fontWeight: 700,
    flexGrow: 1,
    borderBottomWidth: 0.75,
    borderColor: PRETO,
    paddingBottom: 1,
  },
  linhaNifWrap: { flexDirection: "row", alignItems: "center", marginTop: 1.5 },
  linhaNifRotulo: { fontSize: 6.5, color: "#333333", marginRight: 4 },
  caixaNif: {
    borderWidth: 0.75,
    borderColor: PRETO,
    paddingVertical: 1.5,
    paddingHorizontal: 5,
    flexGrow: 1,
  },
  textoNif: { fontSize: 8.5, fontWeight: 700 },

  caixaRecibo: {
    backgroundColor: CINZENTO_CLARO,
    borderWidth: 0.75,
    borderColor: PRETO,
    paddingVertical: 2,
    alignItems: "center",
    marginBottom: 3,
  },
  textoRecibo: { fontSize: 16, fontWeight: 700 },
  linhaMesAno: { flexDirection: "row" },
  blocoMesAno: { flex: 1, paddingHorizontal: 3 },
  rotuloMesAno: { fontSize: 7, color: "#333333", textAlign: "center", marginBottom: 1 },
  caixaMesAno: { borderWidth: 0.75, borderColor: PRETO, paddingVertical: 2, alignItems: "center" },
  textoMesAno: { fontSize: 10, fontWeight: 700 },

  // Barra de título
  barraTitulo: { backgroundColor: CINZENTO_ESCURO, paddingVertical: 6, marginBottom: 0 },
  textoBarraTitulo: { color: "#ffffff", fontWeight: 700, fontSize: 12, textAlign: "center" },

  // Tabela
  tabela: { borderWidth: 0.75, borderColor: PRETO, borderTopWidth: 0 },
  linha: { flexDirection: "row" },
  linhaCabecalho: { flexDirection: "row", backgroundColor: CINZENTO_CLARO, minHeight: 24 },
  celula: {
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: PRETO,
    justifyContent: "center",
    paddingHorizontal: 2,
    paddingVertical: 1.5,
  },
  celulaCabecalho: {
    borderRightWidth: 0.5,
    borderColor: PRETO,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  celulaCabecalhoTexto: { fontSize: 7, fontWeight: 700, textAlign: "center" },
  grupoCabecalho: { flexDirection: "column" },
  grupoCabecalhoTopo: {
    flex: 1,
    borderBottomWidth: 0.5,
    borderColor: PRETO,
    justifyContent: "center",
    alignItems: "center",
  },
  grupoCabecalhoBase: { flex: 1, flexDirection: "row" },
  subCelulaCabecalho: {
    flex: 1,
    borderRightWidth: 0.5,
    borderColor: PRETO,
    justifyContent: "center",
    alignItems: "center",
  },
  subCelulaCabecalhoTexto: { fontSize: 5.5, fontWeight: 700, textAlign: "center" },

  textoDia: { fontSize: 7.5, fontWeight: 700, textAlign: "center" },
  textoServico: { fontSize: 7.5, textAlign: "center" },
  textoLocal: { fontSize: 7.5, textAlign: "left" },
  textoCentro: { fontSize: 7.5, textAlign: "center" },
  textoTipo: { fontSize: 6.5, textAlign: "center" },
  textoValor: { fontSize: 7.5, textAlign: "right" },
  celulaValor: { backgroundColor: CINZENTO_CLARO },

  // Linha de totais
  linhaTotais: { flexDirection: "row", borderLeftWidth: 0.75, borderRightWidth: 0.75, borderBottomWidth: 0.75, borderColor: PRETO },
  legendaTotais: { width: `${COL.dia + COL.servico + COL.local}%`, paddingHorizontal: 2, paddingVertical: 2, justifyContent: "center" },
  textoLegenda: { fontSize: 5.8, color: "#000000" },
  celulaTotalDiasRotulo: {
    width: `${COL.inicioDia + COL.inicioHora + COL.termoDia + COL.termoHora}%`,
    borderWidth: 0.5,
    borderColor: PRETO,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 4,
  },
  textoTotalDiasRotulo: { fontSize: 7.5, fontWeight: 700, textAlign: "right" },
  celulaTotalValor: {
    borderWidth: 0.5,
    borderColor: PRETO,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  textoTotalNegrito: { fontSize: 7.5, fontWeight: 700, textAlign: "center" },
  textoTotalValorNegrito: { fontSize: 7.5, fontWeight: 700, textAlign: "right" },

  // Texto final
  blocoTexto: { marginTop: 10 },
  paragrafo: { fontSize: 8.5, marginBottom: 4, lineHeight: 1.3 },
  negrito: { fontWeight: 700 },
  dataAssinatura: { fontSize: 8, marginTop: 8 },

  // Assinaturas
  blocoAssinaturas: { flexDirection: "row", marginTop: 34, justifyContent: "space-between" },
  assinatura: { alignItems: "center" },
  assinaturaColaborador: { width: "42%", marginLeft: "8%" },
  assinaturaGerencia: { width: "34%" },
  linhaAssinatura: { borderTopWidth: 0.75, borderColor: PRETO, width: "100%" },
  legendaAssinatura: { fontSize: 7.5, fontStyle: "italic", textAlign: "center", marginTop: 3 },
});

export interface DadosMapaPDF {
  ano: number;
  mes: number;
  empresa: DadosEmpresa;
  linhas: LinhaMapa[];
  feriados: Feriado[];
  diaRecibo: number;
}

export function MapaPDFDocumento({ ano, mes, empresa, linhas, feriados, diaRecibo }: DadosMapaPDF) {
  const dias = totalDias(linhas);
  const valor = totalValor(linhas, empresa);
  const nomeMes = NOMES_MESES[mes - 1]!;
  const ultimaLinha = linhas[linhas.length - 1];

  return (
    <Document title={`Mapa_AjudasDeCusto_${String(mes).padStart(2, "0")}_${ano}`}>
      <Page size="A4" style={estilos.pagina}>
        {/* Cabeçalho */}
        <View style={estilos.cabecalho}>
          <View style={estilos.cabecalhoEsquerda}>
            <View style={estilos.linhaEmpresa}>
              <Text style={estilos.rotuloPequeno}>Empresa:</Text>
              <View style={estilos.caixaEmpresa}>
                <Text style={estilos.textoEmpresa}>{empresa.empresa}</Text>
              </View>
            </View>
            <View style={estilos.linhaMoradaWrap}>
              <Text style={estilos.linhaMoradaRotulo}>Morada:</Text>
              <Text style={estilos.linhaMoradaValor}>{empresa.morada}</Text>
            </View>
            <View style={estilos.linhaNifWrap}>
              <Text style={estilos.linhaNifRotulo}>Nº de Contribuinte:</Text>
              <View style={estilos.caixaNif}>
                <Text style={estilos.textoNif}>{empresa.contribuinte}</Text>
              </View>
            </View>
          </View>
          <View style={estilos.cabecalhoDireita}>
            <View style={estilos.caixaRecibo}>
              <Text style={estilos.textoRecibo}>Recibo</Text>
            </View>
            <View style={estilos.linhaMesAno}>
              <View style={estilos.blocoMesAno}>
                <Text style={estilos.rotuloMesAno}>Mês:</Text>
                <View style={estilos.caixaMesAno}>
                  <Text style={estilos.textoMesAno}>{nomeMes}</Text>
                </View>
              </View>
              <View style={estilos.blocoMesAno}>
                <Text style={estilos.rotuloMesAno}>Ano:</Text>
                <View style={estilos.caixaMesAno}>
                  <Text style={estilos.textoMesAno}>{ano}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Barra de título */}
        <View style={estilos.barraTitulo}>
          <Text style={estilos.textoBarraTitulo}>MAPA DE AJUDAS DE CUSTO</Text>
        </View>

        {/* Tabela */}
        <View style={estilos.tabela}>
          <View style={estilos.linhaCabecalho}>
            <View style={[estilos.celulaCabecalho, { width: `${COL.dia}%` }]}>
              <Text style={estilos.celulaCabecalhoTexto}>DIA</Text>
            </View>
            <View style={[estilos.celulaCabecalho, { width: `${COL.servico}%` }]}>
              <Text style={estilos.celulaCabecalhoTexto}>SERVIÇO</Text>
            </View>
            <View style={[estilos.celulaCabecalho, { width: `${COL.local}%` }]}>
              <Text style={estilos.celulaCabecalhoTexto}>LOCAL</Text>
            </View>
            <View
              style={[
                estilos.grupoCabecalho,
                { width: `${COL.inicioDia + COL.inicioHora}%`, borderRightWidth: 0.5, borderColor: PRETO },
              ]}
            >
              <View style={estilos.grupoCabecalhoTopo}>
                <Text style={estilos.celulaCabecalhoTexto}>INÍCIO</Text>
              </View>
              <View style={estilos.grupoCabecalhoBase}>
                <View style={estilos.subCelulaCabecalho}>
                  <Text style={estilos.subCelulaCabecalhoTexto}>DIA</Text>
                </View>
                <View style={[estilos.subCelulaCabecalho, { borderRightWidth: 0 }]}>
                  <Text style={estilos.subCelulaCabecalhoTexto}>HORA</Text>
                </View>
              </View>
            </View>
            <View
              style={[
                estilos.grupoCabecalho,
                { width: `${COL.termoDia + COL.termoHora}%`, borderRightWidth: 0.5, borderColor: PRETO },
              ]}
            >
              <View style={estilos.grupoCabecalhoTopo}>
                <Text style={estilos.celulaCabecalhoTexto}>TERMO</Text>
              </View>
              <View style={estilos.grupoCabecalhoBase}>
                <View style={estilos.subCelulaCabecalho}>
                  <Text style={estilos.subCelulaCabecalhoTexto}>DIA</Text>
                </View>
                <View style={[estilos.subCelulaCabecalho, { borderRightWidth: 0 }]}>
                  <Text style={estilos.subCelulaCabecalhoTexto}>HORA</Text>
                </View>
              </View>
            </View>
            <View style={[estilos.celulaCabecalho, { width: `${COL.totalDias}%` }]}>
              <Text style={estilos.celulaCabecalhoTexto}>Total</Text>
              <Text style={estilos.celulaCabecalhoTexto}>Dias</Text>
            </View>
            <View style={[estilos.celulaCabecalho, { width: `${COL.tipo}%` }]}>
              <Text style={estilos.celulaCabecalhoTexto}>TIPO*</Text>
            </View>
            <View style={[estilos.celulaCabecalho, { width: `${COL.valor}%`, borderRightWidth: 0 }]}>
              <Text style={estilos.celulaCabecalhoTexto}>VALOR</Text>
            </View>
          </View>

          {linhas.map((linha, indice) => {
            const cinzenta = linhaEhCinzenta(ano, mes, linha.dia, feriados);
            const temServico = linha.servico.trim() !== "";
            const ehUltimaSemServico = indice === linhas.length - 1 && !temServico;
            const valorDia = valorLinha(linha, empresa);
            const corFundo = cinzenta ? CINZENTO_CLARO : "#ffffff";

            return (
              <View key={linha.data} style={[estilos.linha, { backgroundColor: corFundo }]}>
                <View style={[estilos.celula, { width: `${COL.dia}%` }]}>
                  <Text style={estilos.textoDia}>{linha.dia}</Text>
                </View>
                <View style={[estilos.celula, { width: `${COL.servico}%` }]}>
                  <Text style={estilos.textoServico}>{linha.servico}</Text>
                </View>
                <View style={[estilos.celula, { width: `${COL.local}%` }]}>
                  <Text style={estilos.textoLocal}>{linha.local}</Text>
                </View>
                <View style={[estilos.celula, { width: `${COL.inicioDia}%` }]}>
                  <Text style={estilos.textoCentro}>{linha.inicioDia}</Text>
                </View>
                <View style={[estilos.celula, { width: `${COL.inicioHora}%` }]}>
                  <Text style={estilos.textoCentro}>{linha.inicioHora}</Text>
                </View>
                <View style={[estilos.celula, { width: `${COL.termoDia}%` }]}>
                  <Text style={estilos.textoCentro}>{linha.termoDia}</Text>
                </View>
                <View style={[estilos.celula, { width: `${COL.termoHora}%` }]}>
                  <Text style={estilos.textoCentro}>{linha.termoHora}</Text>
                </View>
                <View style={[estilos.celula, { width: `${COL.totalDias}%` }]}>
                  <Text style={estilos.textoCentro}>{temServico ? "1" : ""}</Text>
                </View>
                <View style={[estilos.celula, { width: `${COL.tipo}%` }]}>
                  <Text style={estilos.textoTipo}>{temServico ? linha.tipo : ""}</Text>
                </View>
                <View style={[estilos.celula, estilos.celulaValor, { width: `${COL.valor}%`, borderRightWidth: 0 }]}>
                  <Text style={estilos.textoValor}>
                    {temServico ? formatarMoedaTabela(valorDia) : ehUltimaSemServico ? "-   €" : ""}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Linha de totais */}
        <View style={estilos.linhaTotais}>
          <View style={estilos.legendaTotais}>
            <Text style={estilos.textoLegenda}>
              * N-Ajudas de Custo em território nacional * E-Ajudas de Custo no estrangeiro
            </Text>
          </View>
          <View style={estilos.celulaTotalDiasRotulo}>
            <Text style={estilos.textoTotalDiasRotulo}>TOTAL DE Nº DE DIAS</Text>
          </View>
          <View style={[estilos.celulaTotalValor, { width: `${COL.totalDias}%` }]}>
            <Text style={estilos.textoTotalNegrito}>{dias}</Text>
          </View>
          <View style={[estilos.celulaTotalValor, { width: `${COL.tipo}%` }]}>
            <Text style={estilos.textoTotalNegrito}>TOTAL - €</Text>
          </View>
          <View style={[estilos.celulaTotalValor, estilos.celulaValor, { width: `${COL.valor}%` }]}>
            <Text style={estilos.textoTotalValorNegrito}>{formatarMoedaTabela(valor)}</Text>
          </View>
        </View>

        {/* Texto final */}
        <View style={estilos.blocoTexto}>
          <Text style={estilos.paragrafo}>
            Recebi da <Text style={estilos.negrito}>{empresa.empresa}</Text> a quantia de: {formatarMoedaTexto(valor).slice(0, -1)}
            <Text style={estilos.negrito}>€</Text>
          </Text>
          <Text style={estilos.paragrafo}>
            referente a ajudas de custo no âmbito de trabalho realizado ao serviço daquela organização, conforme acima
            descriminado.
          </Text>
          <Text style={estilos.dataAssinatura}>
            {empresa.localidadeAssinatura}, {formatarDataPorExtenso(ano, mes, diaRecibo)}
          </Text>
        </View>

        {/* Assinaturas */}
        <View style={estilos.blocoAssinaturas}>
          <View style={[estilos.assinatura, estilos.assinaturaColaborador]}>
            <View style={estilos.linhaAssinatura} />
            <Text style={estilos.legendaAssinatura}>assinatura do colaborador</Text>
          </View>
          <View style={[estilos.assinatura, estilos.assinaturaGerencia]}>
            <View style={estilos.linhaAssinatura} />
            <Text style={estilos.legendaAssinatura}>autorização da gerência</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
