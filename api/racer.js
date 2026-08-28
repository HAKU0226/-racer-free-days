const VENUES = [
  "桐生","戸田","江戸川","平和島","多摩川",
  "浜名湖","蒲郡","常滑","津","三国","びわこ",
  "住之江","尼崎","鳴門","丸亀","児島","宮島",
  "徳山","下関","若松","芦屋","福岡","唐津","大村"
];

function decodeHtml(s) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function htmlToText(html) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<(br|\/p|\/div|\/td|\/th|\/tr|\/li|\/h\d)>/gi, "\n")
     .replace(/<img[^>]*alt=["']([^"']+)["'][^>]*>/gi, "\n$1\n")
    .replace(/<[^>]+>/g, "")
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n+/g, "\n");
}

function toIso(date) {
  const [y, m, d] = date.split("/");
  return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
}

function previousDay(iso) {
  const [y,m,d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y,m-1,d) - 86400000);
  return date.toISOString().slice(0,10);
}

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Cache-Control",
    "s-maxage=300, stale-while-revalidate=3600"
  );

  const number =
    String(req.query.number || req.query.toban || "").trim();

  if (!/^\d{4}$/.test(number)) {
    return res.status(400).json({
      ok: false,
      error: "4桁の登録番号を入力してください"
    });
  }

  try {

    const url =
      "https://www.boatrace.jp/owpc/pc/data/racersearch/profile?toban=" +
      encodeURIComponent(number);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1",
        "Accept-Language": "ja-JP,ja;q=0.9"
      }
    });

    if (!response.ok) {
      throw new Error("BOAT RACE公式ページ取得失敗");
    }

    const html = await response.text();
    const text = htmlToText(html);

    const schedules = [];

    const regex =
      /(\d{4}\/\d{1,2}\/\d{1,2})\s*～\s*(\d{4}\/\d{1,2}\/\d{1,2})/g;

    let match;

    while ((match = regex.exec(text)) !== null) {

      const start = toIso(match[1]);
      const end = toIso(match[2]);

      const contextStart = Math.max(0, match.index - 200);

const contextEnd = Math.min(
  text.length,
  match.index + match[0].length + 200
);

const context =
  text.slice(contextStart, contextEnd);

const datePos =
  match.index - contextStart;

let venue = "";
let bestDistance = Infinity;

for (const v of VENUES) {

  let pos = context.indexOf(v);

  while (pos !== -1) {

    const distance =
      Math.abs(pos - datePos);

    if (distance < bestDistance) {
      bestDistance = distance;
      venue = v;
    }

    pos = context.indexOf(v, pos + 1);
  }
}

      if (
        !schedules.some(
          x => x.start === start &&
               x.end === end &&
               x.venue === venue
        )
      ) {
        schedules.push({
          start,
          end,
          precheck: previousDay(start),
          venue
        });
      }
    }
const cleanedSchedules = schedules.filter((r, i, arr) => {

  return !arr.some((x, j) => {

    if (
      j === i ||
      x.venue !== r.venue ||
      x.end !== r.end
    ) {
      return false;
    }

    const a = new Date(r.start + "T00:00:00");
    const b = new Date(x.start + "T00:00:00");

    const diff =
      Math.abs(a - b) / 86400000;

    return diff <= 1 && x.start > r.start;
  });
});
    return res.status(200).json({
      ok: true,
      number,
      schedules: cleanedSchedules,
      source: "BOAT RACE公式"
    });

  } catch (error) {

    return res.status(500).json({
      ok: false,
      error: error.message || String(error)
    });

  }
}
