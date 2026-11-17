export async function saveBackupFile(text: string, filename: string): Promise<void> {
  return saveLocalFile(text, filename, 'application/json');
}

export async function saveLocalFile(content: string | Uint8Array<ArrayBuffer>, filename: string, mimeType: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Give the browser time to claim the blob before releasing it.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

export function pickBackupFile(): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.hidden = true;
    input.oncancel = () => {
      input.remove();
      resolve(null);
    };
    input.onchange = async () => {
      const file = input.files?.[0];
      input.remove();
      try {
        resolve(file ? { name: file.name, text: await file.text() } : null);
      } catch (error) {
        reject(error);
      }
    };
    document.body.append(input);
    try {
      input.click();
    } catch (error) {
      input.remove();
      reject(error);
    }
  });
}
