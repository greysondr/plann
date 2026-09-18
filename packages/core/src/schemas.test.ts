import { describe, expect, it } from "vitest";
import { loginSchema, registerProfileSchema } from "./schemas";

describe("registerProfileSchema", () => {
  const base = {
    fullName: "María Pérez",
    email: "Maria@Example.com",
    password: "unaClave123",
    birthDate: "1995-04-12",
  };

  it("acepta un registro válido y normaliza el correo", () => {
    const result = registerProfileSchema.parse(base);
    expect(result.email).toBe("maria@example.com");
    expect(result.phone).toBeUndefined();
    expect(result.interestCategoryIds).toEqual([]);
  });

  it("rechaza una fecha de nacimiento futura", () => {
    expect(() =>
      registerProfileSchema.parse({ ...base, birthDate: "2099-01-01" }),
    ).toThrow();
  });

  it("rechaza contraseñas de menos de 8 caracteres", () => {
    expect(() => registerProfileSchema.parse({ ...base, password: "1234" })).toThrow();
  });

  it("un teléfono vacío se vuelve undefined en vez de string vacío", () => {
    const result = registerProfileSchema.parse({ ...base, phone: "" });
    expect(result.phone).toBeUndefined();
  });
});

describe("loginSchema", () => {
  it("normaliza mayúsculas en el correo", () => {
    const result = loginSchema.parse({ email: "Grey@Plann.APP", password: "x" });
    expect(result.email).toBe("grey@plann.app");
  });

  it("rechaza contraseña vacía", () => {
    expect(() => loginSchema.parse({ email: "a@b.com", password: "" })).toThrow();
  });
});
