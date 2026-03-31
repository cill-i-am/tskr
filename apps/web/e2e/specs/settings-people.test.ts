/* oxlint-disable import/no-relative-parent-imports, jest/no-conditional-in-test */

import { expect } from "@playwright/test"

import { test } from "../fixtures/test"
import { LoginPage } from "../pages/identity/login-page"
import { AccountSettingsPage } from "../pages/settings/account-settings-page"
import { PeopleSettingsPage } from "../pages/settings/people-settings-page"
import { waitForCapturedEmails } from "../support/email-capture"

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
  await peopleSettingsPage.expectLoaded()
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
  await peopleSettingsPage.expectLoaded()
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
