/* oxlint-disable import/no-relative-parent-imports, jest/no-conditional-in-test */

import { expect } from "@playwright/test"

import { test } from "../fixtures/test"
import { LoginPage } from "../pages/identity/login-page"
import { AccountSettingsPage } from "../pages/settings/account-settings-page"
import { PeopleSettingsPage } from "../pages/settings/people-settings-page"
import { waitForCapturedEmails } from "../support/email-capture"

const createElectricShapeHeaders = ({
  handle,
  offset,
  origin,
}: {
  handle: string
  offset: string
  origin: string | undefined
}) => ({
  "access-control-allow-credentials": "true",
  "access-control-allow-origin": origin ?? "*",
  "access-control-expose-headers":
    "electric-cursor, electric-handle, electric-offset, electric-schema, electric-up-to-date",
  "electric-cursor": offset,
  "electric-handle": handle,
  "electric-offset": offset,
  "electric-schema": "{}",
  "electric-up-to-date": "true",
})

const createSettingsSnapshotPayload = ({
  invites,
  members,
  owner,
}: {
  invites: {
    acceptUrl: string
    code: string
    email: string
    id: string
    role: "admin" | "dispatcher" | "field_worker" | "owner"
    status: string
    workspaceId: string
  }[]
  members: {
    email: string
    id: string
    image: null | string
    isCurrentUser: boolean
    name: string
    role: "admin" | "dispatcher" | "field_worker" | "owner"
    userId: string
  }[]
  owner: {
    email: string
    userId: string
    workspaceId: string
    workspaceName: string
    workspaceSlug: string
  }
}) => ({
  accountProfile: {
    email: owner.email,
    id: owner.userId,
    image: null,
    name: "Snapshot Owner",
  },
  members: members.map((member) => ({
    email: member.email,
    id: member.id,
    image: member.image,
    isCurrentUser: member.isCurrentUser,
    name: member.name,
    permissions: {
      assignableRoles: [],
      canChangeRole: false,
      canRemove: false,
    },
    role: member.role,
    userId: member.userId,
  })),
  pendingInvites: invites.map((invite) => ({
    acceptUrl: invite.acceptUrl,
    code: invite.code,
    email: invite.email,
    id: invite.id,
    permissions: {
      canResend: true,
      canRevoke: true,
    },
    role: invite.role,
    status: invite.status,
    workspaceId: invite.workspaceId,
  })),
  permissions: {
    canEditWorkspaceProfile: true,
    canInviteRoles: ["owner", "admin", "dispatcher", "field_worker"],
    canManageInvites: true,
    canManageMembers: true,
  },
  viewerRole: "owner",
  workspaceProfile: {
    id: owner.workspaceId,
    logo: null,
    name: owner.workspaceName,
    slug: owner.workspaceSlug,
  },
})

test("lets an owner invite, resend, and revoke a workspace invite", async ({
  emailCaptureDir,
  page,
  seed,
}) => {
  const loginPage = new LoginPage(page)
  const peopleSettingsPage = new PeopleSettingsPage(page)
  const owner = await seed.createWorkspaceUser({
    email: `people-owner-${crypto.randomUUID()}@example.com`,
    name: "People Owner",
    workspaceName: "People Ops",
  })
  const inviteEmail = `invite-${crypto.randomUUID()}@example.com`

  await loginPage.goto()
  await loginPage.signIn(owner.email, owner.password)
  await peopleSettingsPage.goto()
  await expect(page.getByLabel("Invite email")).toBeEnabled({
    timeout: 10_000,
  })
  await peopleSettingsPage.inviteMember({
    email: inviteEmail,
    roleLabel: "Dispatcher",
  })
  await peopleSettingsPage.invites.expectInvite(inviteEmail)

  const initialEmails = await waitForCapturedEmails<{
    to: string
  }>({
    directory: emailCaptureDir,
    predicate: (candidate) =>
      candidate.type === "workspace-invitation" &&
      candidate.payload.to === inviteEmail,
  })

  await peopleSettingsPage.invites.resendInvite(inviteEmail)

  await waitForCapturedEmails<{
    to: string
  }>({
    directory: emailCaptureDir,
    minCount: initialEmails.length + 1,
    predicate: (candidate) =>
      candidate.type === "workspace-invitation" &&
      candidate.payload.to === inviteEmail,
  })

  await peopleSettingsPage.invites.revokeInvite(inviteEmail)
  await peopleSettingsPage.invites.expectInviteRemoved(inviteEmail)
})

