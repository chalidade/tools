# LPSE Tender Scraper — Indonesian government procurement (SPSE)

Get **Indonesian government tenders (lelang)** as clean JSON, CSV or Excel: package name, agency, current stage, **HPS budget as a number in rupiah**, contract value, procurement type and method, plus (optionally) the full announcement.

Data comes from **SPSE on [spse.inaproc.id](https://spse.inaproc.id)**, where every LPSE now lives (`spse.inaproc.id/<agency>/`). Scan one agency, a list, or **all ~600 at once**.

Made for contractors, consultants and suppliers hunting new tenders, bid-tracking services, journalists and researchers following public spending.

## What you get

- **Any LPSE**: agency slugs like `lkpp`, `jakarta`, `jatimprov`, `pu`, or `*` for every agency
- **Filters**: fiscal year, keyword (same as the site's search box), stage (e.g. only `Pengumuman` = still open), minimum and maximum HPS
- **Money as numbers**: `1.500.000.000,00` becomes `1500000000`, the original text is kept next to it
- **Announcement details** (optional): location, work unit, funding source, business qualification and the rest of the announcement table, as label → value
- **Direct links** to each tender's announcement and schedule page
- **Newest first**, with a cap in total and per agency

## Input

```json
{
  "lpse": ["jakarta", "jatimprov"],
  "tahun": 2026,
  "keyword": "jalan",
  "tahapan": "Pengumuman",
  "minHps": 1000000000,
  "includeDetails": true,
  "maxItems": 200
}
```

The agency slug is the part after `spse.inaproc.id/` in the LPSE address. Full links are accepted too.

## Output

One dataset row per tender:

```json
{
  "kode": "10012345000",
  "namaPaket": "Pembangunan Jalan Lingkungan Kelurahan X",
  "instansi": "Pemerintah Daerah Provinsi DKI Jakarta",
  "tahapan": "Pengumuman Pascakualifikasi",
  "hps": 1500000000,
  "hpsText": "1.500.000.000,00",
  "nilaiKontrak": null,
  "jenisPengadaan": "Pekerjaan Konstruksi",
  "metode": "Tender",
  "tahunAnggaran": "2026",
  "lpse": "jakarta",
  "url": "https://spse.inaproc.id/jakarta/lelang/10012345000/pengumumanlelang",
  "jadwalUrl": "https://spse.inaproc.id/jakarta/lelang/10012345000/jadwal",
  "pengumuman": { "Satuan Kerja": "…", "Lokasi Pekerjaan": "…", "Kualifikasi Usaha": "…" },
  "scrapedAt": "2026-11-28T10:30:00.000Z"
}
```

A `SUMMARY` record in the key-value store lists how many tenders were saved and any agency that failed.

## Pricing

Pay per tender saved. Agencies that fail and tenders filtered out are free. The run stops cleanly at your **Max cost per run**.

## Good to know

- Tender announcements are public information that agencies must publish (Perpres 16/2018). This Actor reads only the public listing and announcement pages, no login, and respects the site's `Crawl-delay: 1` (one request per second).
- Run it on a **schedule** (e.g. every morning) with `tahapan: "Pengumuman"` to get only tenders still open for bids.
- No proxy is needed normally. If runs start getting blocked, switch on Apify Proxy with country **Indonesia (ID)**.

## Call it from your code

```bash
curl -X POST "https://api.apify.com/v2/acts/toowl~lpse-tender-scraper/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"lpse":["jakarta"],"keyword":"konsultan","tahapan":"Pengumuman","maxItems":50}'
```

The same call works from Python (`apify-client`), JavaScript, Make, Zapier and n8n.

## Use it from AI agents (MCP)

```
https://mcp.apify.com/?actors=toowl/lpse-tender-scraper
```

Questions or an agency that fails? Open an issue on the Actor's **Issues** tab.
