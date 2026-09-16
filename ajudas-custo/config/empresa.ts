export interface DadosEmpresa {
  empresa: string;
  morada: string;
  contribuinte: string;
  valorDiarioNacional: number;
  valorDiarioEstrangeiro: number;
  localidadeAssinatura: string;
}

export const dadosEmpresaOmissao: DadosEmpresa = {
  empresa: "Arca do Horizonte",
  morada: "Bairro de Sargentos 81, 2260-103",
  contribuinte: "519048970",
  valorDiarioNacional: 72.65,
  valorDiarioEstrangeiro: 167.07,
  localidadeAssinatura: "Lisboa",
};
