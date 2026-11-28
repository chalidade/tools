# Indonesia Food Prices Daily (Bank Indonesia PIHPS)

Daily **food commodity prices in Indonesia** from Bank Indonesia's **PIHPS** (Pusat Informasi Harga Pangan Strategis Nasional, [bi.go.id/hargapangan](https://www.bi.go.id/hargapangan)), as one clean row per commodity per day: rice, chicken, beef, eggs, shallots, garlic, red and bird's-eye chillies, sugar, cooking oil and more.

Made for F&B businesses and restaurants watching costs, traders and distributors, analysts and journalists tracking inflation, and anyone building a dashboard or alert on staple prices.

## What you get

- **National, per province or per city**: `DKI Jakarta`, `Jawa Barat / Kota Bandung`, or empty for the national average
- **Four market types**: traditional market, modern market, wholesale (pedagang besar), producer
- **Any date range**, daily or the site's weekly / monthly averages
- **Long format**: one row per commodity per date, price as a number (`"16,550"` becomes `16550`), ISO dates, ready for a spreadsheet, BI tool or database
- **Group averages** (e.g. "Beras" = all rice qualities) kept and marked, or left out
- **Filter** to the commodities you care about (`beras`, `cabai`, `bawang`…)

## Input

```json
{
  "locations": ["", "DKI Jakarta", "Jawa Timur / Kota Surabaya"],
  "priceTypes": ["1"],
  "startDate": "2026-11-01",
  "endDate": "2026-11-28",
  "commodities": ["beras", "cabai"]
}
```

Run it **daily on a schedule** with no dates to keep a fresh week of prices.

## Output

```json
{
  "tanggal": "2026-11-24",
  "komoditas": "Beras Kualitas Bawah I",
  "kelompok": "Beras",
  "rataRataKelompok": false,
  "harga": 15000,
  "jenisPasar": "Pasar Tradisional",
  "laporan": "harian",
  "wilayah": "Nasional",
  "provinsi": null,
  "kabKota": null,
  "sumber": "PIHPS Bank Indonesia"
}
```

Prices are in rupiah per the site's unit for that commodity (per kg for most, per litre for cooking oil). Days the site has no price for are skipped.

## Pricing

Pay per price record saved. Failed areas are free. The run stops cleanly at your **Max cost per run**.

## Good to know

- The latest day is usually published a day late, so a range ending today often stops at yesterday.
- Data and figures belong to Bank Indonesia's PIHPS; cite "PIHPS Nasional, Bank Indonesia" when you publish them.
- Requests are spaced one second apart.

## Call it from your code

```bash
curl -X POST "https://api.apify.com/v2/acts/toowl~indonesia-food-prices/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"locations":["DKI Jakarta"],"commodities":["cabai"]}'
```

The same call works from Python (`apify-client`), JavaScript, Make, Zapier and n8n.

## Use it from AI agents (MCP)

```
https://mcp.apify.com/?actors=toowl/indonesia-food-prices
```

Questions or an area that fails? Open an issue on the Actor's **Issues** tab.
