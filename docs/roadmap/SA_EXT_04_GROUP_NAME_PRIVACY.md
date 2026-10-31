# SA-EXT-04 — member control of public name visibility

Every current member, including owners and facilitators, can grant or withdraw permission to display their name in the public member list without leaving the group. The existing `public_name` field remains the only authority. A group owner choosing a names roster does not override individual consent. The UI explains that the owner still sees membership names for group management; this control is not anonymity from the owner.

The existing groups endpoint exposes authenticated `action=name-visibility`: GET returns only the current account's boolean choice; POST requires strict boolean desired and expected values, updates only that account's current membership and checks the expected stored value in SQL. A stale request or lost membership receives 409. A malformed stored flag or missing D1 acknowledgement produces 503, never fabricated consent. A missing profile does not prevent withdrawal. No migration or new identity store is introduced.

The native labelled checkbox stays disabled until a valid choice is read. Failed/conflicting saves preserve the selection and require explicit refresh before retry. Successful saving rereads and refreshes the visible roster; status and keyboard focus remain on the member control. Retained controls and delayed read/save/roster replies are guarded against account or route changes. Nothing is sent as a notification.

Tests execute the actual route against all migrated SQLite tables and the actual browser-independent controller. They cover granting/revoking, isolation from other members, malformed values/receipts, lost membership, missing profile, no default grant during read failure, explicit recovery, duplicate clicks and account changes before/after requests. The disposable HTTP Worker flow checks that public roster membership increases on grant and disappears on withdrawal while group membership remains.

This is completed source functionality after its merge, not a claim that the full home-group section or platform is finished. Physical browser/Windows NVDA and publication need their own evidence. Sites access remains unavailable for the existing project in this session.