test("lets an owner change a member role and remove the member", async ({
  page,
  seed,
}) => {
  const loginPage = new LoginPage(page)
  const peopleSettingsPage = new PeopleSettingsPage(page)
  const owner = await seed.createWorkspaceUser({
    email: `owner-member-${crypto.randomUUID()}@example.com`,
    name: "Owner Member",
    workspaceName: "Member Ops",
  })
  const member = await seed.createUser({
    email: `member-${crypto.randomUUID()}@example.com`,
    name: "Dispatch Member",
    verified: true,
  })

  await seed.addWorkspaceMember({
    organizationId: owner.workspaceId,
    role: "dispatcher",
    userId: member.userId,
  })

  await loginPage.goto()
  await loginPage.signIn(owner.email, owner.password)
  await peopleSettingsPage.goto()
  await expect(page.getByLabel("Invite email")).toBeEnabled({
    timeout: 10_000,
  })
  await peopleSettingsPage.members.changeRole(member.name, "Admin")

  await expect(
    await seed.readMembershipRole({
      organizationId: owner.workspaceId,
      userId: member.userId,
    })
  ).toBe("admin")

  await peopleSettingsPage.members.removeMember(member.name)
  await seed.waitForMembershipRemoval({
    organizationId: owner.workspaceId,
    userId: member.userId,
  })
  await peopleSettingsPage.members.expectMissing(member.name)
})

