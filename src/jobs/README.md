# jobs/

In-process scheduled triggers (node-cron) for scheduled full/incremental
sync and the sync-error retry sweep. Jobs call into `sync/` — they never
contain sync logic themselves. See `docs/ARCHITECTURE.md` §7 and
`docs/DEPLOYMENT.md` §5 for the single-process constraint under iisnode.
