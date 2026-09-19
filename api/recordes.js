export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Método não permitido",
    });
  }

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DATABASE_ID = process.env.NOTION_RECORDES_DATABASE_ID;

  if (!NOTION_TOKEN || !DATABASE_ID) {
    return res.status(500).json({
      error: "Faltam variáveis de ambiente do Notion",
    });
  }

  try {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Erro ao consultar o Notion",
        detalhe: data,
      });
    }

    function getText(property) {
      if (!property) return "";

      if (property.title) {
        return property.title.map((item) => item.plain_text).join("");
      }

      if (property.rich_text) {
        return property.rich_text.map((item) => item.plain_text).join("");
      }

      return "";
    }

    function normalizarDistancia(distancia) {
      const valor = distancia
        .toLowerCase()
        .replace(/\s/g, "")
        .replace(/-/g, "");

      if (valor === "5km") return "5 km";
      if (valor === "10km") return "10 km";

      if (
        valor === "meiamaratona" ||
        valor === "21km" ||
        valor === "21.1km"
      ) {
        return "Meia Maratona";
      }

      if (
        valor === "maratona" ||
        valor === "42km" ||
        valor === "42.195km"
      ) {
        return "Maratona";
      }

      return distancia;
    }

    const recordes = data.results.map((page) => {
      const p = page.properties;

      return {
        distancia: normalizarDistancia(getText(p["Distância"])),
        marca: getText(p["Marca"]),
        data: p["Data"]?.date?.start || null,
        contexto: p["Contexto"]?.select?.name || null,
        local: getText(p["Local"]),
        strava: p["Strava"]?.url || null,
      };
    });

    const ordem = {
      "5 km": 1,
      "10 km": 2,
      "Meia Maratona": 3,
      "Maratona": 4,
    };

    recordes.sort(
      (a, b) =>
        (ordem[a.distancia] || 99) -
        (ordem[b.distancia] || 99)
    );

    return res.status(200).json(recordes);
  } catch (error) {
    return res.status(500).json({
      error: "Erro interno",
    });
  }
}
