/* oxlint-disable import/no-relative-parent-imports */

import { test } from "../fixtures/test"
import { LoginPage } from "../pages/identity/login-page"
import { AppShellPage } from "../pages/workspaces/app-shell-page"
import { JoinWorkspacePage } from "../pages/workspaces/join-workspace-page"

test("accepts a workspace invite by code", async ({ page, seed }) => {
  const loginPage = new LoginPage(page)
  const joinWorkspacePage = new JoinWorkspacePage(page)
  const appShellPage = new AppShellPage(page)
  const owner = await seed.createWorkspaceUser({
    email: `owner-${crypto.randomUUID()}@example.com`,
    name: "Owner Person",
    workspaceName: "Dispatch Core",
  })
  const invitee = await seed.createUser({
    email: `invitee-${crypto.randomUUID()}@example.com`,
    name: "Invited Person",
    verified: true,
  })
  const invite = await seed.createPendingInvite({
    email: invitee.email,
    inviterUserId: owner.userId,
    role: "dispatcher",
    workspaceId: owner.workspaceId,
  })

  await loginPage.goto()
  await loginPage.signIn(invitee.email, invitee.password)
  await joinWorkspacePage.goto()
  await joinWorkspacePage.joinByCode(invite.code)
  await appShellPage.expectLoaded(owner.workspaceName)
})

test("accepts a workspace invite by signed link", async ({ page, seed }) => {
  const loginPage = new LoginPage(page)
  const joinWorkspacePage = new JoinWorkspacePage(page)
  const appShellPage = new AppShellPage(page)
  const owner = await seed.createWorkspaceUser({
    email: `owner-link-${crypto.randomUUID()}@example.com`,
    name: "Owner Link",
    workspaceName: "Signed Link Ops",
  })
  const invitee = await seed.createUser({
    email: `invitee-link-${crypto.randomUUID()}@example.com`,
    name: "Invitee Link",
    verified: true,
  })
  const invite = await seed.createPendingInvite({
    email: invitee.email,
    inviterUserId: owner.userId,
    role: "dispatcher",
    workspaceId: owner.workspaceId,
  })

  await loginPage.goto()
  await loginPage.signIn(invitee.email, invitee.password)
  await joinWorkspacePage.openSignedInvite(invite.acceptUrl)
  await joinWorkspacePage.acceptSignedInvite()
  await appShellPage.expectLoaded(owner.workspaceName)
})

test("shows wrong-account recovery for a signed invite", async ({
  page,
  seed,
}) => {
  const loginPage = new LoginPage(page)
  const joinWorkspacePage = new JoinWorkspacePage(page)
  const owner = await seed.createWorkspaceUser({
    email: `owner-wrong-${crypto.randomUUID()}@example.com`,
    name: "Owner Wrong",
    workspaceName: "Recovery Workspace",
  })
  const targetEmail = `target-${crypto.randomUUID()}@example.com`
  const wrongUser = await seed.createUser({
    email: `wrong-${crypto.randomUUID()}@example.com`,
    name: "Wrong User",
    verified: true,
  })
  const invite = await seed.createPendingInvite({
    email: targetEmail,
    inviterUserId: owner.userId,
    role: "dispatcher",
    workspaceId: owner.workspaceId,
  })

  await loginPage.goto()
  await loginPage.signIn(wrongUser.email, wrongUser.password)
  await joinWorkspacePage.openSignedInvite(invite.acceptUrl)
  await joinWorkspacePage.acceptSignedInvite()
  await joinWorkspacePage.expectWrongAccountRecovery()
})
