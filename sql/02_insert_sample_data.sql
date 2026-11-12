-- SOFT807 Assessment 1, Task 2: SkyBridge Services Portal
-- Script 2 of 2: insert sample data (run after 01_create_schema.sql)
--
-- The script can be run again: it empties the tables first.
-- All people and client organisations are fictional. E-mail addresses use the
-- reserved ".example" domain. Package scope and prices are modelled on public
-- market information (see DATA_SOURCES.md); prices are NZD, excluding GST.
--
-- Demo accounts (passwords are stored only as bcrypt hashes, cost factor 10):
--   admin     admin@skybridge.example          SkyAdmin2026!
--   customers aroha.ngata@kauricoast.example   Customer2026!   (same password for all five)

BEGIN;

TRUNCATE order_items, orders, cart_items, carts, products, categories, users, session RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------------------------
-- Users: 1 administrator + 5 customers
-- ---------------------------------------------------------------------------
INSERT INTO users (id, full_name, email, phone, password_hash, role, created_at) OVERRIDING SYSTEM VALUE VALUES
(1, 'Elena Torres',    'admin@skybridge.example',              '+64 9 555 0100',  '$2b$10$OW.jn31BTbtjlGAQfSxyHe2E0TSYEPcvAvHDwXWaad.t08ZoZIEUK', 'admin',    '2026-06-01 09:00:00+12'),
(2, 'Aroha Ngata',     'aroha.ngata@kauricoast.example',       '+64 21 555 0142', '$2b$10$SpaFxVKFRg5XrNKz1maDReFB1GB3oL4jdrW0xKBnsMNvW.vpuurYm', 'customer', '2026-07-08 10:15:00+12'),
(3, 'Daniel Whitmore', 'daniel.whitmore@harbourline.example',  '+64 27 555 0178', '$2b$10$GxzI8g1Eo31YakTPX0hzP.Yphx9q7UBU8mRVwCyFMM/fp79v0t2Mi', 'customer', '2026-07-29 14:40:00+12'),
(4, 'Mei Lin Chen',    'meilin.chen@tasmanfresh.example',      '+64 22 555 0116', '$2b$10$LsmLm8nAjSNemUXt6.H95ute7Qui.9yJ/z/caEavWAMnN7HsVeqPa', 'customer', '2026-09-11 08:55:00+12'),
(5, 'Sione Tuilagi',   'sione.tuilagi@southernlakes.example',  '+64 3 555 0164',  '$2b$10$0Enihuta6zTiZiXxoR5.E.d8XnMQuTngMYJ2MbcSzxDbo/y.JBJmG', 'customer', '2026-09-20 16:20:00+12'),
(6, 'Priya Raman',     'priya.raman@wellingtonmakers.example', '+64 4 555 0131',  '$2b$10$yu5McnUy/GWPsxfBurvSdePWINRpO6smGoganKxswhNpktnrv9xUa', 'customer', '2026-08-12 11:05:00+12');

-- ---------------------------------------------------------------------------
-- Categories: the three SkyBridge service lines
-- ---------------------------------------------------------------------------
INSERT INTO categories (id, name, slug, description) OVERRIDING SYSTEM VALUE VALUES
(1, 'Security and Compliance Audits',          'security', 'Assessments and continuous monitoring of organisational security.'),
(2, 'DevOps Process Automation',               'devops',   'Streamlined development and operational workflows.'),
(3, 'Business Intelligence and Reporting',     'bi',       'Data turned into insights for strategic decisions.');

-- ---------------------------------------------------------------------------
-- Products: 12 service packages, 4 per category
-- ---------------------------------------------------------------------------
INSERT INTO products (id, category_id, name, summary, description, features, price, unit, duration, image_url) OVERRIDING SYSTEM VALUE VALUES
(1, 1, 'Web Application Penetration Test',
 'Manual security test of one web application against the OWASP Top 10.',
 'Our testers attack one web application in the same way a real attacker would, using manual techniques supported by automated scanning. The test follows the OWASP Web Security Testing Guide and covers authentication, session management, access control, input handling and business logic. You receive a report with every finding rated by risk, the steps to reproduce it and clear advice on how to fix it. One retest of the fixed findings is included.',
 ARRAY['Scoping workshop and rules of engagement', 'Manual testing against the OWASP Top 10', 'Authenticated testing with up to three user roles', 'Risk-rated report with remediation advice', 'One retest within 60 days'],
 9800.00, 'project', '2 weeks', '/img/security-audit.svg'),

