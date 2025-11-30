import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { AuthorizationService } from "./AuthorizationService";
import fs from "fs";
import path from "path";

describe("AuthorizationService", () => {
  let db: Database.Database;
  let authService: AuthorizationService;
  let testUserId: number;
  let testUserId2: number;
  let adminRoleId: number;
  let userRoleId: number;
  let viewerRoleId: number;

  beforeEach(async () => {
    // Create in-memory database
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");

    // Create users table (simplified version)
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Run RBAC migration
    const migrationPath = path.join(
      __dirname,
      "../db/migrations/022_create_rbac_system.sql",
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");
    db.exec(migrationSQL);

    // Create test users
    const insertUser = db.prepare(`
      INSERT INTO users (username, email, password_hash, password_salt, role)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertUser.run("testuser", "test@example.com", "hash", "salt", "user");
    testUserId = (
      db.prepare("SELECT last_insert_rowid() as id").get() as { id: number }
    ).id;

    insertUser.run("testadmin", "admin@example.com", "hash", "salt", "admin");
    testUserId2 = (
      db.prepare("SELECT last_insert_rowid() as id").get() as { id: number }
    ).id;

    // Get role IDs
    adminRoleId = (
      db.prepare("SELECT id FROM roles WHERE name = ?").get("admin") as {
        id: number;
      }
    ).id;
    userRoleId = (
      db.prepare("SELECT id FROM roles WHERE name = ?").get("user") as {
        id: number;
      }
    ).id;
    viewerRoleId = (
      db.prepare("SELECT id FROM roles WHERE name = ?").get("viewer") as {
        id: number;
      }
    ).id;

    // Manually assign roles to users (since migration runs before user creation in tests)
    const assignRole = db.prepare(`
      INSERT INTO user_roles (user_id, role_id, assigned_by)
      VALUES (?, ?, NULL)
    `);

    assignRole.run(testUserId, userRoleId);
    assignRole.run(testUserId2, adminRoleId);

    // Create service instance
    authService = new AuthorizationService(db);
  });

  describe("hasPermission", () => {
    it("should return true when user has the permission", async () => {
      const result = await authService.hasPermission(
        testUserId,
        "cases.create",
      );
      expect(result.allowed).toBe(true);
    });

    it("should return false when user lacks the permission", async () => {
      const result = await authService.hasPermission(
        testUserId,
        "users.create",
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Missing permission: users.create");
    });

    it("should return true for admin with all permissions", async () => {
      const result = await authService.hasPermission(
        testUserId2,
        "users.create",
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe("hasAllPermissions", () => {
    it("should return true when user has all permissions", async () => {
      const result = await authService.hasAllPermissions(testUserId, [
        "cases.create",
        "cases.read",
        "evidence.create",
      ]);
      expect(result.allowed).toBe(true);
    });

    it("should return false when user lacks any permission", async () => {
      const result = await authService.hasAllPermissions(testUserId, [
        "cases.create",
        "users.create", // User doesn't have this
      ]);
      expect(result.allowed).toBe(false);
    });
  });

  describe("hasAnyPermission", () => {
    it("should return true when user has at least one permission", async () => {
      const result = await authService.hasAnyPermission(testUserId, [
        "users.create", // User doesn't have this
        "cases.create", // User has this
      ]);
      expect(result.allowed).toBe(true);
    });

    it("should return false when user has none of the permissions", async () => {
      const result = await authService.hasAnyPermission(testUserId, [
        "users.create",
        "users.delete",
        "roles.create",
      ]);
      expect(result.allowed).toBe(false);
    });
  });

  describe("getUserPermissions", () => {
    it("should return all permissions for a user role", async () => {
      const permissions = await authService.getUserPermissions(testUserId);
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions.some((p) => p.name === "cases.create")).toBe(true);
      expect(permissions.some((p) => p.name === "evidence.read")).toBe(true);
      expect(permissions.some((p) => p.name === "users.create")).toBe(false);
    });

    it("should return all permissions for admin role", async () => {
      const permissions = await authService.getUserPermissions(testUserId2);
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions.some((p) => p.name === "users.create")).toBe(true);
      expect(permissions.some((p) => p.name === "roles.create")).toBe(true);
    });

    it("should return permissions with correct structure", async () => {
      const permissions = await authService.getUserPermissions(testUserId);
      const casesCreate = permissions.find((p) => p.name === "cases.create");

      expect(casesCreate).toBeDefined();
      expect(casesCreate?.resource).toBe("cases");
      expect(casesCreate?.action).toBe("create");
      expect(casesCreate?.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("getUserRoles", () => {
    it("should return user roles", async () => {
      const roles = await authService.getUserRoles(testUserId);
      expect(roles.length).toBeGreaterThan(0);
      expect(roles[0].name).toBe("user");
      expect(roles[0].displayName).toBe("Standard User");
    });

    it("should return admin role", async () => {
      const roles = await authService.getUserRoles(testUserId2);
      expect(roles.length).toBeGreaterThan(0);
      expect(roles[0].name).toBe("admin");
      expect(roles[0].isSystemRole).toBe(true);
    });
  });

  describe("hasRole", () => {
    it("should return true when user has the role", async () => {
      const result = await authService.hasRole(testUserId, "user");
      expect(result).toBe(true);
    });

    it("should return false when user does not have the role", async () => {
      const result = await authService.hasRole(testUserId, "admin");
      expect(result).toBe(false);
    });
  });

  describe("assignRole", () => {
    it("should assign a role to user", async () => {
      await authService.assignRole(testUserId, viewerRoleId, testUserId2);

      const hasViewer = await authService.hasRole(testUserId, "viewer");
      expect(hasViewer).toBe(true);
    });

    it("should allow user to have multiple roles", async () => {
      await authService.assignRole(testUserId, viewerRoleId, testUserId2);

      const hasUser = await authService.hasRole(testUserId, "user");
      const hasViewer = await authService.hasRole(testUserId, "viewer");

      expect(hasUser).toBe(true);
      expect(hasViewer).toBe(true);
    });

    it("should not duplicate role assignments", async () => {
      await authService.assignRole(testUserId, userRoleId, testUserId2);
      await authService.assignRole(testUserId, userRoleId, testUserId2);

      const roles = await authService.getUserRoles(testUserId);
      const userRoles = roles.filter((r) => r.name === "user");
      expect(userRoles.length).toBe(1);
    });
  });

  describe("removeRole", () => {
    it("should remove a role from user", async () => {
      await authService.removeRole(testUserId, userRoleId);

      const hasUser = await authService.hasRole(testUserId, "user");
      expect(hasUser).toBe(false);
    });

    it("should not affect other users when removing a role", async () => {
      await authService.removeRole(testUserId, userRoleId);

      const user1HasRole = await authService.hasRole(testUserId, "user");
      const user2HasRole = await authService.hasRole(testUserId2, "admin");

      expect(user1HasRole).toBe(false);
      expect(user2HasRole).toBe(true);
    });
  });

  describe("getAllRoles", () => {
    it("should return all roles", async () => {
      const roles = await authService.getAllRoles();
      expect(roles.length).toBe(3);

      const roleNames = roles.map((r) => r.name);
      expect(roleNames).toContain("admin");
      expect(roleNames).toContain("user");
      expect(roleNames).toContain("viewer");
    });

    it("should return roles with correct structure", async () => {
      const roles = await authService.getAllRoles();
      const adminRole = roles.find((r) => r.name === "admin");

      expect(adminRole).toBeDefined();
      expect(adminRole?.displayName).toBe("Administrator");
      expect(adminRole?.isSystemRole).toBe(true);
      expect(adminRole?.createdAt).toBeInstanceOf(Date);
      expect(adminRole?.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("getRolePermissions", () => {
    it("should return all permissions for admin role", async () => {
      const permissions = await authService.getRolePermissions(adminRoleId);
      expect(permissions.length).toBeGreaterThan(20);
    });

    it("should return limited permissions for user role", async () => {
      const permissions = await authService.getRolePermissions(userRoleId);
      expect(permissions.length).toBeGreaterThan(10);
      expect(permissions.some((p) => p.name === "cases.create")).toBe(true);
      expect(permissions.some((p) => p.name === "users.create")).toBe(false);
    });

    it("should return only read permissions for viewer role", async () => {
      const permissions = await authService.getRolePermissions(viewerRoleId);
      const allRead = permissions.every((p) => p.action === "read");
      expect(allRead).toBe(true);
    });
  });

  describe("permission inheritance with multiple roles", () => {
    it("should combine permissions from multiple roles", async () => {
      // Assign viewer role to user (user already has user role)
      await authService.assignRole(testUserId, viewerRoleId, testUserId2);

      const permissions = await authService.getUserPermissions(testUserId);

      // Should have permissions from both user and viewer roles
      // User role has write permissions, viewer has read permissions
      expect(permissions.some((p) => p.name === "cases.create")).toBe(true); // from user role
      expect(permissions.some((p) => p.name === "cases.read")).toBe(true); // from both roles
    });
  });

  describe("system role protection", () => {
    it("should mark default roles as system roles", async () => {
      const roles = await authService.getAllRoles();
      const systemRoles = roles.filter((r) => r.isSystemRole);

      expect(systemRoles.length).toBe(3);
      expect(systemRoles.map((r) => r.name)).toEqual([
        "admin",
        "user",
        "viewer",
      ]);
    });
  });
});
