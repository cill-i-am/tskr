/* oxlint-disable vitest/prefer-called-once */

import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps, ReactNode } from "react"
import { renderToString } from "react-dom/server"

const {
  buildJoinWorkspaceTargetPathMock,
  clearWorkspaceInviteFlowMock,
  readPendingWorkspaceInviteFlowMock,
  sendVerificationOtpMock,
  navigateMock,
  requestPasswordResetMock,
  resetPasswordMock,
  signInEmailMock,
  signOutMock,
  signUpEmailMock,
  useSessionMock,
  verifyEmailMock,
} = vi.hoisted(() => ({
  buildJoinWorkspaceTargetPathMock: vi.fn(),
  clearWorkspaceInviteFlowMock: vi.fn(),
  navigateMock: vi.fn(),
  readPendingWorkspaceInviteFlowMock: vi.fn(),
  requestPasswordResetMock: vi.fn(),
  resetPasswordMock: vi.fn(),
  sendVerificationOtpMock: vi.fn(),
  signInEmailMock: vi.fn(),
  signOutMock: vi.fn(),
  signUpEmailMock: vi.fn(),
  useSessionMock: vi.fn(),
  verifyEmailMock: vi.fn(),
}))

const EMAIL_VERIFICATION_FLOW_STORAGE_KEY = "tskr-email-verification-flow"

const installMocks = () => {
  vi.doMock(import("@tanstack/react-router"), (() => ({
    Link: ({
      children,
      to,
      ...props
    }: {
      children?: ReactNode
      to: string
    } & ComponentProps<"a">) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    useNavigate: () => navigateMock,
  })) as never)

  vi.doMock(import("./auth-client"), (() => ({
    authClient: {
      emailOtp: {
        sendVerificationOtp: sendVerificationOtpMock,
        verifyEmail: verifyEmailMock,
      },
      requestPasswordReset: requestPasswordResetMock,
      resetPassword: resetPasswordMock,
      signIn: {
        email: signInEmailMock,
      },
      signOut: signOutMock,
      signUp: {
        email: signUpEmailMock,
      },
      useSession: useSessionMock,
    },
  })) as never)

  vi.doMock(
    import("@/domains/workspaces/join-workspace/ui/workspace-invite-flow"),
    (() => ({
      buildJoinWorkspaceTargetPath: buildJoinWorkspaceTargetPathMock,
      clearWorkspaceInviteFlow: clearWorkspaceInviteFlowMock,
      readPendingWorkspaceInviteFlow: readPendingWorkspaceInviteFlowMock,
    })) as never
  )
}

const loadPages = async () => {
  installMocks()

  const forgotPasswordPageModule = await import("./forgot-password-page")
  const loginPageModule = await import("./login-page")
  const resetPasswordPageModule = await import("./reset-password-page")
  const signupPageModule = await import("./signup-page")
  const verifyEmailPageModule = await import("./verify-email-page")
  const joinWorkspacePageModule =
    await import("@/domains/workspaces/join-workspace/ui/join-workspace-page")

  return {
    ForgotPasswordPage: forgotPasswordPageModule.ForgotPasswordPage,
    JoinWorkspacePage: joinWorkspacePageModule.JoinWorkspacePage,
    LoginPage: loginPageModule.LoginPage,
    ResetPasswordPage: resetPasswordPageModule.ResetPasswordPage,
    SignupPage: signupPageModule.SignupPage,
    VerifyEmailPage: verifyEmailPageModule.VerifyEmailPage,
  }
}

const resetMocks = () => {
  buildJoinWorkspaceTargetPathMock.mockReset()
  clearWorkspaceInviteFlowMock.mockReset()
  sendVerificationOtpMock.mockReset()
  navigateMock.mockReset()
  readPendingWorkspaceInviteFlowMock.mockReset()
  requestPasswordResetMock.mockReset()
  resetPasswordMock.mockReset()
  signInEmailMock.mockReset()
  signOutMock.mockReset()
  signUpEmailMock.mockReset()
  useSessionMock.mockReset()
  verifyEmailMock.mockReset()
  buildJoinWorkspaceTargetPathMock.mockReturnValue("/join-workspace")
  readPendingWorkspaceInviteFlowMock.mockReturnValue(null)
  useSessionMock.mockReturnValue({
    data: null,
    isPending: false,
  })
  window.sessionStorage.clear()
  vi.resetModules()
}

