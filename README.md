# NEXO Ergonomia

Protótipo front-end para apoiar o registro e a análise de casos de ergonomia. O projeto organiza o fluxo de empresas, casos e condições/lesões, priorizando uma experiência clara para quem acompanha avaliações ergonômicas.

## Funcionalidades

- Cadastro, consulta e acompanhamento de casos.
- Gestão de empresas, setores e atividades vinculadas.
- Registro de condições e lesões com catálogo de referências corporais.
- Questionários condicionais, rascunhos e histórico de alterações.
- Persistência local no navegador, sem dependência de backend.
- Base demonstrativa preenchida com casos, empresas, setores, condições,
  atividades e linhas do tempo coerentes com as histórias de usuário.

## Tecnologias

- React 19
- TypeScript
- Vite
- ESLint
- Lucide React

## Como executar

Pré-requisito: Node.js 22.13 ou superior.

```bash
npm install
npm run dev
```

Para validar o projeto:

```bash
npm run lint
npm run build
```

## Observações

Este é um protótipo de interface com dados locais. O índice de compatibilidade permanece pendente até que exista uma fórmula técnica documentada e validada por especialistas.

## Comparação de versões

- A versão anterior à aplicação da UX/UI Pro Max está preservada na branch
  `backup/pre-ux-ui-pro-max-2026-09-15` e na tag
  `nexo-before-ux-ui-pro-max-v1`.
- O relatório detalhado de antes e depois está em
  [`output/pdf/NEXO_comparativo_UX_UI_Pro_Max.pdf`](output/pdf/NEXO_comparativo_UX_UI_Pro_Max.pdf).

## Equipe

- **Design:** Gabriel Soares
- **Product Owner (PO):** Caio Teixeira Ladeira
