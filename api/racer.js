export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const number = String(req.query.number || "").trim();

  if (!number) {
    return res.status(400).json({
      ok: false,
      error: "登録番号を入力してください"
    });
  }

  try {
    const url =
      "https://www.boatrace.jp/owpc/pc/data/racersearch/profile?toban=" +
      encodeURIComponent(number);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const html = await response.text();

    return res.status(200).json({
      ok: true,
      number,
      fetched: response.ok,
      htmlLength: html.length
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: String(error)
    });
  }
}