describe("authentication pages", () => {
  it("renders login and signup pages without checking invite storage during render", async () => {
    resetMocks()
    const { LoginPage, SignupPage } = await loadPages()

    const loginView = render(<LoginPage />)

    try {
      expect(readPendingWorkspaceInviteFlowMock).not.toHaveBeenCalled()
    } finally {
      loginView.unmount()
      cleanup()
    }

    const signupView = render(<SignupPage />)

    try {
      expect(readPendingWorkspaceInviteFlowMock).not.toHaveBeenCalled()
    } finally {
      signupView.unmount()
      cleanup()
    }
  })

  it("blocks login when the email address is invalid", async () => {
    resetMocks()
    const { LoginPage } = await loadPages()

    const user = userEvent.setup()
    const view = render(<LoginPage />)

    try {
      await user.type(screen.getByLabelText("Email"), "not-an-email")
      await user.type(screen.getByLabelText("Password"), "password-1234")
      await user.click(screen.getByRole("button", { name: "Login" }))

      expect(signInEmailMock).not.toHaveBeenCalled()
      expect(screen.getByText("Enter a valid email address.")).toBeTruthy()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("submits the login form and navigates home on success", async () => {
    resetMocks()
    signInEmailMock.mockResolvedValue({
      error: null,
    })
    const { LoginPage } = await loadPages()

    const user = userEvent.setup()
    const view = render(<LoginPage />)

    try {
      await user.type(screen.getByLabelText("Email"), "ada@example.com")
      await user.type(screen.getByLabelText("Password"), "password-1234")
      await user.click(screen.getByRole("button", { name: "Login" }))

      await waitFor(() => {
        expect(signInEmailMock).toHaveBeenCalledWith({
          email: "ada@example.com",
          password: "password-1234",
        })
      })

      await waitFor(() => {
        expect(navigateMock).toHaveBeenCalledWith({
          to: "/",
        })
      })

      expect(readPendingWorkspaceInviteFlowMock).toHaveBeenCalledWith()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("returns successful login to join workspace when an invite flow is pending", async () => {
    resetMocks()
    signInEmailMock.mockResolvedValue({
      error: null,
    })
    readPendingWorkspaceInviteFlowMock.mockReturnValue({
      token: "signed-token-123",
    })
    const { LoginPage } = await loadPages()

    const user = userEvent.setup()
    const view = render(<LoginPage />)

    try {
      await user.type(screen.getByLabelText("Email"), "ada@example.com")
      await user.type(screen.getByLabelText("Password"), "password-1234")
      await user.click(screen.getByRole("button", { name: "Login" }))

      await waitFor(() => {
        expect(navigateMock).toHaveBeenCalledWith({
          to: "/join-workspace",
        })
      })

      expect(buildJoinWorkspaceTargetPathMock).toHaveBeenCalledTimes(1)
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("blocks signup when the passwords do not match", async () => {
    resetMocks()
    const { SignupPage } = await loadPages()

    const user = userEvent.setup()
    const view = render(<SignupPage />)

    try {
      await user.type(screen.getByLabelText("Full name"), "Ada Lovelace")
      await user.type(screen.getByLabelText("Email"), "ada@example.com")
      await user.type(screen.getByLabelText("Password"), "password-1234")
      await user.type(
        screen.getByLabelText("Confirm password"),
        "password-9999"
      )
      await user.click(screen.getByRole("button", { name: "Create account" }))

      expect(signUpEmailMock).not.toHaveBeenCalled()
      expect(screen.getByText("Passwords must match.")).toBeTruthy()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("navigates home after successful signup", async () => {
    resetMocks()
    signUpEmailMock.mockResolvedValue({
      error: null,
    })
    const { SignupPage } = await loadPages()

    const user = userEvent.setup()
    const view = render(<SignupPage />)
    let storedFlowAtNavigate: string | null = null
    navigateMock.mockImplementation(() => {
      storedFlowAtNavigate = window.sessionStorage.getItem(
        EMAIL_VERIFICATION_FLOW_STORAGE_KEY
      )
    })

    try {
      await user.type(screen.getByLabelText("Full name"), "Ada Lovelace")
      await user.type(screen.getByLabelText("Email"), "ada@example.com")
      await user.type(screen.getByLabelText("Password"), "password-1234")
      await user.type(
        screen.getByLabelText("Confirm password"),
        "password-1234"
      )
      await user.click(screen.getByRole("button", { name: "Create account" }))

      await waitFor(() => {
        expect(signUpEmailMock).toHaveBeenCalledWith({
          email: "ada@example.com",
          name: "Ada Lovelace",
          password: "password-1234",
        })
      })

      expect(signInEmailMock).not.toHaveBeenCalled()

      await waitFor(() => {
        expect(navigateMock).toHaveBeenCalledWith({
          search: {
            email: "ada@example.com",
            reason: "",
          },
          to: "/verify-email",
        })
      })

      expect(storedFlowAtNavigate).toBe(
        JSON.stringify({
          email: "ada@example.com",
          reason: "",
        })
      )
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("preserves a pending invite flow while signup hands off to verify email", async () => {
    resetMocks()
    signUpEmailMock.mockResolvedValue({
      error: null,
    })
    readPendingWorkspaceInviteFlowMock.mockReturnValue({
      code: "ABCD1234",
    })
    window.sessionStorage.setItem(
      "tskr-workspace-invite-flow",
      JSON.stringify({
        code: "ABCD1234",
      })
    )
    const { SignupPage } = await loadPages()

    const user = userEvent.setup()
    const view = render(<SignupPage />)
    let storedInviteFlowAtNavigate: string | null = null
    navigateMock.mockImplementation(() => {
      storedInviteFlowAtNavigate = window.sessionStorage.getItem(
        "tskr-workspace-invite-flow"
      )
    })

    try {
      await user.type(screen.getByLabelText("Full name"), "Ada Lovelace")
      await user.type(screen.getByLabelText("Email"), "ada@example.com")
      await user.type(screen.getByLabelText("Password"), "password-1234")
      await user.type(
        screen.getByLabelText("Confirm password"),
        "password-1234"
      )
      await user.click(screen.getByRole("button", { name: "Create account" }))

      await waitFor(() => {
        expect(navigateMock).toHaveBeenCalledWith({
          search: {
            email: "ada@example.com",
            reason: "",
          },
          to: "/verify-email",
        })
      })

      expect(storedInviteFlowAtNavigate).toBe(
        JSON.stringify({
          code: "ABCD1234",
        })
      )
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("blocks signup when the full name is only whitespace", async () => {
    resetMocks()
    const { SignupPage } = await loadPages()

    const user = userEvent.setup()
    const view = render(<SignupPage />)

    try {
      await user.type(screen.getByLabelText("Full name"), "   ")
      await user.type(screen.getByLabelText("Email"), "ada@example.com")
      await user.type(screen.getByLabelText("Password"), "password-1234")
      await user.type(
        screen.getByLabelText("Confirm password"),
        "password-1234"
      )
      await user.click(screen.getByRole("button", { name: "Create account" }))

      expect(signUpEmailMock).not.toHaveBeenCalled()
      expect(screen.getByText("Enter your full name.")).toBeTruthy()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("blocks signup when the password is shorter than 8 characters", async () => {
    resetMocks()
    const { SignupPage } = await loadPages()

    const user = userEvent.setup()
    const view = render(<SignupPage />)

    try {
      await user.type(screen.getByLabelText("Full name"), "Ada Lovelace")
      await user.type(screen.getByLabelText("Email"), "ada@example.com")
      await user.type(screen.getByLabelText("Password"), "short")
      await user.type(screen.getByLabelText("Confirm password"), "short")
      await user.click(screen.getByRole("button", { name: "Create account" }))

      expect(signUpEmailMock).not.toHaveBeenCalled()
      expect(screen.getByText("Use at least 8 characters.")).toBeTruthy()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("shows a generic signup failure without leaking account existence", async () => {
    resetMocks()
    signUpEmailMock.mockResolvedValue({
      error: {
        message: "Unable to create your account.",
      },
    })
    const { SignupPage } = await loadPages()

    const user = userEvent.setup()
    const view = render(<SignupPage />)

    try {
      await user.type(screen.getByLabelText("Full name"), "Ada Lovelace")
      await user.type(screen.getByLabelText("Email"), "ada@example.com")
      await user.type(screen.getByLabelText("Password"), "password-1234")
      await user.type(
        screen.getByLabelText("Confirm password"),
        "password-1234"
      )
      await user.click(screen.getByRole("button", { name: "Create account" }))

      await waitFor(() => {
        expect(signUpEmailMock).toHaveBeenCalledWith({
          email: "ada@example.com",
          name: "Ada Lovelace",
          password: "password-1234",
        })
      })

      expect(screen.getByText("Unable to create your account.")).toBeTruthy()
      expect(navigateMock).not.toHaveBeenCalled()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("redirects unverified password sign-ins into the verify email flow", async () => {
    resetMocks()
    signInEmailMock.mockResolvedValue({
      error: {
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email address.",
        status: 403,
        statusText: "Forbidden",
      },
    })
    const { LoginPage } = await loadPages()

    const user = userEvent.setup()
    const view = render(<LoginPage />)
    let storedFlowAtNavigate: string | null = null
    navigateMock.mockImplementation(() => {
      storedFlowAtNavigate = window.sessionStorage.getItem(
        EMAIL_VERIFICATION_FLOW_STORAGE_KEY
      )
    })

    try {
      await user.type(screen.getByLabelText("Email"), "ada@example.com")
      await user.type(screen.getByLabelText("Password"), "password-1234")
      await user.click(screen.getByRole("button", { name: "Login" }))

      await waitFor(() => {
        expect(navigateMock).toHaveBeenCalledWith({
          search: {
            email: "ada@example.com",
            reason: "signin",
          },
          to: "/verify-email",
        })
      })

      expect(storedFlowAtNavigate).toBe(
        JSON.stringify({
          email: "ada@example.com",
          reason: "signin",
        })
      )
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("verifies the otp code and navigates home", async () => {
    resetMocks()
    verifyEmailMock.mockResolvedValue({
      error: null,
    })
    const { VerifyEmailPage } = await loadPages()

    const user = userEvent.setup()
    const view = render(<VerifyEmailPage email="ada@example.com" />)

    try {
      await user.type(screen.getByLabelText("Verification code"), "123456")
      await user.click(screen.getByRole("button", { name: "Verify email" }))

      await waitFor(() => {
        expect(verifyEmailMock).toHaveBeenCalledWith({
          email: "ada@example.com",
          otp: "123456",
        })
      })

      await waitFor(() => {
        expect(navigateMock).toHaveBeenCalledWith({
          to: "/",
        })
      })

      expect(readPendingWorkspaceInviteFlowMock).toHaveBeenCalledTimes(1)
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("avoids email-verification storage reads during server render and enables signin resend after mount", async () => {
    resetMocks()
    window.sessionStorage.setItem(
      EMAIL_VERIFICATION_FLOW_STORAGE_KEY,
      JSON.stringify({
        email: "ada@example.com",
        reason: "signin",
      })
    )
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem")
    const { VerifyEmailPage } = await loadPages()

    try {
      renderToString(
        <VerifyEmailPage email="ada@example.com" reason="signin" />
      )

      expect(getItemSpy).not.toHaveBeenCalled()

      const view = render(
        <VerifyEmailPage email="ada@example.com" reason="signin" />
      )

      try {
        await waitFor(() => {
          expect(
            screen.getByText(
              "We sent a fresh verification code after your sign-in attempt."
            )
          ).toBeTruthy()
        })
        expect(
          screen.getByRole("button", { name: "Send a new code" })
        ).toBeTruthy()
      } finally {
        view.unmount()
        cleanup()
      }
    } finally {
      getItemSpy.mockRestore()
    }
  })

  it("verifies the otp code and returns to join workspace when an invite flow is pending", async () => {
    resetMocks()
    verifyEmailMock.mockResolvedValue({
      error: null,
    })
    readPendingWorkspaceInviteFlowMock.mockReturnValue({
      code: "ABCD1234",
    })
    window.sessionStorage.setItem(
      EMAIL_VERIFICATION_FLOW_STORAGE_KEY,
      JSON.stringify({
        email: "ada@example.com",
        reason: "",
      })
    )
    window.sessionStorage.setItem(
      "tskr-workspace-invite-flow",
      JSON.stringify({
        code: "ABCD1234",
      })
    )
    const { VerifyEmailPage } = await loadPages()

    const user = userEvent.setup()
    const view = render(<VerifyEmailPage email="ada@example.com" />)
    let storedEmailFlowAtNavigate: string | null = null
    let storedInviteFlowAtNavigate: string | null = null
    navigateMock.mockImplementation(() => {
      storedEmailFlowAtNavigate = window.sessionStorage.getItem(
        EMAIL_VERIFICATION_FLOW_STORAGE_KEY
      )
      storedInviteFlowAtNavigate = window.sessionStorage.getItem(
        "tskr-workspace-invite-flow"
      )
    })

    try {
      await user.type(screen.getByLabelText("Verification code"), "123456")
      await user.click(screen.getByRole("button", { name: "Verify email" }))

      await waitFor(() => {
        expect(navigateMock).toHaveBeenCalledWith({
          to: "/join-workspace",
        })
      })

      expect(storedEmailFlowAtNavigate).toBeNull()
      expect(storedInviteFlowAtNavigate).toBe(
        JSON.stringify({
          code: "ABCD1234",
        })
      )
      expect(buildJoinWorkspaceTargetPathMock).toHaveBeenCalledTimes(1)
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("keeps the stored invite flow available after verify email hands the user back to join workspace", async () => {
    resetMocks()
    verifyEmailMock.mockResolvedValue({
      error: null,
    })
    readPendingWorkspaceInviteFlowMock.mockReturnValue({
      code: "ABCD1234",
    })
    window.sessionStorage.setItem(
      EMAIL_VERIFICATION_FLOW_STORAGE_KEY,
      JSON.stringify({
        email: "ada@example.com",
        reason: "",
      })
    )
    const { JoinWorkspacePage, VerifyEmailPage } = await loadPages()

    const user = userEvent.setup()
    const verifyEmailView = render(<VerifyEmailPage email="ada@example.com" />)
    let joinWorkspaceView: ReturnType<typeof render> | null = null

    try {
      await user.type(screen.getByLabelText("Verification code"), "123456")
      await user.click(screen.getByRole("button", { name: "Verify email" }))

      await waitFor(() => {
        expect(navigateMock).toHaveBeenCalledWith({
          to: "/join-workspace",
        })
      })

      verifyEmailView.unmount()
      cleanup()

      joinWorkspaceView = render(<JoinWorkspacePage />)

      try {
        await waitFor(() => {
          expect(screen.getByDisplayValue("ABCD1234")).toBeTruthy()
        })
        expect(clearWorkspaceInviteFlowMock).not.toHaveBeenCalled()
      } finally {
        joinWorkspaceView.unmount()
        joinWorkspaceView = null
      }
    } finally {
      joinWorkspaceView?.unmount()
      verifyEmailView.unmount()
      cleanup()
    }
  })

  it("clears the stored email verification flow before navigating home", async () => {
    resetMocks()
    verifyEmailMock.mockResolvedValue({
      error: null,
    })
    window.sessionStorage.setItem(
      EMAIL_VERIFICATION_FLOW_STORAGE_KEY,
      JSON.stringify({
        email: "ada@example.com",
        reason: "signin",
      })
    )
    const { VerifyEmailPage } = await loadPages()

    const user = userEvent.setup()
    const view = render(
      <VerifyEmailPage email="ada@example.com" reason="signin" />
    )
    let storedFlowAtNavigate: string | null = null
    navigateMock.mockImplementation(() => {
      storedFlowAtNavigate = window.sessionStorage.getItem(
        EMAIL_VERIFICATION_FLOW_STORAGE_KEY
      )
    })

    try {
      await user.type(screen.getByLabelText("Verification code"), "123456")
      await user.click(screen.getByRole("button", { name: "Verify email" }))

      await waitFor(() => {
        expect(navigateMock).toHaveBeenCalledWith({
          to: "/",
        })
      })

      expect(storedFlowAtNavigate).toBeNull()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("blocks verify email submit when the otp code is incomplete", async () => {
    resetMocks()
    const { VerifyEmailPage } = await loadPages()

    const user = userEvent.setup()
    const view = render(<VerifyEmailPage email="ada@example.com" />)

    try {
      await user.type(screen.getByLabelText("Verification code"), "12345")
      await user.click(screen.getByRole("button", { name: "Verify email" }))

      expect(verifyEmailMock).not.toHaveBeenCalled()
      expect(
        screen.getByText("Enter the 6-digit verification code.")
      ).toBeTruthy()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("uses managed validation on the verify email form", async () => {
    resetMocks()
    const { VerifyEmailPage } = await loadPages()

    const view = render(<VerifyEmailPage email="ada@example.com" />)

    try {
      expect(
        screen
          .getByRole("button", { name: "Verify email" })
          .closest("form")
          ?.hasAttribute("novalidate")
      ).toBeTruthy()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("resends a verification otp from the verify email page", async () => {
    resetMocks()
    sendVerificationOtpMock.mockResolvedValue({
      error: null,
    })
    window.sessionStorage.setItem(
      "tskr-email-verification-flow",
      JSON.stringify({
        email: "ada@example.com",
        reason: "signin",
      })
    )
    const { VerifyEmailPage } = await loadPages()

    const user = userEvent.setup()
    const view = render(
      <VerifyEmailPage email="ada@example.com" reason="signin" />
    )

    try {
      expect(
        screen.getByText(
          "We sent a fresh verification code after your sign-in attempt."
        )
      ).toBeTruthy()

      await user.click(screen.getByRole("button", { name: "Send a new code" }))

      await waitFor(() => {
        expect(sendVerificationOtpMock).toHaveBeenCalledWith({
          email: "ada@example.com",
          type: "email-verification",
        })
      })

      expect(
        screen.getByText("A new verification code is on the way.")
      ).toBeTruthy()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("clears stale otp validation state after a successful resend", async () => {
    resetMocks()
    sendVerificationOtpMock.mockResolvedValue({
      error: null,
    })
    window.sessionStorage.setItem(
      EMAIL_VERIFICATION_FLOW_STORAGE_KEY,
      JSON.stringify({
        email: "ada@example.com",
        reason: "signin",
      })
    )
    const { VerifyEmailPage } = await loadPages()

    const user = userEvent.setup()
    const view = render(
      <VerifyEmailPage email="ada@example.com" reason="signin" />
    )

    try {
      await user.type(screen.getByLabelText("Verification code"), "12345")
      await user.click(screen.getByRole("button", { name: "Verify email" }))

      const otpInput = screen.getByLabelText("Verification code")

      expect(
        screen.getByText("Enter the 6-digit verification code.")
      ).toBeTruthy()
      expect(otpInput.getAttribute("aria-invalid")).toBe("true")

      await user.click(screen.getByRole("button", { name: "Send a new code" }))

      await waitFor(() => {
        expect(sendVerificationOtpMock).toHaveBeenCalledWith({
          email: "ada@example.com",
          type: "email-verification",
        })
      })

      expect(
        screen.getByText("A new verification code is on the way.")
      ).toBeTruthy()
      expect(
        screen.queryByText("Enter the 6-digit verification code.")
      ).toBeNull()
      expect(otpInput.hasAttribute("aria-invalid")).toBeFalsy()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("does not allow resend when signin context is only spoofed in props", async () => {
    resetMocks()
    const { VerifyEmailPage } = await loadPages()

    const view = render(
      <VerifyEmailPage email="ada@example.com" reason="signin" />
    )

    try {
      expect(
        screen.queryByText(
          "We sent a fresh verification code after your sign-in attempt."
        )
      ).toBeNull()
      expect(
        screen.queryByRole("button", { name: "Send a new code" })
      ).toBeNull()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("shows a friendly error when the verification code is expired", async () => {
    resetMocks()
    verifyEmailMock.mockResolvedValue({
      error: {
        code: "OTP_EXPIRED",
        message: "OTP expired",
      },
    })
    const { VerifyEmailPage } = await loadPages()

    const user = userEvent.setup()
    const view = render(<VerifyEmailPage email="ada@example.com" />)

    try {
      await user.type(screen.getByLabelText("Verification code"), "123456")
      await user.click(screen.getByRole("button", { name: "Verify email" }))

      await waitFor(() => {
        expect(
          screen.getByText(
            "That code expired. Request a new one and try again."
          )
        ).toBeTruthy()
      })

      expect(
        screen.getByLabelText("Verification code").getAttribute("aria-invalid")
      ).toBe("true")
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("requests a password reset using the current web origin", async () => {
    resetMocks()
    requestPasswordResetMock.mockResolvedValue({
      error: null,
    })
    const { ForgotPasswordPage } = await loadPages()

    const user = userEvent.setup()
    const view = render(<ForgotPasswordPage />)

    try {
      await user.type(screen.getByLabelText("Email"), "grace@example.com")
      await user.click(screen.getByRole("button", { name: "Send reset link" }))

      await waitFor(() => {
        expect(requestPasswordResetMock).toHaveBeenCalledWith({
          email: "grace@example.com",
          redirectTo: "http://localhost:3000/reset-password",
        })
      })

      expect(
        screen.getByText(
          /If the account exists, check your email for a reset link/i
        )
      ).toBeTruthy()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("blocks password reset requests when the email address is invalid", async () => {
    resetMocks()
    const { ForgotPasswordPage } = await loadPages()

    const user = userEvent.setup()
    const view = render(<ForgotPasswordPage />)

    try {
      await user.type(screen.getByLabelText("Email"), "not-an-email")
      await user.click(screen.getByRole("button", { name: "Send reset link" }))

      expect(requestPasswordResetMock).not.toHaveBeenCalled()
      expect(screen.getByText("Enter a valid email address.")).toBeTruthy()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("renders the invalid reset state when no token is present", async () => {
    resetMocks()
    const { ResetPasswordPage } = await loadPages()

    const view = render(<ResetPasswordPage token="" />)

    try {
      expect(screen.getByText("Reset link invalid")).toBeTruthy()
      expect(
        screen.getByRole("link", {
          name: "Request a new link",
        })
      ).toBeTruthy()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("submits a new password and navigates back to login", async () => {
    resetMocks()
    resetPasswordMock.mockResolvedValue({
      error: null,
    })
    const { ResetPasswordPage } = await loadPages()

    const user = userEvent.setup()
    const view = render(<ResetPasswordPage token="reset-token-123" />)

    try {
      await user.type(screen.getByLabelText("New password"), "password-5678")
      await user.type(
        screen.getByLabelText("Confirm new password"),
        "password-5678"
      )
      await user.click(screen.getByRole("button", { name: "Reset password" }))

      await waitFor(() => {
        expect(resetPasswordMock).toHaveBeenCalledWith({
          newPassword: "password-5678",
          token: "reset-token-123",
        })
      })

      await waitFor(() => {
        expect(navigateMock).toHaveBeenCalledWith({
          to: "/login",
        })
      })
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("submits a short reset password to the server and shows the server error", async () => {
    resetMocks()
    resetPasswordMock.mockResolvedValue({
      error: {
        message: "Password must be at least 8 characters.",
      },
    })
    const { ResetPasswordPage } = await loadPages()

    const user = userEvent.setup()
    const view = render(<ResetPasswordPage token="reset-token-123" />)

    try {
      await user.type(screen.getByLabelText("New password"), "short")
      await user.type(screen.getByLabelText("Confirm new password"), "short")
      await user.click(screen.getByRole("button", { name: "Reset password" }))

      await waitFor(() => {
        expect(resetPasswordMock).toHaveBeenCalledWith({
          newPassword: "short",
          token: "reset-token-123",
        })
      })

      expect(
        screen.getByText("Password must be at least 8 characters.")
      ).toBeTruthy()
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("blocks password resets when the passwords do not match", async () => {
    resetMocks()
    const { ResetPasswordPage } = await loadPages()

    const user = userEvent.setup()
    const view = render(<ResetPasswordPage token="reset-token-123" />)

    try {
      await user.type(screen.getByLabelText("New password"), "password-5678")
      await user.type(
        screen.getByLabelText("Confirm new password"),
        "password-1234"
      )
      await user.click(screen.getByRole("button", { name: "Reset password" }))

      expect(resetPasswordMock).not.toHaveBeenCalled()
      expect(screen.getByText("Passwords must match.")).toBeTruthy()
    } finally {
      view.unmount()
      cleanup()
    }
  })
})
