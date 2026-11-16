# Where the sample data comes from

`SQL-Script-DML.txt` (A1 name: `02_insert_sample_data.sql`) was written with Claude on 14 Oct 2026. This file records what is real-world based and what is invented, for the AI declaration and in case the report mentions the data.

## Invented
- All customers, client organisations, orders, phone numbers and e-mail addresses. E-mail addresses use the reserved `.example` domain.
- The administrator "Elena Torres" is the founder named in the assessment scenario.
- The package names, descriptions and "what is included" lists were written for this project. They are not copied from any provider.

## Based on public market information
The package types and price levels follow what security, DevOps and BI consultancies publish. The web search on 14 Oct 2026 found **no New Zealand price lists**; the pages below give global ranges, mostly in USD and mostly from vendors. The NZD prices in the script are round demonstration figures chosen to sit in or near these ranges. They are not currency conversions and not quotes.

| Package group | What the pages said (as summarised by the search tool) | Page |
|---|---|---|
| Web application penetration test | Typical range about USD 5,000–30,000; very low quotes are usually automated scans | https://www.redfoxsec.com/blog/how-much-does-web-application-penetration-testing-cost-2026-pricing-guide · https://andersenlab.com/blueprint/penetration-testing-costs-2026 · https://7asecurity.com/blog/2025/11/web-app-pen-test-cost/ |
| ISO 27001 / SOC 2 gap or readiness assessment | Outsourced ISO 27001 gap assessment about USD 5,000–8,000; SOC 2 readiness about USD 5,000–25,000 | https://www.brightdefense.com/resources/soc-2-certification-cost/ · https://secureframe.com/blog/how-much-does-soc-2-cost · https://thoropass.com/blog/soc-2-audit-cost-a-guide |
| DevOps packages and retainers | Pricing models: fixed project, monthly retainer, hybrid; retainers reported from about USD 5,000 per month; assessments sold as separate fixed-scope work | https://www.supportsages.com/blog/devops-as-a-service-pricing · https://www.getmonetizely.com/articles/how-much-should-you-pay-for-managed-devops-and-devsecops-services |
| Power BI dashboards, workshops, data warehouse | Small business, 2–4 dashboards on one source: about USD 5,000–25,000; "Dashboard in a Day" style workshops sold as fixed packages; warehouse projects from about USD 75,000 at enterprise scale | https://ecosire.com/de/blog/power-bi-implementation-cost-2026 · https://marketplace.microsoft.com/es-es/marketplace/consulting-services/sikich.powerbi_workshop (the search returned these language versions; look for the English pages) |

## Standards and laws named in the descriptions
OWASP Top 10 and Web Security Testing Guide, ISO/IEC 27001:2022 (93 Annex A controls), New Zealand Privacy Act 2020 (13 information privacy principles, notifiable privacy breaches), CIS Benchmarks, the four DORA metrics, GitHub Actions, Terraform, Power BI. These details were written from general knowledge, not checked against the official pages in this session.

## Before citing anything from this file
None of these pages is in the master `sources.md`. The summaries above come from a search tool, not from reading each page in full. Open and check a page yourself before you cite it, and add it to `sources.md` first (project rule).
