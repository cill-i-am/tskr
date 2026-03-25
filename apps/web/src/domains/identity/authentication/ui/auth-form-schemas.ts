import { z } from "zod"

const emailSchema = z.string().email("Enter a valid email address.")

const signupFormSchema = z
  .object({
    confirmPassword: z.string().min(1, "Confirm your password."),
    email: emailSchema,
    name: z.string().refine((value) => value.trim().length > 0, {
      message: "Enter your full name.",
    }),
    password: z.string().min(8, "Password must be at least 8 characters."),
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
    newPassword: z.string().min(8, "Password must be at least 8 characters."),
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

type LoginFormValues = z.infer<typeof loginFormSchema>
type SignupFormValues = z.infer<typeof signupFormSchema>
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>
type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>

export {
  forgotPasswordFormSchema,
  loginFormSchema,
  resetPasswordFormSchema,
  signupFormSchema,
}
export type {
  ForgotPasswordFormValues,
  LoginFormValues,
  ResetPasswordFormValues,
  SignupFormValues,
}
