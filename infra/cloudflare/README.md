# Cloudflare Edge Configuration

This directory tracks Cloudflare edge configuration in version control.
The edge decides whether the site works, but historically had no record in git.
Previously, custom WAF rules configured solely in the dashboard blocked the site's own `/api/*` and `/admin/*` paths, taking the contact form, OG images, and admin panel offline without repository visibility.
The domain Worker is defined at the repository root in `wrangler.jsonc`.

## WAF Rules (`waf-rules.json`)

The sibling file `waf-rules.json` exports custom WAF rules for zone `mikezamayias.com` (phase `http_request_firewall_custom`, ruleset `85128067c7974500bdbd63bbaeb9d014`).
It is strictly a review and drift-detection artifact, not something applied automatically.
Nothing reads it at deploy time.

## Re-exporting Rules

The API token is stored in `.env.shared.sops.yaml` as `CLOUDFLARE_API_TOKEN` (SOPS + age encrypted), scoped to zone WAF and settings.
To re-export the ruleset and strip volatile fields (`version`, `last_updated`, and per-rule `id`), run:

```bash
TOKEN=$(sops -d --extract '["CLOUDFLARE_API_TOKEN"]' .env.shared.sops.yaml)
ZONE_ID=$(curl -s "https://api.cloudflare.com/client/v4/zones?name=mikezamayias.com" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.result[0].id')

curl -s "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets/85128067c7974500bdbd63bbaeb9d014" \
  -H "Authorization: Bearer $TOKEN" | jq --indent 4 '{
  _comment: [
    "Exported from Cloudflare, zone mikezamayias.com, phase http_request_firewall_custom.",
    "Review and drift-detection artifact only — nothing reads this at deploy time.",
    "Volatile fields (version, last_updated, per-rule id) are omitted so diffs show intent.",
    "Re-export instructions: see README.md in this directory."
  ],
  zone: "mikezamayias.com",
  ruleset: { name: .result.name, phase: .result.phase, kind: .result.kind },
  rules: [.result.rules[] | { description, expression, action, enabled, ref }]
}' > infra/cloudflare/waf-rules.json
```

## Drift Detection

To check for drift between Cloudflare and git, re-export the ruleset and inspect the diff:

```bash
git diff infra/cloudflare/waf-rules.json
```

## Dashboard Changes

If you change a rule in the Cloudflare dashboard, re-export `waf-rules.json` and commit it.
Always include the updated export in the same pull request as the change that motivated the rule modification.

## Preserving the `/_headers` Rule

Do not remove the rule blocking requests to `/_headers` as a Netlify leftover.
`/_headers` is a real Cloudflare Workers Static Assets convention used to configure response headers.
The repository may adopt it for security headers, so public access to that path must remain blocked.