(2, 1, 'ISO/IEC 27001 Gap Assessment',
 'Review of your information security management against ISO/IEC 27001:2022.',
 'We compare your current policies, processes and technical controls with the requirements of ISO/IEC 27001:2022, including the 93 controls in Annex A. The assessment combines document review with interviews of key staff. The result is a gap report and a prioritised roadmap that shows what has to be done before a certification audit, with effort estimates for each item.',
 ARRAY['Review of existing policies and procedures', 'Interviews with up to eight staff members', 'Assessment of all 93 Annex A controls', 'Gap report with maturity rating per clause', 'Prioritised roadmap to certification'],
 8500.00, 'project', '3 weeks', '/img/security-audit.svg'),

(3, 1, 'Privacy Act 2020 Compliance Review',
 'Check of how personal information is collected, stored and shared under New Zealand law.',
 'A review of your handling of personal information against the 13 information privacy principles of the New Zealand Privacy Act 2020. We map where personal information enters, moves through and leaves the organisation, check your privacy statement and retention rules, and test the process for notifiable privacy breaches. The package suits small and medium organisations that hold customer or patient data.',
 ARRAY['Personal information inventory and data-flow map', 'Review against the 13 information privacy principles', 'Privacy statement and consent wording check', 'Privacy breach response procedure', 'Action plan with owners and due dates'],
 4900.00, 'project', '2 weeks', '/img/security-audit.svg'),

(4, 1, 'Continuous Security Monitoring',
 'Monthly vulnerability scanning, log review and a security status report.',
 'An ongoing service for organisations without their own security team. Each month we scan your internet-facing systems and cloud accounts for new vulnerabilities and configuration drift, review security alerts, and send a short report that explains what changed and what needs attention. Critical findings are reported within one business day. Order one unit for each month of service.',
 ARRAY['Monthly external vulnerability scan', 'Cloud configuration review against CIS Benchmarks', 'Alert review during business hours', 'Critical findings reported within one business day', 'Monthly status report and review call'],
 2400.00, 'month', 'Ongoing, billed monthly', '/img/security-monitor.svg'),

(5, 2, 'CI/CD Pipeline Starter',
 'A working build, test and deploy pipeline for one application.',
 'We set up a continuous integration and continuous delivery pipeline for one application with GitHub Actions. Each commit is built, tested and scanned, and approved changes are deployed to a staging and a production environment on your cloud platform. The package includes a handover session so that your developers can maintain the pipeline themselves.',
 ARRAY['Pipeline for one repository with GitHub Actions', 'Automated build, unit tests and dependency scan', 'Deployment to staging and production with approval', 'Secrets stored in the platform secret store', 'Documentation and a two-hour handover session'],
 6900.00, 'project', '2 weeks', '/img/devops-pipeline.svg'),

(6, 2, 'Infrastructure as Code Foundation',
 'Your cloud environment described in Terraform and deployed from version control.',
 'We rebuild the core of your cloud environment as code with Terraform: network, compute, database and identity. Infrastructure changes are then reviewed in pull requests and applied by a pipeline, not by hand in the portal. You get the same environment for development, test and production, and a full history of who changed what.',
 ARRAY['Terraform modules for network, compute and database', 'Remote state with locking', 'Separate development, test and production environments', 'Plan and apply through a pipeline with review', 'Tagging and naming standard for cost reporting'],
 12500.00, 'project', '4 weeks', '/img/devops-cloud.svg'),

(7, 2, 'DevOps Maturity Assessment',
 'A one-week review of how your team builds, tests and releases software.',
 'We measure your software delivery with the four DORA metrics: deployment frequency, lead time for changes, change failure rate and time to restore service. Through interviews and a review of your tools we find the bottlenecks between a commit and a release. The report gives a baseline for each metric and a short list of improvements ordered by expected effect.',
 ARRAY['Interviews with developers and operations staff', 'Baseline of the four DORA metrics', 'Review of source control, build and release tools', 'Value stream map from commit to production', 'Improvement plan with quick wins'],
 3900.00, 'project', '1 week', '/img/devops-pipeline.svg'),

