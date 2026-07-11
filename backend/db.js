const fs = require('fs');
const path = require('path');

class DatabaseError extends Error {
  constructor(message, cause = null) {
    super(message, { cause });
    this.name = 'DatabaseError';
    this.status = 500;
    this.code = 'local_database_error';
  }
}

function getDatabasePath() {
  if (!process.env.DATA_FILE) return path.join(__dirname, 'data.json');
  return path.resolve(process.cwd(), process.env.DATA_FILE);
}

function createEmptyDatabase() {
  return {
    users: [],
    ownedItems: [],
    nextUserId: 1,
    nextOwnedItemId: 1,
  };
}

function normalizeOwnedItem(item) {
  return {
    id: Number(item.id),
    userId: item.userId ?? item.user_id,
    productId: item.productId ?? item.product_id ?? null,
    productName: item.productName ?? item.product_name ?? item.name ?? null,
    categoryId: item.categoryId ?? item.category_id ?? item.category ?? null,
    purchaseDate: item.purchaseDate ?? item.purchase_date,
    purchasePrice: item.purchasePrice ?? item.purchase_price ?? null,
    expectedLifespanMonths:
      item.expectedLifespanMonths ?? item.expected_lifespan_months ?? item.expected_lifespan,
    userAdjustedLifespanMonths:
      item.userAdjustedLifespanMonths ?? item.user_adjusted_lifespan_months ?? null,
    condition: item.condition || 'Good',
    status: item.status || 'Active',
    lastUsedAt: item.lastUsedAt ?? item.last_used_at ?? null,
    notes: item.notes || '',
    createdAt: item.createdAt ?? item.created_at ?? new Date(0).toISOString(),
    updatedAt: item.updatedAt ?? item.updated_at ?? item.createdAt ?? item.created_at ?? null,
  };
}

function normalizeDatabase(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new DatabaseError('The local database root must be a JSON object.');
  }

  const users = Array.isArray(raw.users) ? raw.users : [];
  const sourceItems = Array.isArray(raw.ownedItems)
    ? raw.ownedItems
    : Array.isArray(raw.inventory)
      ? raw.inventory
      : [];
  const ownedItems = sourceItems
    .map(normalizeOwnedItem)
    .filter((item) => Number.isSafeInteger(item.id) && item.id > 0);
  const maxUserId = users.reduce(
    (max, user) =>
      Number.isSafeInteger(Number(user.id)) ? Math.max(max, Number(user.id)) : max,
    0
  );
  const maxOwnedItemId = ownedItems.reduce((max, item) => Math.max(max, item.id), 0);

  return {
    users,
    ownedItems,
    nextUserId: Math.max(Number(raw.nextUserId) || 1, maxUserId + 1),
    nextOwnedItemId: Math.max(
      Number(raw.nextOwnedItemId ?? raw.nextItemId) || 1,
      maxOwnedItemId + 1
    ),
  };
}

function load() {
  const databasePath = getDatabasePath();
  if (!fs.existsSync(databasePath)) return createEmptyDatabase();

  try {
    return normalizeDatabase(JSON.parse(fs.readFileSync(databasePath, 'utf8')));
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(
      `Could not read the local database at ${databasePath}.`,
      error
    );
  }
}

function save(data) {
  const databasePath = getDatabasePath();
  const directory = path.dirname(databasePath);
  const temporaryPath = `${databasePath}.${process.pid}.${Date.now()}.tmp`;
  const normalized = normalizeDatabase(data);

  try {
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(temporaryPath, `${JSON.stringify(normalized, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
    fs.renameSync(temporaryPath, databasePath);
  } catch (error) {
    try {
      if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
    } catch {
      // Preserve the original write error.
    }
    throw new DatabaseError(
      `Could not save the local database at ${databasePath}.`,
      error
    );
  }
}

function update(mutator) {
  if (typeof mutator !== 'function') {
    throw new TypeError('A database update callback is required.');
  }
  const data = load();
  const result = mutator(data);
  save(data);
  return result;
}

module.exports = {
  DatabaseError,
  createEmptyDatabase,
  getDatabasePath,
  load,
  normalizeDatabase,
  save,
  update,
};
