# Photo content moderation

Two independent layers: automated screening at upload time, and manual
user reporting + admin review after the fact. Neither one alone is
sufficient - see "Known limitations" below.

## 1. Automated screening (upload time)

Every photo uploaded via `POST /uploads/` is scored by
[Sightengine](https://sightengine.com)'s `nudity-2.1` model
(`moderation.py`) before it's ever written to storage. `nudity-2.1` is a
context-aware model that separates ordinary suggestive content (swimwear,
bikinis, cleavage - normal and expected in dive/snorkel/beach photos) from
actually explicit content, rather than flagging both the same way a flat
nudity classifier would.

**Rejection rule** (`moderation.EXPLICIT_CATEGORIES`): an upload is rejected
only if Sightengine's `sexual_activity`, `sexual_display`, or `erotica`
score is `>= MODERATION_NUDITY_THRESHOLD` (default `0.5`, configurable via
env). The `very_suggestive` / `suggestive` / `mildly_suggestive` bands -
which is where normal swimwear photos score - never trigger a rejection on
their own.

A rejected upload gets a `422` with a clear, user-facing message and is
**never** written to disk/S3 - no file, no URL, nothing silently dropped.

### Known limitations (read this before trusting it blindly)

This is a real, honest caveat, not boilerplate:

- **False negatives are possible.** Sightengine's nudity model is a
  general-purpose classifier, not one trained specifically on this app's
  content. Unusual poses, heavy filters/crops, illustrations, or just
  content that doesn't resemble its training data can score low despite
  being genuinely explicit. Automated screening is a first line of defense,
  not a guarantee - this is exactly why the manual reporting path in
  section 2 exists alongside it, not as a redundant backup.
- **False positives are possible.** A tightly-cropped, unusually-lit, or
  otherwise atypical swimwear photo can occasionally score into the
  "explicit" bands even though a human would call it obviously fine. If a
  user reports a rejection that looks wrong, that's real signal to reconsider
  `MODERATION_NUDITY_THRESHOLD` - there's no support inbox wired up yet, so
  for now that means paying attention if this comes up.
- **No tuning data yet.** The `0.5` threshold is a reasonable starting
  point, not something derived from this app's actual upload distribution
  (there isn't enough volume yet to derive one from). Revisit it once real
  usage gives you something to look at.

### Fail-open behavior

If Sightengine can't be reached, isn't configured, or returns something
unparseable, **the upload still succeeds** - it is not blocked on a
third-party API's uptime. This was a deliberate choice: these photos aren't
publicly visible anywhere yet (no social/feed feature has shipped), so a
brief unmoderated window is lower-risk than taking down the core
log-a-dive-with-photo flow over a Sightengine hiccup. Revisit this if/when
photos become publicly visible to other users.

Every such upload is recorded as `PhotoModeration(status="skipped")`
(`models.py`) rather than silently treated as clean, specifically so it can
be caught by the recheck job below. `status="checked"` rows store the raw
Sightengine scores (`nudity_scores`, JSON) for later audit.

### Recheck job (closing the fail-open gap)

```
python -m scripts.moderation_admin recheck
```

Re-scans every `PhotoModeration(status="skipped")` row: re-fetches the
stored photo, re-submits it to Sightengine, and **removes** it (deletes the
`AdventurePhoto` row(s) and the stored object) if it now scores as explicit.
Also logs a `WARNING` for any skipped photo that's been unscanned for more
than 24 hours, whether or not this particular run could reach Sightengine
for it - so a Sightengine outage that outlasts a day doesn't silently
accumulate an invisible backlog.

Safe to run repeatedly (already-checked rows are left alone). Run it by
hand for now given current volume; wiring it to cron/a scheduled task later
is a deployment config change, not a code change.

## 2. Manual reporting + admin review

`POST /reports/` lets any authenticated user report an adventure or a
specific photo within one, with a reason
(`nudity_or_sexual_content` / `harassment_or_bullying` / `spam` /
`inappropriate_content` / `other`) and optional free-text details. This
exists ahead of any social/sharing feature specifically to satisfy app
store review requirements for UGC apps (Apple App Store Review Guideline
1.2 and the equivalent Play Store policy) before it's load-bearing, rather
than bolting it on under a launch deadline.

There is no admin role or UI. Review reports directly:

```
# See what's waiting for a decision.
python -m scripts.moderation_admin reports list

# Remove the reported content (just the named photo, or the whole
# adventure if no specific photo was named) and close the report.
python -m scripts.moderation_admin reports resolve <id> --action remove --note "confirmed explicit"

# Close a report with no action taken (e.g. a bad-faith report).
python -m scripts.moderation_admin reports resolve <id> --action dismiss --note "not a violation"
```

Both commands operate directly against the same database the API uses via
`scripts/moderation_admin.py` (`DATABASE_URL` from `.env`) - no separate
credentials or endpoints. Every resolution is timestamped
(`reviewed_at`) with your note (`reviewer_note`) kept for audit.
