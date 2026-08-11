import { BlockParamError, userNotFoundMessage } from "./codeBlocks/blockErrors";
import { OBJECT_ID_PATTERN } from "./teamResolution";
import { ensureUsersCache } from "./cache";
import { pickFirstPresentParam } from "./utils/blockParams";
import type CommandPlugin from "./main";
import type { CompanyUserResponseDTO } from "./api/resources/users";

export interface ResolvedUser {
	userId: string;
	userName: string;
}

export interface ResolvedUserList {
	userIds: string[];
	displayLabel: string;
}

function userLabel(user: CompanyUserResponseDTO): string {
	const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
	return name || user.primaryEmail || user.id;
}

function matchUserSegment(users: CompanyUserResponseDTO[], segment: string): ResolvedUser | null {
	const trimmed = segment.trim();

	if (OBJECT_ID_PATTERN.test(trimmed)) {
		const byId = users.find((u) => u.id === trimmed);
		if (byId) return { userId: byId.id, userName: userLabel(byId) };
	}

	const lower = trimmed.toLowerCase();
	const byName = users.find((u) => userLabel(u).toLowerCase() === lower);
	if (byName) return { userId: byName.id, userName: userLabel(byName) };

	const byEmail = users.find((u) => u.primaryEmail?.toLowerCase() === lower);
	if (byEmail) return { userId: byEmail.id, userName: userLabel(byEmail) };

	return null;
}

/**
 * Resolves a single assignee/owner value (name, email, or id) to a user.
 * Takes a REQUIRED non-empty string — presence is checked by the caller — so
 * `null` unambiguously means "didn't resolve to anyone."
 */
export async function resolveUserParam(plugin: CommandPlugin, value: string): Promise<ResolvedUser | null> {
	const users = await ensureUsersCache(plugin);
	return matchUserSegment(users, value);
}

/** Comma-separated variant of resolveUserParam. Fails all-or-nothing, like resolveTeamListParam. */
export async function resolveUserListParam(plugin: CommandPlugin, value: string): Promise<ResolvedUserList | null> {
	const users = await ensureUsersCache(plugin);
	const segments = value
		.split(",")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

	const resolved: ResolvedUser[] = [];
	for (const segment of segments) {
		const match = matchUserSegment(users, segment);
		if (!match) return null;
		resolved.push(match);
	}

	if (resolved.length === 0) return null;

	const displayLabel =
		resolved.length === 1 ? resolved[0].userName : `${resolved[0].userName} & ${resolved.length - 1} more`;

	return { userIds: resolved.map((r) => r.userId), displayLabel };
}

/**
 * Centralizes assignee/owner alias precedence (assignees > owners > assignee
 * > owner, first present wins) for all three resources. Returns null when no
 * assignee/owner param was given at all; throws BlockParamError when a given
 * value doesn't resolve to anyone.
 */
export async function resolveAssigneeFilterParam(
	plugin: CommandPlugin,
	params: Record<string, string>,
): Promise<string[] | null> {
	const listValue = pickFirstPresentParam(params, "assignees", "owners");
	if (listValue !== undefined) {
		const resolved = await resolveUserListParam(plugin, listValue);
		if (!resolved) throw new BlockParamError(userNotFoundMessage(listValue));
		return resolved.userIds;
	}

	const singleValue = pickFirstPresentParam(params, "assignee", "owner");
	if (singleValue !== undefined) {
		const resolved = await resolveUserParam(plugin, singleValue);
		if (!resolved) throw new BlockParamError(userNotFoundMessage(singleValue));
		return [resolved.userId];
	}

	return null;
}