(8, 2, 'Managed DevOps Support',
 'A monthly retainer for pipeline maintenance, releases and cloud cost control.',
 'A SkyBridge engineer looks after your pipelines and cloud environments for a fixed monthly fee. The retainer covers up to 30 hours each month for pipeline fixes, release support, patching of base images and a monthly cost review. It suits teams that have automation in place but no dedicated DevOps engineer. Order one unit for each month of service.',
 ARRAY['Up to 30 engineering hours each month', 'Pipeline and release support', 'Patching of base images and runners', 'Monthly cloud cost and usage review', 'Response within four business hours'],
 5200.00, 'month', 'Ongoing, billed monthly', '/img/devops-cloud.svg'),

(9, 3, 'Dashboard in a Day Workshop',
 'A hands-on Power BI workshop for up to ten staff, using your own data.',
 'A one-day workshop that takes your team from a spreadsheet to a published dashboard. In the morning we cover data import, cleaning and modelling; in the afternoon each participant builds a report page from a sample of your own data. The workshop runs on site or online. Order one unit for each workshop day.',
 ARRAY['One trainer for up to ten participants', 'Data import, cleaning and modelling basics', 'Report design with your own sample data', 'Publishing and sharing in the Power BI service', 'Workbook and exercise files to keep'],
 1950.00, 'day', '1 day', '/img/bi-dashboard.svg'),

(10, 3, 'Power BI Dashboard Starter',
 'Three interactive dashboards built on one data source.',
 'We design and build three Power BI dashboards for one business area such as sales, finance or operations. The work starts with a short workshop to agree on the measures that matter, followed by data modelling, report design and a review round with your users. Scheduled refresh and row-level security are set up before handover.',
 ARRAY['Requirements workshop and measure definitions', 'Data model on one data source', 'Three dashboards with drill-down', 'Scheduled refresh and row-level security', 'User guide and handover session'],
 9500.00, 'project', '3 weeks', '/img/bi-dashboard.svg'),

(11, 3, 'Data Warehouse Foundation',
 'A cloud data warehouse that brings up to five source systems together.',
 'We build a cloud data warehouse as the single source for your reporting. Data from up to five source systems is loaded every night, cleaned and stored in a dimensional model that business users can understand. The package includes data quality checks, documentation of every table and a first set of reports to prove the model.',
 ARRAY['Source system analysis for up to five systems', 'Nightly load pipelines with monitoring', 'Dimensional model with conformed dimensions', 'Automated data quality checks', 'Data dictionary and first report set'],
 28000.00, 'project', '8 weeks', '/img/bi-warehouse.svg'),

(12, 3, 'Monthly Reporting Service',
 'Your management report pack prepared and checked every month.',
 'We prepare your monthly management report pack so that your team can spend its time on decisions. Each month we refresh the data, check it against the source systems, update up to ten report pages and add a one-page commentary on the main changes. Order one unit for each month of service.',
 ARRAY['Monthly data refresh and reconciliation', 'Up to ten report pages maintained', 'One-page commentary on key changes', 'Two small report changes each month', 'Delivery by the fifth business day'],
 1800.00, 'month', 'Ongoing, billed monthly', '/img/bi-warehouse.svg');

