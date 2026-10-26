# Internal Access

This implementation follows the owner's revised request: password access on the existing static site, without a separate authentication server. It is **not server-side authorization**. The encrypted bundle is publicly downloadable; a short or guessable shared password can be attacked offline. Use a long unique password for sensitive information, or migrate to a server-side identity service before treating this as a security boundary.

- Password exists only in GitHub Actions secret `INTERNAL_PASSWORD`. It is never embedded in source or a public configuration file.
- Public sync partitions Flow tasks before generating public metadata, search, articles or images. Exact group name `내부 전용`, verified task `sectionId`, and parent relationships determine membership. Root pages as well as descendants are included privately.
- Private titles, body nodes, dates, attachment records and image bytes are serialized only into AES-256-GCM ciphertext at `internal/encrypted.json`. PBKDF2-SHA256 uses 600,000 iterations and a random salt. Each successful sync generates a fresh IV.
- The same hourly Flow workflow updates both areas. Private additions, edits, moves and deletions are reflected on the next successful sync; use the internal refresh button or reload to fetch the latest bundle. A failed collection does not publish partial output.
- `#/internal` and `#/internal/<id>` display the password form until decryption succeeds. Browser Web Crypto performs decryption. A derived key is kept in sessionStorage for that tab's session, never localStorage. Browser session-restore settings may restore sessionStorage. The Lock button explicitly clears it and revokes decrypted image URLs.
- Private data never enters the public search, favorites, recents or recommendation collections. The existing sanitized body renderer is reused with separate image mappings.
- Flow attachment arrays currently contain no sample files in the target group. Their original records are retained inside ciphertext; additional attachments without verified download fields are linked through the original Flow page rather than guessing undocumented API fields. Inline links and images retain original order.
- Previously published data cannot be made secret retroactively: public Git history, caches and copies may retain it even if a page is later moved into the private group. Newly private data must start in that group.

## Password changes

Update repository Settings → Secrets and variables → Actions → `INTERNAL_PASSWORD`, then run `Flow API sync & publish`. Existing sessions fail to decrypt the new bundle and require the new password. Previously downloaded bundles retain their previous password.

## Verified Flow interface

Official documentation: https://api.flow.team/docs/user/posts

Existing requests are reused: `GET /user/posts/projects/2970230/tasks/filter?pageSize=100&cursor=…` and `GET /user/posts/{postId}` with `x-flow-api-key`. Pagination uses `hasNext` and `lastCursor`; details provide `tasks[].SECTION_NAME`, content, dates and attachment arrays. Actual responses were checked before implementation. No unverified group-list endpoint is used.
