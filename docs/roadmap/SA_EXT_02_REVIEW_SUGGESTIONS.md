# SA-EXT-02 — personal review suggestions

The progress page derives optional re-reading suggestions from the most recent 100 completed attempts returned by the private history API. Only personal attempts are considered. Group attempts are labeled separately and do not influence the personal schedule. No automatic message or background notification is sent.

For each passage, a first complete personal attempt suggests re-reading after one UTC calendar day. Consecutive perfect results use intervals of 1, 3, 7, then 14 days; a result containing mistakes resets the interval to one day. The schedule is calculated from the latest attempt in creation order, even if an older incomplete finalization was later recovered. Malformed records do not produce a guess. The link opens the existing reader, which applies its normal active-attempt guard.

These are simple reminders based on repeated attempts, not evidence of independent mastery or a replacement for the planned richer learning-memory and difficulty system. The latest-100 limit can exclude old passages, and guest history is not synchronized. Actual reading, source review, browser and physical NVDA acceptance remain separate checks.
