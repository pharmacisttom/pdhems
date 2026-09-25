# RBAC status

Existing users.role_id and roles are preserved. Eight roles exist. authorizeRoles remains the legacy backend check and loads the current role through session authentication. SUPER_ADMIN retains its legacy override. Driver navigation is restricted by the server's transitional navigation projection; menus are UX only.

AUTH-2 is pending: implement active user_roles, permission-based middleware and record ownership/assignment checks without creating another authentication layer. Current authenticated access alone does not imply a driver owns an arbitrary mission. See audit/AUTH1_REPORT.md; production authorization acceptance is blocked.
