import { beforeEach, expect, test, vi } from "vite-plus/test";

import { createLocalFoodFromPhoto } from "./repository";

const mocks = vi.hoisted(() => ({
  copy: vi.fn<() => Promise<void>>(),
  info: vi.fn(() => ({ size: 128 })),
  remove: vi.fn(),
  run: vi.fn(async () => undefined),
  transaction: vi.fn(),
}));

vi.mock("expo-crypto", () => ({ randomUUID: () => "photo-id" }));
vi.mock("expo-file-system", () => ({
  Paths: { document: "file:///documents" },
  Directory: class {
    exists = true;
  },
  File: class {
    uri = "file:///documents/food-cutouts/photo-id.png";
    exists = true;
    copy = mocks.copy;
    info = mocks.info;
    delete = mocks.remove;
  },
}));
vi.mock("./db", () => ({
  getDatabase: async () => ({ withExclusiveTransactionAsync: mocks.transaction }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.transaction.mockImplementation(async (callback) => callback({ runAsync: mocks.run }));
});

test("waits for the photo copy before recording its size and queuing the upload", async () => {
  const copy = Promise.withResolvers<void>();
  mocks.copy.mockReturnValueOnce(copy.promise);
  const saving = createLocalFoodFromPhoto("file:///camera/photo.png");
  await vi.waitFor(() => expect(mocks.copy).toHaveBeenCalledOnce());
  expect(mocks.info).not.toHaveBeenCalled();
  expect(mocks.transaction).not.toHaveBeenCalled();

  copy.resolve();
  await expect(saving).resolves.toBe("photo-id");
  expect(mocks.info).toHaveBeenCalledOnce();
  expect(mocks.run).toHaveBeenCalledTimes(2);
});

test("does not queue an upload when the photo copy fails", async () => {
  mocks.copy.mockRejectedValueOnce(new Error("Storage full"));
  await expect(createLocalFoodFromPhoto("file:///camera/photo.png")).rejects.toThrow(
    "Storage full",
  );
  expect(mocks.info).not.toHaveBeenCalled();
  expect(mocks.transaction).not.toHaveBeenCalled();
});
