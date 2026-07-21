# Operations and trust boundary

`start.sh` only runs already-prepared processes and refuses occupied ports. Installation, migrations, and demo fixtures are explicit scripts. Production must use a dedicated database and must never run `seed-demo.sh`.

Only authentication, health, and remediation workflows are supported by default. Historical generated/model routes return `410 prototype_route_quarantined`. `ENABLE_LEGACY_PROTOTYPE_ROUTES=true` is a local inspection opt-in and is rejected in production.

`/api/remediation-workflows` accepts only an authorized host scope, source revision, patch manifest, and reproducible before/after axe evidence. It blocks private/internal and credential-bearing URLs, records regressions as durable failures, and requires an independent manual reviewer with an assistive-technology evidence reference. It does not crawl a URL inside the API process or certify WCAG/ADA conformance.

Authenticated browser workers, pull-request creation, issue trackers, and manual assistive-technology review remain external systems. Their absence is reported as an integration boundary, not replaced by seed records or model output.
