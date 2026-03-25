import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps, ReactNode } from "react"

const {
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
  navigateMock: vi.fn(),
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
}

const loadPages = async () => {
  installMocks()

  const forgotPasswordPageModule = await import("./forgot-password-page")
  const homeSessionCardModule = await import("./home-session-card")
  const loginPageModule = await import("./login-page")
  const resetPasswordPageModule = await import("./reset-password-page")
  const signupPageModule = await import("./signup-page")
  const verifyEmailPageModule = await import("./verify-email-page")

  return {
    ForgotPasswordPage: forgotPasswordPageModule.ForgotPasswordPage,
    HomeSessionCard: homeSessionCardModule.HomeSessionCard,
    LoginPage: loginPageModule.LoginPage,
    ResetPasswordPage: resetPasswordPageModule.ResetPasswordPage,
    SignupPage: signupPageModule.SignupPage,
    VerifyEmailPage: verifyEmailPageModule.VerifyEmailPage,
  }
}

const resetMocks = () => {
  sendVerificationOtpMock.mockReset()
  navigateMock.mockReset()
  requestPasswordResetMock.mockReset()
  resetPasswordMock.mockReset()
  signInEmailMock.mockReset()
  signOutMock.mockReset()
  signUpEmailMock.mockReset()
  useSessionMock.mockReset()
  verifyEmailMock.mockReset()
  useSessionMock.mockReturnValue({
    data: null,
    isPending: false,
  })
  window.sessionStorage.clear()
  vi.resetModules()
}

describe("authentication pages", () => {
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

  it("submits signup with a whitespace-only full name", async () => {
    resetMocks()
    signUpEmailMock.mockResolvedValue({
      error: {
        code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
        message: "User already exists. Use another email.",
      },
    })
    const { SignupPage } = await loadPages()

    const user = userEvent.setup()
    const view = render(<SignupPage />)

    try {
      await user.type(screen.getByLabelText("Full name"), "   ")
      await user.type(screen.getByLabelText("Email"), "ada@example.com")
      await user.type(screen.getByLabelText("Password"), "short")
      await user.type(screen.getByLabelText("Confirm password"), "short")
      await user.click(screen.getByRole("button", { name: "Create account" }))

      await waitFor(() => {
        expect(signUpEmailMock).toHaveBeenCalledWith({
          email: "ada@example.com",
          name: "   ",
          password: "short",
        })
      })
    } finally {
      view.unmount()
      cleanup()
    }
  })

  it("shows the duplicate signup error without leaving the signup page", async () => {
    resetMocks()
    signUpEmailMock.mockResolvedValue({
      error: {
        code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
        message: "User already exists. Use another email.",
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

      expect(
        screen.getByText("User already exists. Use another email.")
      ).toBeTruthy()
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

  it("renders the signed-out home card state", async () => {
    resetMocks()
    const { HomeSessionCard } = await loadPages()

    const view = render(<HomeSessionCard />)

    try {
      expect(screen.getByText(/No active session yet/i)).toBeTruthy()
      expect(screen.getByRole("link", { name: "Login" })).toBeTruthy()
      expect(screen.getByRole("link", { name: "Sign up" })).toBeTruthy()
    } finally {
      view.unmount()
      cleanup()
    }
  })
})
