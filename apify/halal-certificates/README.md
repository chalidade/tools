# Indonesia Halal Certificate Checker (BPJPH)

Check and export products from **Indonesia's official halal registry**, run by BPJPH (Badan Penyelenggara Jaminan Produk Halal) at [bpjph.halal.go.id](https://bpjph.halal.go.id/cari/sertifikat). Search by **product name, company or certificate number** and get clean JSON, CSV or Excel.

Made for importers, distributors, retailers and marketplaces verifying suppliers, F&B brands watching competitors, and researchers following Indonesia's halal certification (mandatory for most food and drink since October 2024).

## What you get

- **Three ways to search**: product name (`kopi susu`), company (`PT Contoh Pangan`) or certificate number (`ID32110020463611024`)
- **Bulk**: one search per line, as many lines as you like
- **Per product**: certificate number, issue date (as printed and as ISO `YYYY-MM-DD`), product name, brand, company, NIB (when published), business scale code, service and product type codes
- **Factories and outlets** listed on the certificate: name, address, province (name + BPS code), regency/city BPS code, postal code
- **Caps** in total and per search, so a broad word doesn't run away

## Input

```json
{
  "searches": ["kopi susu", "keripik singkong"],
  "searchBy": "produk",
  "maxItems": 200
}
```

## Output

One dataset row per certified product:

```json
{
  "search": "bakmi apin",
  "searchBy": "produk",
  "noSertifikat": "ID32110020463611024",
  "tanggalTerbit": "23 October 2024",
  "tanggalTerbitIso": "2024-10-23",
  "namaProduk": "Yamin Asin/Manis Bakmi Apin",
  "merek": "BAKMI APIN",
  "pelakuUsaha": "SOEPANDHY PITRAJAYA",
  "nib": null,
  "skalaUsaha": "JU.4",
  "jenisLayanan": "A0000",
  "jenisProduk": "A0016",
  "provinsi": "Jawa Barat",
  "pabrik": [
    { "nama": "BAKMI APIN", "alamat": "JALAN SUKAJADI 170", "kodeKabKota": "3273", "kodeProvinsi": "32", "provinsi": "Jawa Barat", "kodePos": "40161", "negara": "Indonesia", "jenisFasilitas": "pabrik" }
  ],
  "scrapedAt": "2026-11-28T11:00:00.000Z"
}
```

To list every product on one certificate, search by certificate number, or group rows by `noSertifikat`.

## Pricing

Pay per product saved. Failed searches are free. The run stops cleanly at your **Max cost per run**.

## Good to know

- Data is what BPJPH publishes in its public search. The registry shows no expiry date, so neither does this Actor.
- The site returns 10 products per page, so 1,000 products is about 100 page loads (a few minutes).
- An empty search would return the whole registry (13+ million products), so at least one search term is required.

## Call it from your code

```bash
curl -X POST "https://api.apify.com/v2/acts/toowl~halal-certificate-checker/run-sync-get-dataset-items" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"searches":["ID32110020463611024"],"searchBy":"sertifikat"}'
```

The same call works from Python (`apify-client`), JavaScript, Make, Zapier and n8n.

## Use it from AI agents (MCP)

```
https://mcp.apify.com/?actors=toowl/halal-certificate-checker
```

Questions or a search that fails? Open an issue on the Actor's **Issues** tab.
