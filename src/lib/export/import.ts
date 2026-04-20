// `.md` / `.markdown` 파일 가져오기.
// 드래그앤드롭이나 파일 선택에서 넘겨받은 File 목록을 병렬로 읽어
// 성공/실패를 분리한 결과로 반환한다.

import { extractTitleFromMarkdown } from '../markdown/title';

export type ImportedDocument = { title: string; content: string };
export type ImportError = { fileName: string; reason: string };
export type ImportResult = {
  imported: ImportedDocument[];
  errors: ImportError[];
};

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const FALLBACK_TITLE = '제목 없음';
const ALLOWED_EXTS = ['md', 'markdown'];

function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  if (dot < 0 || dot === fileName.length - 1) return '';
  return fileName.slice(dot + 1).toLowerCase();
}

function stripExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0) return fileName;
  return fileName.slice(0, dot);
}

type SingleResult =
  | { kind: 'ok'; doc: ImportedDocument }
  | { kind: 'error'; error: ImportError };

// Blob.text()는 Safari 등 일부 환경과 jsdom에서 미지원이므로 FileReader 기반으로 읽는다.
function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('FileReader가 문자열을 반환하지 않았습니다'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader 오류'));
    reader.readAsText(file, 'utf-8');
  });
}

async function readSingle(file: File): Promise<SingleResult> {
  const { name } = file;
  const ext = getExtension(name);
  if (!ALLOWED_EXTS.includes(ext)) {
    return {
      kind: 'error',
      error: { fileName: name, reason: '마크다운 파일(.md/.markdown)만 지원합니다' },
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      kind: 'error',
      error: { fileName: name, reason: '파일이 너무 큽니다 (최대 5MB)' },
    };
  }
  try {
    const content = await readAsText(file);
    const extracted = extractTitleFromMarkdown(content);
    const title = extracted === FALLBACK_TITLE ? stripExtension(name) : extracted;
    return { kind: 'ok', doc: { title, content } };
  } catch (err) {
    const reason = err instanceof Error ? err.message : '파일을 읽는 중 오류가 발생했습니다';
    return { kind: 'error', error: { fileName: name, reason } };
  }
}

export async function readMarkdownFiles(
  files: File[] | FileList,
): Promise<ImportResult> {
  const list = Array.from(files);
  const results = await Promise.all(list.map(readSingle));
  const imported: ImportedDocument[] = [];
  const errors: ImportError[] = [];
  for (const r of results) {
    if (r.kind === 'ok') imported.push(r.doc);
    else errors.push(r.error);
  }
  return { imported, errors };
}
