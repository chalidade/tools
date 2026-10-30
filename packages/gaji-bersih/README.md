# @chalidade/gaji-bersih

An Indonesian take-home pay estimate for any website: one `<script>` tag, one
element. From gross monthly salary to net pay, with every deduction and the tax
working shown. **Everything runs in the visitor's browser**; no salary is sent
anywhere.

It is for employees in Indonesia and the sites that serve them (job boards, HR
blogs, payroll explainers). It deducts **PPh 21** (Indonesian employee income
tax: annual progressive brackets of 5–35% after a 5% job-expense deduction and
the *PTKP* non-taxable allowance for the family status) and the employee's
**BPJS** social-security contributions (health 1%, old-age savings JHT 2%,
pension JP 1%, each with its wage ceiling). Rates were last reviewed on
2025-03-01.

**This is an estimate, not tax advice.** It averages the full-year tax per
month; the monthly withholding on a payslip uses the TER tables and only meets
this figure at the December true-up. Bonuses, THR, overtime and the surcharge
for employees without a tax ID (NPWP) are not included.

This is the [Take-Home Pay Calculator](https://chalidade.github.io/tools/#/gaji-bersih) tool from
[chalidade/tools](https://github.com/chalidade/tools), packaged so you can drop
it into your own site. Try it there first.

## Install in 10 seconds

Paste this into any HTML page (WordPress, Blogger, Webflow, plain HTML):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@chalidade/gaji-bersih@0/dist/element.js"></script>

<take-home-pay></take-home-pay>
```

### Attributes

| Attribute | Value | Default |
| --- | --- | --- |
| `theme` | `auto` (follows the system), `light`, `dark` | `auto` |
| `lang` | `en` or `id`, the UI language | the visitor's browser language |

### Colors

The element uses Shadow DOM, so your site's CSS can't break it (and vice versa).
Change its accent colors with CSS variables:

```css
take-home-pay {
  --sr-brand-1: #0ea5e9; /* accent gradient, light and dark */
  --sr-brand-2: #6366f1;
  --radius: 0.5rem;      /* corner radius */
}
```

## Use with npm

```bash
npm install @chalidade/gaji-bersih
```

```js
import '@chalidade/gaji-bersih/element' // registers <take-home-pay>
```

In React, `<take-home-pay theme="light" />` works directly in JSX (React 19
passes attributes through to custom elements).

## Headless API

No UI, no React, about 1 KB gzipped:

```js
import { netSalary } from '@chalidade/gaji-bersih'

netSalary({ gross: 10_000_000, married: false, dependents: 0, bpjs: true })
// { gross: 10000000, kesEmployee: 100000, jhtEmployee: 200000, jpEmployee: 100000,
//   taxableYear: 61848000, ptkp: 54000000, taxYear: 3277200, taxMonth: 273100,
//   effectivePct: 2.73, takeHome: 9326900 }   (effectivePct rounded here)

Math.round(netSalary({ gross: 15_000_000, married: true, dependents: 2, bpjs: true }).takeHome)
// 13619951
```

- Employer-paid premiums (BPJS health 4%, JKK, JKM) count as taxable income, as
  the regulation says; they are not deducted from take-home pay.
- A gross that is negative, `NaN` or infinite counts as 0; `dependents` is
  clamped to 0–3.
- Every rate and ceiling is exported (`BRACKETS`, `PTKP_SELF`, `JP_CAP`, …,
  `RATES_AS_OF`), so you can show them or check them against the current rules.

## License

MIT © Chalid Ade Rahman. The element bundles third-party libraries, see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
