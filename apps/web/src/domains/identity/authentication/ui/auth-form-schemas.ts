import { z } from "zod"

const emailSchema = z.string().email("Enter a valid email address.")

const signupFormSchema = z
  .object({
    confirmPassword: z.string().min(1, "Confirm your password."),
    email: emailSchema,
    name: z.string().trim().min(1, "Enter your full name."),
    password: z.string().min(8, "Use at least 8 characters."),
  })
  .superRefine((value, context) => {
    if (
      value.password.length > 0 &&
      value.confirmPassword.length > 0 &&
      value.password !== value.confirmPassword
    ) {
      context.addIssue({
        code: "custom",
        message: "Passwords must match.",
        path: ["confirmPassword"],
      })
    }
  })

const resetPasswordFormSchema = z
  .object({
    confirmPassword: z.string().min(1, "Confirm your new password."),
    newPassword: z.string().min(1, "Enter your new password."),
  })
  .superRefine((value, context) => {
    if (
      value.newPassword.length > 0 &&
      value.confirmPassword.length > 0 &&
      value.newPassword !== value.confirmPassword
    ) {
      context.addIssue({
        code: "custom",
        message: "Passwords must match.",
        path: ["confirmPassword"],
      })
    }
  })

const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
})

const forgotPasswordFormSchema = z.object({
  email: emailSchema,
})

const verifyEmailFormSchema = z.object({
  otp: z.string().length(6, "Enter the 6-digit verification code."),
})

type LoginFormValues = z.infer<typeof loginFormSchema>
type SignupFormValues = z.infer<typeof signupFormSchema>
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>
type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>
type VerifyEmailFormValues = z.infer<typeof verifyEmailFormSchema>

export {
  forgotPasswordFormSchema,
  loginFormSchema,
  resetPasswordFormSchema,
  signupFormSchema,
  verifyEmailFormSchema,
}
export type {
  ForgotPasswordFormValues,
  LoginFormValues,
  ResetPasswordFormValues,
  SignupFormValues,
  VerifyEmailFormValues,
}
