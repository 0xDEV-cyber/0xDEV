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
