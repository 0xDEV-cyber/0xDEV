# 0xDEV Firestore Security Specification

## 1. Data Invariants
1. **Identity Ownership**: Every `/users/{userId}` and `/users/{userId}/private/info` document must have `uid == request.auth.uid` and `userId == request.auth.uid` on creation. Users may never read or modify another user's private PII record.
2. **Verified Write Gate**: Standard writes require `request.auth != null && request.auth.token.email_verified == true`.
3. **Strict Schema Enforcement**: Every write must pass `keys().hasAll(...) && keys().hasOnly(...)` on `create` and `affectedKeys().hasOnly(...)` on `update` to reject shadow/ghost fields (e.g. `role`, `isAdmin`).
4. **Inquiry Author Integrity**: Every `/inquiries/{inquiryId}` document must bind `authorId == request.auth.uid` on creation and preserve `authorId` and `createdAt` immutably on update.
5. **Terminal State Protection**: Once an inquiry reaches `status == 'archived'`, non-admin users cannot update it.
6. **Temporal Integrity**: `createdAt` and `updatedAt` must strictly equal `request.time` on server evaluation.
7. **List Query Isolation**: Listing `/inquiries`, `/inquiries/{inquiryId}/milestones`, and `/notifications` evaluates `resource.data.authorId == request.auth.uid` or `resource.data.recipientId == request.auth.uid` (or `isPrimaryAdmin()`), never allowing unauthenticated or cross-user list scraping or list-time DB lookups.
8. **Notification Integrity**: Only verified admins may create or delete `/notifications/{notificationId}`. Recipients may only toggle `isRead` and `updatedAt` on their own alerts.
9. **Milestone Parent & Bounds Integrity**: Every `/inquiries/{inquiryId}/milestones/{milestoneId}` document may only be created, updated, or deleted by verified admins, must reference an existing parent inquiry with matching `authorId`, and must constrain `progress` to `0..100` and `sortOrder` to `1..50`.
10. **Project Chat, Deliverable & Invoice Ownership**: Messages, deliverables, and invoices under `/inquiries/{inquiryId}` inherit ownership from the parent inquiry's `authorId`. Clients may only read their own project's messages/deliverables/invoices and create client-authored messages; only verified admins may manage deliverables, invoices, or `admin`-role messages. Deliverable URLs must start with `https://`.
11. **Booking Isolation & Portfolio Public Read**: `/bookings/{bookingId}` may only be created by verified users with `authorId == request.auth.uid` and `status == 'requested'`, and read/listed only by the author or admin. `/portfolioProjects/{projectId}` contains strictly non-PII showcase metadata, readable publicly and writable only by verified admins.
12. **Movie Catalog & Subscriber PII Isolation**: `/movies/{movieId}` may only be created, updated, or deleted by verified admins; public users may only read/list `published == true` movies, and `videoUrl` must start with `https://`. `/movieSubscribers/{subscriberId}` stores private subscriber emails keyed by `request.auth.uid`; only verified owners may manage their own subscription document, and only the primary admin may list subscribers.

## 2. Adversarial "Dirty Dozen" Payloads
1. **Unauthenticated Profile Create**: `{ "uid": "user1", "displayName": "Attacker", ... }` with `auth == null` -> **PERMISSION_DENIED**.
2. **Cross-User Spoofed UID**: Authenticated as `userA` writing `/users/userB` with `{ "uid": "userB", ... }` -> **PERMISSION_DENIED**.
3. **Shadow Role Injection on Create**: Creating `/users/userA` with extra field `{ "isAdmin": true }` -> **PERMISSION_DENIED** (`hasOnly` blocks unknown key).
4. **Shadow Role Injection on Update**: Updating `/users/userA` with `{ "role": "admin" }` -> **PERMISSION_DENIED** (`affectedKeys().hasOnly` blocks unknown key).
5. **Unverified Email Spoofing Admin**: Calling admin-gated read/write with `email: "arigyewisdom7@gmail.com"` and `email_verified: false` -> **PERMISSION_DENIED**.
6. **Cross-User PII Read**: Authenticated as `userA` reading `/users/userB/private/info` -> **PERMISSION_DENIED**.
7. **Oversized ID Poisoning**: Creating `/inquiries/<200-char-invalid-id>` -> **PERMISSION_DENIED** (`isValidId` rejects >128 chars or non-alphanumeric symbols).
8. **Oversized Message Payload (Denial of Wallet)**: Creating `/inquiries/inq1` with 10KB `message` -> **PERMISSION_DENIED** (`message.size() <= 3000`).
9. **Client-Forged Timestamp**: Creating `/inquiries/inq1` with `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time` -> **PERMISSION_DENIED**.
10. **Immutable Author Tampering**: Updating `/inquiries/inq1` attempting to reassign `authorId` -> **PERMISSION_DENIED**.
11. **Terminal State Bypass**: Non-admin updating `/inquiries/inq1` after `status == 'archived'` -> **PERMISSION_DENIED**.
12. **Blanket List Scraping**: User `userA` executing `getDocs(collection(db, 'inquiries'))` without `where('authorId', '==', userA)` -> **PERMISSION_DENIED**.
13. **Client Milestone Forgery**: Non-admin attempting to create or boost `progress` on `/inquiries/inq1/milestones/ms1` -> **PERMISSION_DENIED**.
14. **Client Admin-Role Chat Spoof**: Client posting `/inquiries/inq1/messages/m1` with `senderRole: 'admin'` -> **PERMISSION_DENIED**.
15. **JavaScript URI Deliverable Injection**: Writing a deliverable with `url: "javascript:alert(1)"` -> **PERMISSION_DENIED** (`url.matches('^https://.*')` blocks non-HTTPS schemes).
16. **Client Paid Invoice Forgery**: Client attempting to update `/inquiries/inq1/invoices/inv1` to `status: 'paid'` -> **PERMISSION_DENIED**.
17. **Unauthorized Portfolio Write**: Non-admin attempting to publish to `/portfolioProjects/p1` -> **PERMISSION_DENIED**.
18. **Unsafe Profile Picture Payload**: User attempting to write `photoUrl: "data:image/svg+xml;base64,..."` or `photoUrl: "javascript:alert(1)"` or >150KB string to `/users/{uid}` -> **PERMISSION_DENIED** (`isValidUserPublic` regex and size bounds enforce safe raster data URIs or `https://` URLs only).
19. **Invalid Contact Channel or Oversized Bio**: Writing an unallowlisted `preferredChannel` (e.g. `"telegram"`) to `/users/{uid}/private/info` or >300-char `bio` to `/users/{uid}` -> **PERMISSION_DENIED** (`isValidUserPrivateInfo` enum and `isValidUserPublic` size bounds reject malformed values).
20. **Unauthorized Movie Upload or Unsafe Video URI**: Non-admin writing to `/movies/mov1`, or admin writing `videoUrl: "javascript:alert(1)"` -> **PERMISSION_DENIED**.
21. **Movie Subscriber Email List Scraping**: Non-admin running `getDocs(collection(db, 'movieSubscribers'))` or userA reading `/movieSubscribers/userB` -> **PERMISSION_DENIED**.

