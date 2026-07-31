import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import cors from 'cors';
import express from 'express';
import { Database, SqlJsAdapter, type PersistenceHooks } from '@readpdf/storage-layer';
import type { NewDocument, NewUser } from '@readpdf/shared-types';

const require = createRequire(import.meta.url);
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

// --- Persistencia SQLite (sql.js) volcada a archivo ---
const DATA_DIR = new URL('../data/', import.meta.url);
const DB_FILE = new URL('readpdf.db', DATA_DIR);

const persistence: PersistenceHooks = {
  async load() {
    try {
      return new Uint8Array(await readFile(DB_FILE));
    } catch {
      return null;
    }
  },
  async save(data) {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DB_FILE, data);
  },
};

const db = await Database.fromAdapter(
  new SqlJsAdapter({
    persistence,
    wasmLocateFile: (file) => require.resolve(`sql.js/dist/${file}`),
  }),
);

// --- Users ---
app.get('/api/users', async (_req, res) => {
  try {
    res.json({ users: await db.users.list() });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, email } = req.body as NewUser;
    if (!name || !email) {
      res.status(400).json({ error: 'name y email son obligatorios' });
      return;
    }
    const user = await db.users.create({ name, email });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const changes = await db.users.update(Number(req.params.id), req.body as Partial<NewUser>);
    res.json({ changes });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const changes = await db.users.remove(Number(req.params.id));
    res.json({ changes });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- Documents ---
app.get('/api/users/:userId/documents', async (req, res) => {
  try {
    const documents = await db.documents.listByUser(Number(req.params.userId));
    res.json({ documents });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/users/:userId/documents', async (req, res) => {
  try {
    const body = req.body as Omit<NewDocument, 'userId'>;
    if (!body.title || !body.filePath) {
      res.status(400).json({ error: 'title y filePath son obligatorios' });
      return;
    }
    const doc = await db.documents.create({ ...body, userId: Number(req.params.userId) });
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/documents/:id', async (req, res) => {
  try {
    const changes = await db.documents.remove(Number(req.params.id));
    res.json({ changes });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.listen(port, () => {
  console.log(`API ReadPDF en http://localhost:${port}`);
});
