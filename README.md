# `kysely-deno-sqlite3`

a [Kysely](https://kysely.dev) dialect for [`@db/sqlite`](https://jsr.io/@db/sqlite) (a.k.a Deno SQLite3)

## usage

```ts
import { Database } from "jsr:@db/sqlite";
import { Kysely } from "jsr:@kysely/kysely";
import { DenoSqlite3Dialect } from "jsr:@marshift/kysely-deno-sqlite3";

const db = new Kysely<any>({
	dialect: new DenoSqlite3Dialect({
		database: new Database("db.sqlite3"),
	}),
});

const users = await db
	.selectFrom("user")
	.where("username", "=", "marshift")
	.execute();
```

## faq

1. why not [`@soapbox/kysely-deno-sqlite`](https://jsr.io/@soapbox/kysely-deno-sqlite)?
   - it's outdated, and uses Kysely from NPM instead of JSR. i'd contribute, but i don't like the code structure, or Soapbox as a whole, really.
2. will this support \[insert SQLite library here\]?
   - probably not. i like `@db/sqlite`, and there's currently nothing faster than it.
