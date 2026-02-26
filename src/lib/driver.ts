// Based on https://github.com/kysely-org/kysely/blob/v0.28.11/src/dialect/sqlite/sqlite-driver.ts

import type { BindValue, Database } from "@db/sqlite";
import {
	CompiledQuery,
	createQueryId,
	type DatabaseConnection,
	type Driver,
	IdentifierNode,
	type QueryCompiler,
	type QueryResult,
	RawNode,
} from "@kysely/kysely";
import type { DenoSqlite3DialectConfig } from "./dialect.ts";

class DenoSqlite3Connection implements DatabaseConnection {
	readonly #db: Database;

	constructor(db: Database) {
		this.#db = db;
	}

	async executeQuery<O>({ sql, parameters }: CompiledQuery): Promise<QueryResult<O>> {
		const statement = this.#db.prepare(sql);
		const rows = statement.all(...parameters as BindValue[]) as O[];
		return {
			rows,
			numAffectedRows: BigInt(this.#db.changes),
			insertId: BigInt(this.#db.lastInsertRowId),
		};
	}

	async *streamQuery<O>({ sql, parameters }: CompiledQuery): AsyncIterableIterator<QueryResult<O>> {
		const statement = this.#db.prepare(sql).bind(...parameters as BindValue[]);
		for (const row of statement) yield { rows: [row] };
	}
}

class ConnectionMutex {
	#promise?: Promise<void>;
	#resolve?: () => void;

	async lock() {
		while (this.#promise) await this.#promise;
		this.#promise = new Promise((resolve) => {
			this.#resolve = resolve;
		});
	}

	unlock() {
		const resolve = this.#resolve;
		this.#promise = undefined;
		this.#resolve = undefined;
		resolve?.();
	}
}

// https://github.com/kysely-org/kysely/blob/v0.28.11/src/parser/savepoint-parser.ts
// TODO: Kysely doesn't export this - maybe it should?
const parseSavepointCommand = (
	command: string,
	savepointName: string,
) =>
	RawNode.createWithChildren([
		RawNode.createWithSql(`${command} `),
		IdentifierNode.create(savepointName),
	]);

export class DenoSqlite3Driver implements Driver {
	readonly #config: DenoSqlite3DialectConfig;
	readonly #connectionMutex = new ConnectionMutex();

	#db?: Database;
	#connection?: DatabaseConnection;

	constructor(config: DenoSqlite3DialectConfig) {
		this.#config = Object.freeze({ ...config });
	}

	async init() {
		this.#db = typeof this.#config.database === "function"
			? await this.#config.database()
			: this.#config.database;

		this.#connection = new DenoSqlite3Connection(this.#db);
		await this.#config.onCreateConnection?.(this.#connection);
	}

	async acquireConnection() {
		await this.#connectionMutex.lock();
		return this.#connection!;
	}

	async beginTransaction(connection: DatabaseConnection) {
		await connection.executeQuery(CompiledQuery.raw("begin"));
	}

	async commitTransaction(connection: DatabaseConnection) {
		await connection.executeQuery(CompiledQuery.raw("commit"));
	}

	async rollbackTransaction(connection: DatabaseConnection) {
		await connection.executeQuery(CompiledQuery.raw("rollback"));
	}

	async savepoint(
		connection: DatabaseConnection,
		savepointName: string,
		compileQuery: QueryCompiler["compileQuery"],
	) {
		await connection.executeQuery(
			compileQuery(
				parseSavepointCommand("savepoint", savepointName),
				createQueryId(),
			),
		);
	}

	async rollbackToSavepoint(
		connection: DatabaseConnection,
		savepointName: string,
		compileQuery: QueryCompiler["compileQuery"],
	) {
		await connection.executeQuery(
			compileQuery(
				parseSavepointCommand("rollback to", savepointName),
				createQueryId(),
			),
		);
	}

	async releaseSavepoint(
		connection: DatabaseConnection,
		savepointName: string,
		compileQuery: QueryCompiler["compileQuery"],
	) {
		await connection.executeQuery(
			compileQuery(
				parseSavepointCommand("release", savepointName),
				createQueryId(),
			),
		);
	}

	async releaseConnection() {
		this.#connectionMutex.unlock();
	}

	async destroy() {
		this.#db?.close();
	}
}
