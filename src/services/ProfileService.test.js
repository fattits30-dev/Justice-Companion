/**
 * Profile Service Unit Tests
 *
 * Tests for ProfileService functionality including:
 * - Profile data storage and retrieval
 * - Validation logic
 * - Error handling
 * - Memoization and caching
 */
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileStorageKey } from "../types/profile.ts";
import { ProfileService } from "./ProfileService.ts";
// Mock localStorage globally
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
};
// Mock console methods to avoid test output pollution
const consoleErrorMock = vi.fn();
const consoleWarnMock = vi.fn();
// Set up global mocks (use window.localStorage in jsdom environment)
Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
    configurable: true,
});
Object.defineProperty(global.console, "error", {
    value: consoleErrorMock,
    writable: true,
});
Object.defineProperty(global.console, "warn", {
    value: consoleWarnMock,
    writable: true,
});
const createTestEmail = (label = "user") => `${label}.${randomUUID()}@example.test`;
describe("ProfileService", () => {
    let profileService;
    beforeEach(() => {
        profileService = new ProfileService();
        vi.clearAllMocks();
        localStorageMock.clear();
        // Restore our custom localStorage mock (tests/setup.ts overwrites it in global beforeEach)
        Object.defineProperty(window, "localStorage", {
            value: localStorageMock,
            writable: true,
            configurable: true,
        });
    });
    afterEach(() => {
        // Clean up any cached data
        profileService.clear();
    });
    describe("get()", () => {
        it("should return null when no profile data exists", () => {
            localStorageMock.getItem.mockReturnValue(null);
            const result = profileService.get();
            expect(result).toBeNull();
        });
        it("should return profile data when it exists", () => {
            const storedEmail = createTestEmail("john.doe");
            localStorageMock.getItem.mockImplementation((key) => {
                switch (key) {
                    case ProfileStorageKey.FIRST_NAME:
                        return "John";
                    case ProfileStorageKey.LAST_NAME:
                        return "Doe";
                    case ProfileStorageKey.EMAIL:
                        return storedEmail;
                    case ProfileStorageKey.PHONE:
                        return "+1234567890";
                    default:
                        return null;
                }
            });
            const result = profileService.get();
            expect(result).toEqual({
                firstName: "John",
                lastName: "Doe",
                email: storedEmail,
                phone: "+1234567890",
            });
        });
        it("should return profile data with only email", () => {
            const storedEmail = createTestEmail("john");
            localStorageMock.getItem.mockImplementation((key) => {
                switch (key) {
                    case ProfileStorageKey.EMAIL:
                        return storedEmail;
                    default:
                        return null;
                }
            });
            const result = profileService.get();
            expect(result).toEqual({
                firstName: "",
                lastName: "",
                email: storedEmail,
                phone: undefined,
            });
        });
        it("should handle localStorage errors gracefully", () => {
            localStorageMock.getItem.mockImplementation(() => {
                throw new Error("localStorage error");
            });
            const result = profileService.get();
            expect(result).toBeNull();
            expect(consoleErrorMock).toHaveBeenCalledWith("[ProfileService] Error retrieving profile:", {});
        });
    });
    describe("update()", () => {
        it("should successfully update profile data", async () => {
            // Mock no existing data
            localStorageMock.getItem.mockReturnValue(null);
            localStorageMock.setItem.mockImplementation(() => { });
            const profileEmail = createTestEmail("john.doe");
            const profileUpdate = {
                firstName: "John",
                lastName: "Doe",
                email: profileEmail,
            };
            const result = await profileService.update(profileUpdate);
            expect(result.success).toBe(true);
            expect(result.message).toBe("Profile updated successfully");
            expect(result.updatedFields).toEqual({
                firstName: "John",
                lastName: "Doe",
                email: profileEmail,
                phone: undefined,
            });
            expect(localStorageMock.setItem).toHaveBeenCalledWith(ProfileStorageKey.FIRST_NAME, "John");
            expect(localStorageMock.setItem).toHaveBeenCalledWith(ProfileStorageKey.LAST_NAME, "Doe");
            expect(localStorageMock.setItem).toHaveBeenCalledWith(ProfileStorageKey.EMAIL, profileEmail);
        });
        it("should validate profile data before updating", async () => {
            const invalidEmail = createTestEmail("invalid-update").replace("@", "");
            const invalidProfile = {
                email: invalidEmail,
            };
            const result = await profileService.update(invalidProfile);
            expect(result.success).toBe(false);
            expect(result.message).toContain("Profile validation failed");
            expect(localStorageMock.setItem).not.toHaveBeenCalled();
        });
        it("should merge with existing profile data", async () => {
            const existingEmail = createTestEmail("jane.smith");
            // Mock existing profile
            localStorageMock.getItem.mockImplementation((key) => {
                switch (key) {
                    case ProfileStorageKey.FIRST_NAME:
                        return "Jane";
                    case ProfileStorageKey.LAST_NAME:
                        return "Smith";
                    case ProfileStorageKey.EMAIL:
                        return existingEmail;
                    default:
                        return null;
                }
            });
            localStorageMock.setItem.mockImplementation(() => { });
            const profileUpdate = {
                firstName: "John", // Override existing
                phone: "+1234567890", // Add new
            };
            const result = await profileService.update(profileUpdate);
            expect(result.success).toBe(true);
            expect(result.updatedFields).toEqual({
                firstName: "John", // Updated
                lastName: "Smith", // Preserved
                email: existingEmail, // Preserved
                phone: "+1234567890", // Added
            });
        });
    });
    describe("validate()", () => {
        it("should validate email format", () => {
            const validProfile = {
                email: createTestEmail("valid"),
            };
            const invalidProfile = {
                email: createTestEmail("invalid-format").replace("@", ""),
            };
            expect(profileService.validate(validProfile).isValid).toBe(true);
            expect(profileService.validate(invalidProfile).isValid).toBe(false);
            expect(profileService.validate(invalidProfile).errors.email).toBe("Please enter a valid email address");
        });
        it("should validate phone number format", () => {
            const validProfile = {
                phone: "+1234567890",
            };
            const invalidProfile = {
                phone: "invalid-phone",
            };
            expect(profileService.validate(validProfile).isValid).toBe(true);
            expect(profileService.validate(invalidProfile).isValid).toBe(false);
            expect(profileService.validate(invalidProfile).errors.phone).toBe("Please enter a valid phone number");
        });
        it("should validate name character restrictions", () => {
            const validProfile = {
                firstName: "John-Paul",
                lastName: "O'Connor",
            };
            const invalidProfile = {
                firstName: "John@123",
            };
            expect(profileService.validate(validProfile).isValid).toBe(true);
            expect(profileService.validate(invalidProfile).isValid).toBe(false);
            expect(profileService.validate(invalidProfile).errors.firstName).toBe("First name contains invalid characters");
        });
        it("should return detailed error messages", () => {
            const invalidProfile = {
                email: "invalid",
                phone: "abc",
                firstName: "John@123",
            };
            const result = profileService.validate(invalidProfile);
            expect(result.isValid).toBe(false);
            expect(Object.values(result.errors).filter(Boolean)).toHaveLength(3);
        });
    });
    describe("clear()", () => {
        it("should clear all profile data from localStorage", () => {
            profileService.clear();
            expect(localStorageMock.removeItem).toHaveBeenCalledWith(ProfileStorageKey.FIRST_NAME);
            expect(localStorageMock.removeItem).toHaveBeenCalledWith(ProfileStorageKey.LAST_NAME);
            expect(localStorageMock.removeItem).toHaveBeenCalledWith(ProfileStorageKey.FULL_NAME);
            expect(localStorageMock.removeItem).toHaveBeenCalledWith(ProfileStorageKey.EMAIL);
            expect(localStorageMock.removeItem).toHaveBeenCalledWith(ProfileStorageKey.PHONE);
        });
        it("should handle localStorage errors gracefully", () => {
            localStorageMock.removeItem.mockImplementation(() => {
                throw new Error("Remove error");
            });
            expect(() => profileService.clear()).not.toThrow();
            expect(consoleErrorMock).toHaveBeenCalled();
        });
    });
    describe("getExtended()", () => {
        it("should return null when no profile exists", () => {
            localStorageMock.getItem.mockReturnValue(null);
            const result = profileService.getExtended();
            expect(result).toBeNull();
        });
        it("should return extended profile with computed fields", () => {
            const storedEmail = createTestEmail("john.doe");
            localStorageMock.getItem.mockImplementation((key) => {
                switch (key) {
                    case ProfileStorageKey.FIRST_NAME:
                        return "John";
                    case ProfileStorageKey.LAST_NAME:
                        return "Doe";
                    case ProfileStorageKey.EMAIL:
                        return storedEmail;
                    default:
                        return null;
                }
            });
            const result = profileService.getExtended();
            expect(result).toEqual({
                firstName: "John",
                lastName: "Doe",
                email: storedEmail,
                phone: undefined,
                fullName: "John Doe",
                initials: "JD",
            });
        });
        it("should handle single name initials", () => {
            const storedEmail = createTestEmail("john");
            localStorageMock.getItem.mockImplementation((key) => {
                switch (key) {
                    case ProfileStorageKey.FIRST_NAME:
                        return "John";
                    case ProfileStorageKey.EMAIL:
                        return storedEmail;
                    default:
                        return null;
                }
            });
            const result = profileService.getExtended();
            expect(result?.initials).toBe("J");
        });
    });
    describe("formDataToProfile() and profileToFormData()", () => {
        it("should convert between form data and profile data", () => {
            const formEmail = createTestEmail("form");
            const formData = {
                firstName: "John",
                lastName: "Doe",
                email: formEmail,
                phone: "+1234567890",
            };
            const profile = profileService.formDataToProfile(formData);
            const convertedBack = profileService.profileToFormData(profile);
            expect(profile).toEqual({
                firstName: "John",
                lastName: "Doe",
                email: formEmail,
                phone: "+1234567890",
            });
            expect(convertedBack).toEqual(formData);
        });
        it("should handle undefined phone in profile to form conversion", () => {
            const profileEmail = createTestEmail("profile");
            const profile = {
                firstName: "John",
                lastName: "Doe",
                email: profileEmail,
                phone: undefined,
            };
            const formData = profileService.profileToFormData(profile);
            expect(formData.phone).toBe("");
        });
    });
    describe("caching behavior", () => {
        it("should cache extended profile results", () => {
            const cachedEmail = createTestEmail("cached");
            localStorageMock.getItem.mockImplementation((key) => {
                switch (key) {
                    case ProfileStorageKey.FIRST_NAME:
                        return "John";
                    case ProfileStorageKey.LAST_NAME:
                        return "Doe";
                    case ProfileStorageKey.EMAIL:
                        return cachedEmail;
                    default:
                        return null;
                }
            });
            // First call should compute and cache
            const result1 = profileService.getExtended();
            expect(result1?.fullName).toBe("John Doe");
            // Second call should use cache
            const result2 = profileService.getExtended();
            expect(result2).toBe(result1); // Same reference
            // Verify localStorage was only called once per field
            expect(localStorageMock.getItem).toHaveBeenCalledTimes(4); // firstName, lastName, email, phone
        });
        it("should invalidate cache when profile is updated", async () => {
            const updatedEmail = createTestEmail("updated");
            localStorageMock.getItem.mockReturnValue(null);
            localStorageMock.setItem.mockImplementation(() => { });
            // Get extended profile (should cache)
            const result1 = profileService.getExtended();
            expect(result1).toBeNull();
            // Update profile (should invalidate cache)
            await profileService.update({
                firstName: "John",
                email: updatedEmail,
            });
            // Get extended profile again (should recompute)
            localStorageMock.getItem.mockImplementation((key) => {
                switch (key) {
                    case ProfileStorageKey.FIRST_NAME:
                        return "John";
                    case ProfileStorageKey.EMAIL:
                        return updatedEmail;
                    default:
                        return null;
                }
            });
            const result2 = profileService.getExtended();
            expect(result2?.firstName).toBe("John");
        });
    });
});
