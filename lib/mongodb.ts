import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = process.env.MONGODB_DB_NAME || "supplypulse";

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is not set");
}

let client: MongoClient;
let db: Db;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

export async function connectToDatabase(): Promise<Db> {
  if (db) return db;

  if (global._mongoClient) {
    client = global._mongoClient;
  } else {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    global._mongoClient = client;
  }

  db = client.db(DB_NAME);
  return db;
}

export async function getCollection(name: string) {
  const database = await connectToDatabase();
  return database.collection(name);
}
