import { z } from "zod";

/**
 * Validaciones compartidas entre mobile, web y Edge Functions (sección 10.1).
 * Alcance del MVP (sección 26.1): un solo tipo de ticket por evento,
 * pago móvil / transferencia / Zelle con referencia + captura.
 */

export const MVP_PAYMENT_METHODS = ["pago_movil", "transfer", "zelle"] as const;
export type MvpPaymentMethod = (typeof MVP_PAYMENT_METHODS)[number];

export const createOrderSchema = z.object({
  ticketTypeId: z.string().uuid(),
  quantity: z.number().int().min(1).max(6), // sección 16, decisión #34: 6 por defecto
  idempotencyKey: z.string().uuid(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const submitPaymentSchema = z.object({
  orderId: z.string().uuid(),
  method: z.enum(MVP_PAYMENT_METHODS),
  reference: z.string().min(4).max(20),
  payerBank: z.string().min(2).max(60).optional(),
  payerPhone: z.string().min(7).max(20).optional(),
  payerDocument: z.string().min(5).max(20).optional(),
  receiptUrl: z.string().url().optional(),
});
export type SubmitPaymentInput = z.infer<typeof submitPaymentSchema>;

export const adminReviewPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().min(3).max(200).optional(),
});
export type AdminReviewPaymentInput = z.infer<typeof adminReviewPaymentSchema>;

/**
 * Onboarding y registro (sección 5.1). La fecha de nacimiento se pide para
 * el bono de cumpleaños de puntos y para filtrar eventos 18+ (sección 28.5);
 * el mínimo de edad por evento se valida en el checkout, no aquí.
 */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  password: z.string().min(1, "Escribe tu contraseña"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerProfileSchema = z
  .object({
    fullName: z.string().trim().min(2, "Escribe tu nombre completo").max(80),
    email: z.string().trim().toLowerCase().email("Correo inválido"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
      .refine((value) => {
        const date = new Date(value);
        return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
      }, "Esa fecha no es válida"),
    phone: z.string().trim().min(7).max(20).optional().or(z.literal("")),
    cityId: z.string().uuid().optional(),
    interestCategoryIds: z.array(z.string().uuid()).default([]),
  })
  .transform((data) => ({ ...data, phone: data.phone || undefined }));
export type RegisterProfileInput = z.infer<typeof registerProfileSchema>;
