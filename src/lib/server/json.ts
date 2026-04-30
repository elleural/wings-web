/**
 * JSON helpers for consistent API responses + Zod parsing.
 */
import { error, json } from '@sveltejs/kit';
import { ZodError, type ZodSchema } from 'zod';

/** Parse the JSON body of a request against a Zod schema or fail with 400. */
export async function parseBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Body must be valid JSON.');
	}
	const result = schema.safeParse(body);
	if (!result.success) {
		error(400, `Validation error: ${formatZod(result.error)}`);
	}
	return result.data;
}

function formatZod(err: ZodError): string {
	return err.issues
		.map((i) => `${i.path.length ? i.path.join('.') : '<root>'}: ${i.message}`)
		.join('; ');
}

export const ok = (data: unknown, init?: ResponseInit) => json(data, init);
export const created = (data: unknown) => json(data, { status: 201 });