test("replaces stale snapshot rows with live sync rows on the people settings route", async ({
  page,
  seed,
}) => {
  const loginPage = new LoginPage(page)
  const peopleSettingsPage = new PeopleSettingsPage(page)
  const owner = await seed.createWorkspaceUser({
    email: `snapshot-owner-${crypto.randomUUID()}@example.com`,
    name: "Snapshot Owner",
    workspaceName: "Sync Ops",
  })
  const staleMember = {
    email: `snapshot-member-${crypto.randomUUID()}@example.com`,
    id: "member-stale",
    image: null,
    isCurrentUser: false,
    name: "Snapshot Member",
    role: "dispatcher" as const,
    userId: `user-stale-${crypto.randomUUID()}`,
  }
  const liveMember = {
    email: `live-member-${crypto.randomUUID()}@example.com`,
    id: "member-live",
    image: null,
    isCurrentUser: false,
    name: "Live Member",
    role: "dispatcher" as const,
    userId: `user-live-${crypto.randomUUID()}`,
  }
  const staleInviteEmail = `stale-invite-${crypto.randomUUID()}@example.com`
  let settingsRequestCount = 0

  await page.route(
    `**/api/workspaces/${owner.workspaceId}/settings`,
    async (route) => {
      settingsRequestCount += 1

      if (settingsRequestCount === 1) {
        await route.fulfill({
          contentType: "application/json",
          json: createSettingsSnapshotPayload({
            invites: [
              {
                acceptUrl: `https://example.com/invites/stale-${owner.workspaceId}`,
                code: "STALE123",
                email: staleInviteEmail,
                id: "invite-stale",
                role: "dispatcher",
                status: "pending",
                workspaceId: owner.workspaceId,
              },
            ],
            members: [
              {
                email: owner.email,
                id: "member-owner",
                image: null,
                isCurrentUser: true,
                name: owner.name,
                role: "owner",
                userId: owner.userId,
              },
              staleMember,
            ],
            owner,
          }),
        })
        return
      }

      await route.fulfill({
        contentType: "application/json",
        json: createSettingsSnapshotPayload({
          invites: [
            {
              acceptUrl: `https://example.com/invites/live-${owner.workspaceId}`,
              code: "LIVE1234",
              email: "live-invite@example.com",
              id: "invite-live",
              role: "dispatcher",
              status: "pending",
              workspaceId: owner.workspaceId,
            },
          ],
          members: [
            {
              email: owner.email,
              id: "member-owner",
              image: null,
              isCurrentUser: true,
              name: owner.name,
              role: "owner",
              userId: owner.userId,
            },
            liveMember,
          ],
          owner,
        }),
      })
    }
  )

  await page.route(
    `**/api/sync/workspaces/${owner.workspaceId}/context`,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: {
          resources: {
            workspace: `/api/sync/workspaces/${owner.workspaceId}/shapes/workspace`,
            workspaceInvites: `/api/sync/workspaces/${owner.workspaceId}/shapes/workspace-invites`,
            workspaceMembers: `/api/sync/workspaces/${owner.workspaceId}/shapes/workspace-members`,
          },
          userId: owner.userId,
          viewerRole: "owner",
          workspace: {
            id: owner.workspaceId,
            logo: null,
            name: owner.workspaceName,
            slug: owner.workspaceSlug,
          },
        },
      })
    }
  )
  await page.route(
    `**/api/sync/workspaces/${owner.workspaceId}/shapes/**`,
    async (route) => {
      const { origin } = route.request().headers()
      const { pathname } = new URL(route.request().url())

      if (pathname.endsWith("/workspace-members")) {
        await route.fulfill({
          body: JSON.stringify([
            {
              headers: {
                operation: "insert",
              },
              key: "member-owner",
              value: {
                id: "member-owner",
                organization_id: owner.workspaceId,
                role: "owner",
                user_id: owner.userId,
              },
            },
            {
              headers: {
                operation: "insert",
              },
              key: "member-live",
              value: {
                id: liveMember.id,
                organization_id: owner.workspaceId,
                role: liveMember.role,
                user_id: liveMember.userId,
              },
            },
            {
              headers: {
                control: "up-to-date",
              },
            },
          ]),
          contentType: "application/json",
          headers: createElectricShapeHeaders({
            handle: "workspace-members-shape",
            offset: "0_0",
            origin,
          }),
        })
        return
      }

      if (pathname.endsWith("/workspace-invites")) {
        await route.fulfill({
          body: JSON.stringify([
            {
              headers: {
                operation: "insert",
              },
              key: "invite-live",
              value: {
                code: "LIVE1234",
                email: "live-invite@example.com",
                id: "invite-live",
                organization_id: owner.workspaceId,
                role: "dispatcher",
                status: "pending",
              },
            },
            {
              headers: {
                control: "up-to-date",
              },
            },
          ]),
          contentType: "application/json",
          headers: createElectricShapeHeaders({
            handle: "workspace-invites-shape",
            offset: "0_1",
            origin,
          }),
        })
        return
      }

      await route.abort()
    }
  )

  await loginPage.goto()
  await loginPage.signIn(owner.email, owner.password)
  await peopleSettingsPage.goto()
  await peopleSettingsPage.expectLoaded()

  await peopleSettingsPage.members.expectMissing("Snapshot Member")
  await expect(
    page.locator("tr").filter({ hasText: "Live Member" })
  ).toHaveCount(1)
  await peopleSettingsPage.invites.expectInvite("live-invite@example.com")
  await peopleSettingsPage.invites.expectInviteRemoved(staleInviteEmail)
})

test("redirects people-settings access back to account for a non-admin member", async ({
  page,
  seed,
}) => {
  const loginPage = new LoginPage(page)
  const accountSettingsPage = new AccountSettingsPage(page)
  const dispatcher = await seed.createWorkspaceUser({
    email: `dispatcher-${crypto.randomUUID()}@example.com`,
    name: "Dispatcher User",
    role: "dispatcher",
    workspaceName: "Dispatch Only",
  })

  await loginPage.goto()
  await loginPage.signIn(dispatcher.email, dispatcher.password)
  await page.goto("/app/settings/people")
  await accountSettingsPage.expectLoaded()
})