-- ---------------------------------------------------------------------------
-- Orders and order items (gst = 15% of subtotal)
-- ---------------------------------------------------------------------------
INSERT INTO orders (id, user_id, status, company_name, contact_phone, notes, subtotal, gst, total, created_at) OVERRIDING SYSTEM VALUE VALUES
(1, 2, 'completed',   'Kauri Coast Logistics Ltd',     '+64 21 555 0142', 'Customer portal for freight bookings. Testing window outside business hours.', 9800.00,  1470.00, 11270.00, '2026-07-14 11:30:00+12'),
(2, 6, 'completed',   'Wellington Makers Co-operative', '+64 4 555 0131',  '',                                                                             3900.00,  585.00,  4485.00,  '2026-08-20 09:10:00+12'),
(3, 3, 'completed',   'Harbourline Credit Union',      '+64 27 555 0178', 'Needed before the annual external audit in November.',                         13400.00, 2010.00, 15410.00, '2026-08-05 15:45:00+12'),
(4, 2, 'in_progress', 'Kauri Coast Logistics Ltd',     '+64 21 555 0142', 'Six months of monitoring after the penetration test.',                          14400.00, 2160.00, 16560.00, '2026-09-02 10:05:00+12'),
(5, 3, 'cancelled',   'Harbourline Credit Union',      '+64 27 555 0178', 'Postponed to the next financial year.',                                         12500.00, 1875.00, 14375.00, '2026-09-10 13:20:00+12'),
(6, 4, 'confirmed',   'Tasman Fresh Produce Ltd',      '+64 22 555 0116', 'Sales and stock dashboards. Workshop for the Nelson office.',                   11450.00, 1717.50, 13167.50, '2026-09-18 09:35:00+12'),
(7, 5, 'in_progress', 'Southern Lakes Health Network', '+64 3 555 0164',  'Sources: patient management, finance, HR, rostering.',                          33400.00, 5010.00, 38410.00, '2026-09-25 16:50:00+12'),
(8, 6, 'confirmed',   'Wellington Makers Co-operative', '+64 4 555 0131',  'Online shop repository first.',                                                 22500.00, 3375.00, 25875.00, '2026-10-01 10:40:00+13'),
(9, 4, 'pending',     'Tasman Fresh Produce Ltd',      '+64 22 555 0116', '',                                                                             4900.00,  735.00,  5635.00,  '2026-10-09 14:15:00+13');

INSERT INTO order_items (order_id, product_id, product_name, unit, unit_price, quantity) VALUES
(1, 1,  'Web Application Penetration Test',   'project', 9800.00,  1),
(2, 7,  'DevOps Maturity Assessment',         'project', 3900.00,  1),
(3, 2,  'ISO/IEC 27001 Gap Assessment',       'project', 8500.00,  1),
(3, 3,  'Privacy Act 2020 Compliance Review', 'project', 4900.00,  1),
(4, 4,  'Continuous Security Monitoring',     'month',   2400.00,  6),
(5, 6,  'Infrastructure as Code Foundation',  'project', 12500.00, 1),
(6, 10, 'Power BI Dashboard Starter',         'project', 9500.00,  1),
(6, 9,  'Dashboard in a Day Workshop',        'day',     1950.00,  1),
(7, 11, 'Data Warehouse Foundation',          'project', 28000.00, 1),
(7, 12, 'Monthly Reporting Service',          'month',   1800.00,  3),
(8, 5,  'CI/CD Pipeline Starter',             'project', 6900.00,  1),
(8, 8,  'Managed DevOps Support',             'month',   5200.00,  3),
(9, 3,  'Privacy Act 2020 Compliance Review', 'project', 4900.00,  1);

-- ---------------------------------------------------------------------------
-- One saved cart (Sione Tuilagi), so the cart page has data straight after login
-- ---------------------------------------------------------------------------
INSERT INTO carts (id, user_id) VALUES ('7b1f6c1e-3a52-4d0f-9c1b-5d2e8f4a6b10', 5);

INSERT INTO cart_items (cart_id, product_id, quantity) VALUES
('7b1f6c1e-3a52-4d0f-9c1b-5d2e8f4a6b10', 4, 12),
('7b1f6c1e-3a52-4d0f-9c1b-5d2e8f4a6b10', 7, 1);

-- ---------------------------------------------------------------------------
-- Move the identity sequences past the ids inserted above
-- ---------------------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('users', 'id'),      (SELECT max(id) FROM users));
SELECT setval(pg_get_serial_sequence('categories', 'id'), (SELECT max(id) FROM categories));
SELECT setval(pg_get_serial_sequence('products', 'id'),   (SELECT max(id) FROM products));
SELECT setval(pg_get_serial_sequence('orders', 'id'),     (SELECT max(id) FROM orders));

COMMIT;
