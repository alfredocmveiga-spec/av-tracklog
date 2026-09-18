const NOTION_VERSION = '2026-03-11';
const NOTION_API = 'https://api.notion.com/v1';

function textValue(prop) {
  const items = prop?.rich_text || prop?.title || [];
  return items.map(item => item?.plain_text || '').join('').trim();
}

function selectValue(prop) {
  return prop?.select?.name || '';
}

function multiSelectValues(prop) {
  if (Array.isArray(prop?.multi_select)) return prop.multi_select.map(x => x.name).filter(Boolean);
  if (prop?.select?.name) return [prop.select.name];
  return [];
}

function numberValue(prop) {
  return typeof prop?.number === 'number' ? prop.number : null;
}

function urlValue(prop) {
  return prop?.url || '';
}

function ordinal(value, suffix) {
  return Number.isFinite(value) ? `${value}.º ${suffix}` : '';
}

async function notionFetch(path, options = {}) {
  const response = await fetch(`${NOTION_API}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.message || `Notion respondeu com ${response.status}`;
    throw new Error(message);
  }
  return data;
}

async function resolveDataSourceId(databaseId) {
  if (process.env.NOTION_DATA_SOURCE_ID) return process.env.NOTION_DATA_SOURCE_ID;
  const database = await notionFetch(`/databases/${databaseId}`);
  const dataSourceId = database?.data_sources?.[0]?.id;
  if (!dataSourceId) throw new Error('Não foi encontrada nenhuma data source nesta base de dados.');
  return dataSourceId;
}

async function queryAll(dataSourceId) {
  const results = [];
  let cursor;
  do {
    const body = {
      page_size: 100,
      sorts: [{ property: 'Data', direction: 'descending' }],
      ...(cursor ? { start_cursor: cursor } : {})
    };
    const page = await notionFetch(`/data_sources/${dataSourceId}/query`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    results.push(...(page.results || []));
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return results;
}

function mapRace(page) {
  const p = page.properties || {};
  const general = numberValue(p['Classificação Geral']);
  const category = numberValue(p['Classificação Escalão']);
  const resultTags = multiSelectValues(p['Resultado']);
  const rankParts = [ordinal(general, 'geral'), ordinal(category, 'escalão')].filter(Boolean);
  const rank = rankParts.join(' · ') || resultTags.join(' · ') || '—';
  const isPodium = resultTags.some(x => /pódio|podio|vitória|vitoria/i.test(x)) || (Number.isFinite(general) && general <= 3);

  return {
    id: page.id,
    name: textValue(p['Prova']) || 'Prova sem nome',
    date: p['Data']?.date?.start || '',
    type: selectValue(p['Modalidade']),
    subtype: selectValue(p['Tipo']),
    location: textValue(p['Local']),
    distance: numberValue(p['Distância']),
    time: textValue(p['Tempo']),
    generalRank: general,
    categoryRank: category,
    results: resultTags,
    rank,
    isPodium,
    strava: urlValue(p['Strava']),
    officialResults: urlValue(p['Resultados Oficiais'])
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
    return res.status(500).json({ error: 'Faltam as variáveis NOTION_TOKEN e/ou NOTION_DATABASE_ID.' });
  }

  try {
    const dataSourceId = await resolveDataSourceId(process.env.NOTION_DATABASE_ID);
    const pages = await queryAll(dataSourceId);
    const races = pages.map(mapRace).filter(r => r.date);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ races, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Erro ao ler a base de dados do Notion.' });
  }
}
