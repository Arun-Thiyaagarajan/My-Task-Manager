"use client";

import {
  type CountryCode,
  getCountries,
  getCountryCallingCode,
  parseIncompletePhoneNumber,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
} from "libphonenumber-js";
import mobileExamples from "libphonenumber-js/mobile/examples";

export interface PhoneCountryOption {
  code: CountryCode;
  name: string;
  dialCode: string;
  flag: string;
}

const countryDisplayNames =
  typeof Intl !== "undefined" && typeof Intl.DisplayNames !== "undefined"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

const MOBILE_EXAMPLE_MAP = mobileExamples as Partial<Record<CountryCode, string>>;

export function countryCodeToFlag(countryCode: string): string {
  if (countryCode.length !== 2) return "🏳️";
  return countryCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

export function getCountryName(countryCode: CountryCode): string {
  return countryDisplayNames?.of(countryCode) || countryCode;
}

export { getCountryCallingCode };

export function getPhoneCountryOptions(): PhoneCountryOption[] {
  return getCountries()
    .map((country) => ({
      code: country,
      name: getCountryName(country),
      dialCode: `+${getCountryCallingCode(country)}`,
      flag: countryCodeToFlag(country),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getDefaultPhoneCountry(): CountryCode {
  return "IN";
}

export function sanitizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function buildPhoneValue(country: CountryCode, nationalDigits: string): string {
  const digits = sanitizePhoneDigits(nationalDigits);
  if (!digits) return "";
  return `+${getCountryCallingCode(country)}${digits}`;
}

export function getPhoneCountryFromValue(value?: string | null): CountryCode | null {
  if (!value) return null;
  const parsed = parsePhoneNumberFromString(parseIncompletePhoneNumber(value));
  return parsed?.country || null;
}

export function getNationalPhoneDigits(value: string | undefined | null, fallbackCountry: CountryCode): string {
  if (!value) return "";

  const normalized = parseIncompletePhoneNumber(value);
  const parsed = parsePhoneNumberFromString(normalized);
  if (parsed?.nationalNumber) {
    return sanitizePhoneDigits(parsed.nationalNumber);
  }

  const digits = sanitizePhoneDigits(normalized);
  if (!digits) return "";

  const dialCode = getCountryCallingCode(fallbackCountry);
  if (digits.startsWith(dialCode)) {
    return digits.slice(dialCode.length);
  }

  return digits;
}

export function getExpectedNationalLength(country: CountryCode): number | null {
  return MOBILE_EXAMPLE_MAP[country]?.length ?? null;
}

export function getPhoneValidationMessage(value?: string | null): string | null {
  if (!value) return null;

  const normalized = parseIncompletePhoneNumber(value);
  const digits = sanitizePhoneDigits(normalized);
  if (!digits) return null;

  const country = getPhoneCountryFromValue(normalized) || getDefaultPhoneCountry();
  const numberToValidate = normalized.startsWith("+")
    ? normalized
    : buildPhoneValue(country, digits);

  const validationResult = validatePhoneNumberLength(numberToValidate, country);
  if (!validationResult) {
    return null;
  }

  const expectedLength = getExpectedNationalLength(country);
  if (expectedLength) {
    return `Invalid phone number for selected country. ${getCountryName(country)} numbers are typically ${expectedLength} digits.`;
  }

  return "Invalid phone number for selected country";
}
