export interface ParamReferenceRow {
	param: string;
	accepts: string;
	default: string;
	notes: string;
}

export const ISSUES_PARAM_REFERENCE: ParamReferenceRow[] = [
	{
		param: "team",
		accepts: "Team name or id; comma-separated for multiple",
		default: "Configured default team",
		notes: "Only Issues supports multiple teams in one block",
	},
	{ param: "limit", accepts: "Positive integer", default: "Settings → Default item limit", notes: "" },
	{
		param: "interactive",
		accepts: "true / false",
		default: "false",
		notes: "Adds complete/edit/delete buttons to each row. Off by default so existing blocks are never silently made editable.",
	},
	{ param: "interval", accepts: "short_term / long_term", default: "both", notes: "" },
	{ param: "completed", accepts: "true / false / any", default: "false", notes: "Client-side filter — no server support" },
	{ param: "archived", accepts: "true / false / any", default: "false", notes: "Client-side filter — no server support" },
	{
		param: "assignee / owner",
		accepts: "Name, email, or id",
		default: "no filter",
		notes: "Client-side filter — no server support. owner is an alias",
	},
	{
		param: "assignees / owners",
		accepts: "Comma-separated names/emails/ids",
		default: "no filter",
		notes: "Takes precedence over the singular form if both given",
	},
	{
		param: "priority",
		accepts: "0-5",
		default: "no filter",
		notes: "Client-side filter — no server support. Matches the Priority shown when creating/editing an Issue",
	},
	{
		param: "createdby",
		accepts: "Name, email, or id",
		default: "no filter",
		notes: "Client-side filter — no server support",
	},
	{ param: "search", accepts: "Free text", default: "none", notes: "Matches title, description, and comments" },
	{
		param: "sort",
		accepts: "Any field name",
		default: "createdDate",
		notes: "Passed through as-is, not validated. sort: priority is aliased to the API's actual field name, rating",
	},
	{ param: "order", accepts: "asc / desc", default: "desc", notes: "" },
];

export const TODOS_PARAM_REFERENCE: ParamReferenceRow[] = [
	{
		param: "team",
		accepts: "Team name or id",
		default: "Configured default team",
		notes: "Ignored entirely if personal: true",
	},
	{
		param: "personal",
		accepts: "true / false",
		default: "both",
		notes: "true shows personal To-Dos only, and team is ignored",
	},
	{ param: "limit", accepts: "Positive integer", default: "Settings → Default item limit", notes: "" },
	{
		param: "interactive",
		accepts: "true / false",
		default: "false",
		notes: "Adds complete/edit/delete buttons to each row. Off by default so existing blocks are never silently made editable.",
	},
	{ param: "completed", accepts: "true / false / any", default: "false", notes: "Server-side filter" },
	{ param: "archived", accepts: "true / false / any", default: "false", notes: "Server-side filter" },
	{
		param: "assignee / owner, assignees / owners",
		accepts: "Name, email, or id (comma-separated for a list)",
		default: "no filter",
		notes: "Client-side filter — no server support, unlike completed/archived",
	},
	{
		param: "createdby",
		accepts: "Name, email, or id",
		default: "no filter",
		notes: "Client-side filter — no server support",
	},
	{
		param: "repeat",
		accepts: "daily / weekly / monthly / quarterly / none",
		default: "no filter",
		notes: "Client-side filter. none (or off) is an alias for \"Don't repeat\"",
	},
	{ param: "title", accepts: "Free text", default: "none", notes: "Exact-match filter, distinct from search" },
	{ param: "search", accepts: "Free text", default: "none", notes: "Matches title and description" },
	{ param: "sort", accepts: "Any field name", default: "dueDate", notes: "" },
	{ param: "order", accepts: "asc / desc", default: "asc", notes: "" },
];

export const ROCKS_PARAM_REFERENCE: ParamReferenceRow[] = [
	{ param: "team", accepts: "Team name or id", default: "Configured default team", notes: "Single team only" },
	{ param: "limit", accepts: "Positive integer", default: "Settings → Default item limit", notes: "" },
	{
		param: "interactive",
		accepts: "true / false",
		default: "false",
		notes: "Adds complete/edit/delete buttons to each row. Off by default so existing blocks are never silently made editable.",
	},
	{
		param: "status",
		accepts: "off_track / on_track / done / canceled / draft",
		default: "active only (excludes done & canceled)",
		notes: "An explicit status skips the default active-only filter",
	},
	{ param: "level", accepts: "user / company_and_department / company / department", default: "all levels", notes: "" },
	{ param: "futurescope", accepts: "current / next / later / future / all", default: "unset", notes: "" },
	{ param: "archived", accepts: "true / false / any", default: "false", notes: "Server-side filter" },
	{ param: "includegoals", accepts: "true / false", default: "unset", notes: "Includes linked goals in the response" },
	{ param: "owner / assignee", accepts: "Name, email, or id", default: "no filter", notes: "Server-side filter" },
	{
		param: "owners / assignees",
		accepts: "Comma-separated names/emails/ids",
		default: "no filter",
		notes: "Server-side filter; takes precedence over the singular form",
	},
	{
		param: "createdby",
		accepts: "Name, email, or id",
		default: "no filter",
		notes: "Client-side filter — no server support",
	},
	{ param: "search", accepts: "Free text", default: "none", notes: "" },
	{
		param: "sort",
		accepts: "title / statuscode / duedate / completeddate / owner / team / duedatequarter",
		default: "dueDate",
		notes: "Unrecognized values fall back to the default rather than erroring",
	},
	{ param: "order", accepts: "asc / desc", default: "asc", notes: "" },
];
