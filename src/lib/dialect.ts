/**
 * This module contains the full Deno SQLite3 ([`@db/sqlite`](https://jsr.io/@db/sqlite)) Kysely dialect.
 * For the actual logic, see `./driver.ts`
 * @module
 */

import type { Database } from "@db/sqlite";
import {
	type DatabaseIntrospector,
	type Dialect,
	type DialectAdapter,
	type Driver,
	type Kysely,
	type QueryCompiler,
	SqliteAdapter,
	type SqliteDialectConfig,
	SqliteIntrospector,
	SqliteQueryCompiler,
} from "@kysely/kysely";
import { DenoSqlite3Driver } from "./driver.ts";

/** Config for the Deno SQLite3 dialect. */
export interface DenoSqlite3DialectConfig extends Omit<SqliteDialectConfig, "database"> {
	database: Database | (() => Promise<Database>);
}

/** Kysely dialect that uses the Deno SQLite3 ([`@db/sqlite`](https://jsr.io/@db/sqlite)) library. */
export class DenoSqlite3Dialect implements Dialect {
	readonly #config: DenoSqlite3DialectConfig;

	constructor(config: DenoSqlite3DialectConfig) {
		this.#config = Object.freeze({ ...config });
	}

	createDriver(): Driver {
		return new DenoSqlite3Driver(this.#config);
	}

	createQueryCompiler(): QueryCompiler {
		return new SqliteQueryCompiler();
	}

	createAdapter(): DialectAdapter {
		return new SqliteAdapter();
	}

	createIntrospector(db: Kysely<any>): DatabaseIntrospector {
		return new SqliteIntrospector(db);
	}
}
