import { z } from 'zod';

// ============================================================================
// Constantes
// ============================================================================

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72; // limite bcrypt
const NAME_MIN = 2;
const NAME_MAX = 120;

// Política de password: mínimo 1 letra + 1 número (NIST 2024 — sem exigir
// maiúsculas/símbolos, que reduzem usabilidade sem aumentar segurança real)
const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).+$/;

// Telefone PT: 9 dígitos, começa por 2/9 (opcionalmente prefixo +351 ou 00351)
const PHONE_PT_REGEX = /^(?:(?:\+|00)351)?\s?[29]\d{8}$/;

// ============================================================================
// Login
// ============================================================================

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email obrigatório')
    .email('Email inválido')
    .max(255),
  password: z.string().min(1, 'Password obrigatória').max(PASSWORD_MAX),
  // Honeypot anti-bot: humanos não preenchem campos invisíveis
  website: z.string().max(0, 'Erro de validação').optional().default(''),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ============================================================================
// Registo (cliente)
// ============================================================================

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(NAME_MIN, `Nome com pelo menos ${NAME_MIN} caracteres`)
      .max(NAME_MAX, `Nome demasiado longo`),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Email obrigatório')
      .email('Email inválido')
      .max(255),
    phone: z
      .string()
      .trim()
      .regex(PHONE_PT_REGEX, 'Telefone português inválido (9 dígitos, começa por 2 ou 9)')
      .optional()
      .or(z.literal('')),
    password: z
      .string()
      .min(PASSWORD_MIN, `Password com pelo menos ${PASSWORD_MIN} caracteres`)
      .max(PASSWORD_MAX, `Password demasiado longa`)
      .regex(PASSWORD_REGEX, 'Password tem de incluir pelo menos uma letra e um número'),
    passwordConfirm: z.string().min(1, 'Confirma a password'),
    acceptTerms: z.literal(true, {
      message: 'Tens de aceitar os termos para criar conta',
    }),
    marketingConsent: z.boolean().default(false),
    // Honeypot anti-bot
    website: z.string().max(0, 'Erro de validação').optional().default(''),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'As passwords não coincidem',
    path: ['passwordConfirm'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

// ============================================================================
// Recuperação de password
// ============================================================================

export const requestResetSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email obrigatório')
    .email('Email inválido')
    .max(255),
  website: z.string().max(0).optional().default(''),
});

export type RequestResetInput = z.infer<typeof requestResetSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Token inválido'),
    password: z
      .string()
      .min(PASSWORD_MIN, `Password com pelo menos ${PASSWORD_MIN} caracteres`)
      .max(PASSWORD_MAX)
      .regex(PASSWORD_REGEX, 'Password tem de incluir pelo menos uma letra e um número'),
    passwordConfirm: z.string().min(1, 'Confirma a password'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'As passwords não coincidem',
    path: ['passwordConfirm'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ============================================================================
// Mudar password (utilizador autenticado)
// ============================================================================

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password actual obrigatória').max(PASSWORD_MAX),
    newPassword: z
      .string()
      .min(PASSWORD_MIN, `Password com pelo menos ${PASSWORD_MIN} caracteres`)
      .max(PASSWORD_MAX)
      .regex(PASSWORD_REGEX, 'Password tem de incluir pelo menos uma letra e um número'),
    newPasswordConfirm: z.string().min(1, 'Confirma a nova password'),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: 'As passwords não coincidem',
    path: ['newPasswordConfirm'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'A nova password tem de ser diferente da actual',
    path: ['newPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
