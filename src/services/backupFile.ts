import { Directory, File } from 'expo-file-system';

export async function saveBackupFile(text: string, filename: string): Promise<void> {
  return saveLocalFile(text, filename, 'application/json');
}

export async function saveLocalFile(content: string | Uint8Array, filename: string, mimeType: string): Promise<void> {
  let directory: Directory;
  try {
    directory = await Directory.pickDirectoryAsync();
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    if (code === 'ERR_PICKER_CANCELLED' || code === 'ERR_FILE_PICKING_CANCELLED') {
      const canceled = new Error('Folder selection cancelled.');
      canceled.name = 'AbortError';
      throw canceled;
    }
    throw error;
  }

  const file = directory.createFile(filename, mimeType);
  try {
    await file.write(content);
  } catch (error) {
    // Only the new, incomplete export is removed. Preserve the write error if cleanup also fails.
    try { file.delete(); } catch { /* The selected folder may no longer be accessible. */ }
    throw error;
  }
}

export async function pickBackupFile(): Promise<{ name: string; text: string } | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', 'application/octet-stream'] });
  if (picked.canceled) return null;
  return { name: picked.result.name, text: await picked.result.text() };
}
