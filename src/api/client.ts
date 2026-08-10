import { requestUrl } from "obsidian";
import { NinetyApiError } from "./errors";
import { createIssuesResource, type IssuesResource } from "./resources/issues";
import { createMilestonesResource, type MilestonesResource } from "./resources/milestones";
import { createRocksResource, type RocksResource } from "./resources/rocks";
import { createTeamsResource, type TeamsResource } from "./resources/teams";
import { createTodosResource, type TodosResource } from "./resources/todos";
import { createUsersResource, type UsersResource } from "./resources/users";

const BASE_URL = "https://api.public.ninety.io/v1";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface NinetyRequestOptions {
	method: HttpMethod;
	/** Path relative to the API base, e.g. "/issues/query". */
	path: string;
	body?: unknown;
	query?: Record<string, string | number | boolean | undefined>;
	/** Set to false for endpoints that respond 204/200 with no usable body (e.g. deletes). Defaults to true. */
	expectBody?: boolean;
}

/**
 * Thin typed wrapper around Obsidian's requestUrl for the Ninety.io Public API.
 * Reads the token via a getter (rather than a copied string) so settings edits
 * take effect immediately without re-instantiating the client.
 */
export class NinetyApiClient {
	readonly issues: IssuesResource;
	readonly todos: TodosResource;
	readonly rocks: RocksResource;
	readonly milestones: MilestonesResource;
	readonly teams: TeamsResource;
	readonly users: UsersResource;

	constructor(private readonly getToken: () => string) {
		this.issues = createIssuesResource(this);
		this.todos = createTodosResource(this);
		this.rocks = createRocksResource(this);
		this.milestones = createMilestonesResource(this);
		this.teams = createTeamsResource(this);
		this.users = createUsersResource(this);
	}

	async request<TResponse>(opts: NinetyRequestOptions): Promise<TResponse> {
		const url = this.buildUrl(opts.path, opts.query);
		const token = this.getToken();

		let response;
		try {
			response = await requestUrl({
				url,
				method: opts.method,
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
				throw: false,
			});
		} catch (err) {
			throw new NinetyApiError(
				0,
				err instanceof Error ? err.message : String(err),
				opts.path,
				"Ninety.io: couldn't reach the API — check your connection.",
			);
		}

		if (response.status < 200 || response.status >= 300) {
			throw new NinetyApiError(response.status, response.text, opts.path);
		}

		if (opts.expectBody === false || !response.text) {
			return undefined as TResponse;
		}

		return JSON.parse(response.text) as TResponse;
	}

	private buildUrl(path: string, query?: NinetyRequestOptions["query"]): string {
		const url = new URL(`${BASE_URL}${path}`);
		if (query) {
			for (const [key, value] of Object.entries(query)) {
				if (value !== undefined) {
					url.searchParams.set(key, String(value));
				}
			}
		}
		return url.toString();
	}
}
