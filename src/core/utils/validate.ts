import { ValidationError } from "./errors.js";

// =================================================
// Formatação e Tipagem
// =================================================

function removeZw(x: string) {
  return x.replace(/[\u200B-\u200D\u2060\uFEFF]/g, "");
}

/** This function accepts an unknown typed value and returns a trimmed and non empty valid string ["string".trim().length > 0] or undefined. */
function string(x: unknown) {
  if (typeof x !== "string") return undefined;
  const s = removeZw(x.trim());
  if (s.length === 0) return undefined;
  return s;
}

/** This function accepts an unknown typed value and returns a valid number or undefined. It includes convert number like strings to a valid number. */
function number(x: unknown) {
  if (typeof x === "number") {
    return Number.isFinite(x) ? x : undefined;
  }
  if (typeof x === "string" && x.trim().length > 0) {
    const n = Number(x);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** This function accepts an unknown typed value and returns a valid boolean or undefined. It includes convert boolean like strings and 0 or 1 values to a valid boolean (true or false). */
function boolean(x: unknown) {
  if (x === true || x === "true" || x === 1 || x === "1" || x === "on")
    return true;
  if (x === false || x === "false" || x === 0 || x === "0" || x === "off")
    return false;
  return undefined;
}

/** This function accepts an unknown typed value and returns a valid object or undefined. */
function object(x: unknown): Record<string, unknown> | undefined {
  return typeof x === "object" && x !== null && !Array.isArray(x)
    ? (x as Record<string, unknown>)
    : undefined;
}

// =================================================
// Validação
// =================================================

function cpf(x: unknown) {
  const cpf = string(x)?.replace(/\D+/g, "");

  if (!cpf) return undefined;
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return undefined;

  let total1 = 0;
  for (let i = 0; i < 9; i++) {
    total1 += Number(cpf[i]) * (10 - i);
  }
  const digito1 = ((total1 * 10) % 11) % 10;
  if (digito1 !== Number(cpf[9])) return undefined;

  let total2 = 0;
  for (let i = 0; i < 10; i++) {
    total2 += Number(cpf[i]) * (11 - i);
  }
  const digito2 = ((total2 * 10) % 11) % 10;
  if (digito2 !== Number(cpf[10])) return undefined;

  return cpf;
}

const email_re = /^[^@]+@[^@]+\.[^@]+$/;

function email(x: unknown) {
  const s = string(x)?.toLowerCase();
  return s && email_re.test(s) ? s : undefined;
}

const password_re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

/** This function validates an password with minimum 10 and maximum 255 chars, at least one lower case letter, one upper case letter and one numeric digit. */
function password(x: unknown) {
  if (typeof x !== "string") return undefined;
  if (x.length <= 9 || x.length >= 256) return undefined;
  return password_re.test(x) ? x : undefined;
}

const file_re = /^(?!\.)[A-Za-z0-9._-]+$/;

//** This function verifies if "x" is string and don't beggin with dot or contains special chars. */
function file(x: unknown) {
  if (typeof x !== "string") return undefined;
  return file_re.test(x) ? x : undefined;
}

type Parse<T> = (x: unknown) => T | undefined;

function required<T>(fn: Parse<T>, error: string) {
  return (x: unknown) => {
    const value = fn(x);
    if (value === undefined) {
      throw new ValidationError(error);
    }
    return value;
  };
}

const v = {
  string: required(string, "String válida esperada."),
  number: required(number, "Valor numérico esperado."),
  boolean: required(boolean, "Valor booleano esperado."),
  object: required(object, "Objeto esperado."),
  cpf: required(cpf, "CPF inválido."),
  email: required(email, "E-mail inválido."),
  password: required(password, "Senha inválida."),
  file: required(file, "Nome de arquivo inválido."),
  o: {
    string,
    number,
    boolean,
    object,
    cpf,
    email,
    password,
    file,
  },
};

export default v;
