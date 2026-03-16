import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps, ReactNode } from "react"

const {
  navigateMock,
  requestPasswordResetMock,
  resetPasswordMock,
  signInEmailMock,
  signOutMock,
  signUpEmailMock,
  useSessionMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  requestPasswordResetMock: vi.fn(),
  resetPasswordMock: vi.fn(),
  signInEmailMock: vi.fn(),
  signOutMock: vi.fn(),
  signUpEmailMock: vi.fn(),
  useSessionMock: vi.fn(),
}))

const installMocks = () => {
  vi.doMock<typeof import("@tanstack/react-router")>(
    import("@tanstack/react-router"),
    (() => ({
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
    })) as never
  )

  vi.doMock<typeof import("./auth-client")>(import("./auth-client"), (() => ({
    authClient: {
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

  return {
    ForgotPasswordPage: forgotPasswordPageModule.ForgotPasswordPage,
    HomeSessionCard: homeSessionCardModule.HomeSessionCard,
    LoginPage: loginPageModule.LoginPage,
    ResetPasswordPage: resetPasswordPageModule.ResetPasswordPage,
    SignupPage: signupPageModule.SignupPage,
  }
}

const resetMocks = () => {
  navigateMock.mockReset()
  requestPasswordResetMock.mockReset()
  resetPasswordMock.mockReset()
  signInEmailMock.mockReset()
  signOutMock.mockReset()
  signUpEmailMock.mockReset()
  useSessionMock.mockReset()
  useSessionMock.mockReturnValue({
    data: null,
    isPending: false,
  })
  vi.resetModules()
}

describe("authentication pages", () => {
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
