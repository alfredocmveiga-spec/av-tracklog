# AV / TRACKLOG — Notion → Site

Esta versão substitui as provas de demonstração e o `localStorage` por dados reais vindos do Notion.

## Estrutura

- `index.html` — site público.
- `api/provas.js` — função privada que lê a base de dados do Notion.
- `package.json` — ativa módulos JavaScript no servidor.

## Variáveis necessárias quando o site for publicado

- `NOTION_TOKEN` — token secreto da ligação AV Tracklog. **Nunca colocar no HTML.**
- `NOTION_DATABASE_ID` — `3dea892f-6920-8033-bff0-d41605f28dfd`
- `NOTION_DATA_SOURCE_ID` — opcional. O código tenta descobri-lo automaticamente a partir da database.

## Propriedades esperadas no Notion

`Prova`, `Data`, `Modalidade`, `Tipo`, `Local`, `Distância`, `Tempo`, `Classificação Geral`, `Classificação Escalão`, `Resultado`, `Strava`, `Resultados Oficiais`.

`Resultado` pode ser Seleção ou Seleção múltipla. Os pódios são detetados por `Pódio`/`Vitória` ou classificação geral <= 3.

## Nota

Ao abrir `index.html` diretamente no computador, a função `/api/provas` não existe. A ligação real ao Notion só funciona quando a pasta for publicada num alojamento que execute a função `api/provas.js`.
