import { describe, expect, it } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  toggleBold,
  toggleItalic,
  toggleStrikethrough,
  toggleInlineCode,
  toggleHeading,
  toggleBulletList,
  toggleNumberedList,
  toggleCheckList,
  toggleQuote,
  insertLink,
  insertCodeBlock,
} from './commands';

// jsdom 환경에서 DOM 부모 없이 EditorView를 생성한다.
// EditorView의 기본 생성자는 DOM을 생성하지만 state만 우리가 조작할 것이므로 parent는 필요 없다.
function makeView(doc: string, selection?: EditorSelection): EditorView {
  const state = EditorState.create({
    doc,
    selection: selection ?? EditorSelection.single(0),
  });
  return new EditorView({ state });
}

function cursorAt(_view: EditorView, pos: number): EditorSelection {
  return EditorSelection.single(pos);
}

function rangeSel(from: number, to: number): EditorSelection {
  return EditorSelection.single(from, to);
}

describe('toggleBold', () => {
  it('inserts pair and places cursor between markers on empty selection', () => {
    const view = makeView('hello', cursorAt(makeView('hello'), 5));
    view.setState(EditorState.create({ doc: 'hello', selection: cursorAt(view, 5) }));
    toggleBold(view);
    expect(view.state.doc.toString()).toBe('hello****');
    expect(view.state.selection.main.head).toBe(7);
    expect(view.state.selection.main.empty).toBe(true);
  });

  it('wraps selected text and restores selection', () => {
    const view = makeView('hello world', rangeSel(6, 11));
    toggleBold(view);
    expect(view.state.doc.toString()).toBe('hello **world**');
    expect(view.state.selection.main.from).toBe(8);
    expect(view.state.selection.main.to).toBe(13);
  });

  it('removes markers when selection is already bolded', () => {
    const view = makeView('**bold**', rangeSel(0, 8));
    toggleBold(view);
    expect(view.state.doc.toString()).toBe('bold');
    expect(view.state.selection.main.from).toBe(0);
    expect(view.state.selection.main.to).toBe(4);
  });
});

describe('toggleItalic', () => {
  it('inserts pair on empty selection', () => {
    const view = makeView('abc', cursorAt(makeView(''), 3));
    view.setState(EditorState.create({ doc: 'abc', selection: cursorAt(view, 3) }));
    toggleItalic(view);
    expect(view.state.doc.toString()).toBe('abc**');
    expect(view.state.selection.main.head).toBe(4);
  });

  it('wraps selected text', () => {
    const view = makeView('hi', rangeSel(0, 2));
    toggleItalic(view);
    expect(view.state.doc.toString()).toBe('*hi*');
  });

  it('unwraps italic selection', () => {
    const view = makeView('*hi*', rangeSel(0, 4));
    toggleItalic(view);
    expect(view.state.doc.toString()).toBe('hi');
  });
});

describe('toggleStrikethrough', () => {
  it('inserts pair on empty selection', () => {
    const view = makeView('', cursorAt(makeView(''), 0));
    toggleStrikethrough(view);
    expect(view.state.doc.toString()).toBe('~~~~');
    expect(view.state.selection.main.head).toBe(2);
  });

  it('wraps selected text', () => {
    const view = makeView('gone', rangeSel(0, 4));
    toggleStrikethrough(view);
    expect(view.state.doc.toString()).toBe('~~gone~~');
  });

  it('unwraps strikethrough', () => {
    const view = makeView('~~gone~~', rangeSel(0, 8));
    toggleStrikethrough(view);
    expect(view.state.doc.toString()).toBe('gone');
  });
});

describe('toggleInlineCode', () => {
  it('inserts pair on empty selection', () => {
    const view = makeView('', cursorAt(makeView(''), 0));
    toggleInlineCode(view);
    expect(view.state.doc.toString()).toBe('``');
    expect(view.state.selection.main.head).toBe(1);
  });

  it('wraps selected text', () => {
    const view = makeView('code', rangeSel(0, 4));
    toggleInlineCode(view);
    expect(view.state.doc.toString()).toBe('`code`');
  });

  it('unwraps inline code', () => {
    const view = makeView('`code`', rangeSel(0, 6));
    toggleInlineCode(view);
    expect(view.state.doc.toString()).toBe('code');
  });
});

describe('toggleHeading', () => {
  it('applies h1 prefix to current line (empty selection)', () => {
    const view = makeView('hello', cursorAt(makeView(''), 2));
    toggleHeading(view, 1);
    expect(view.state.doc.toString()).toBe('# hello');
  });

  it('replaces existing h1 with h2 when level changes', () => {
    const view = makeView('# hello', cursorAt(makeView(''), 0));
    toggleHeading(view, 2);
    expect(view.state.doc.toString()).toBe('## hello');
  });

  it('removes h3 when toggled again', () => {
    const view = makeView('### title', cursorAt(makeView(''), 0));
    toggleHeading(view, 3);
    expect(view.state.doc.toString()).toBe('title');
  });

  it('applies h2 to multiple selected lines', () => {
    const view = makeView('one\ntwo\nthree', rangeSel(0, 13));
    toggleHeading(view, 2);
    expect(view.state.doc.toString()).toBe('## one\n## two\n## three');
  });
});

describe('toggleBulletList', () => {
  it('adds bullet to empty-selection line', () => {
    const view = makeView('item', cursorAt(makeView(''), 0));
    toggleBulletList(view);
    expect(view.state.doc.toString()).toBe('- item');
  });

  it('applies bullet prefix to multiple lines', () => {
    const view = makeView('a\nb\nc', rangeSel(0, 5));
    toggleBulletList(view);
    expect(view.state.doc.toString()).toBe('- a\n- b\n- c');
  });

  it('removes bullet prefix when toggled again', () => {
    const view = makeView('- a\n- b', rangeSel(0, 7));
    toggleBulletList(view);
    expect(view.state.doc.toString()).toBe('a\nb');
  });

  it('replaces numbered list with bullets', () => {
    const view = makeView('1. a\n2. b', rangeSel(0, 9));
    toggleBulletList(view);
    expect(view.state.doc.toString()).toBe('- a\n- b');
  });
});

describe('toggleNumberedList', () => {
  it('numbers single line starting at 1', () => {
    const view = makeView('only', cursorAt(makeView(''), 0));
    toggleNumberedList(view);
    expect(view.state.doc.toString()).toBe('1. only');
  });

  it('numbers multiple lines sequentially', () => {
    const view = makeView('a\nb\nc', rangeSel(0, 5));
    toggleNumberedList(view);
    expect(view.state.doc.toString()).toBe('1. a\n2. b\n3. c');
  });

  it('removes numbers when toggled again', () => {
    const view = makeView('1. a\n2. b\n3. c', rangeSel(0, 14));
    toggleNumberedList(view);
    expect(view.state.doc.toString()).toBe('a\nb\nc');
  });

  it('skips blank lines when numbering', () => {
    const view = makeView('a\n\nb', rangeSel(0, 4));
    toggleNumberedList(view);
    // 빈 줄은 유지되고 numbered만 증가
    expect(view.state.doc.toString()).toBe('1. a\n\n3. b');
  });
});

describe('toggleCheckList', () => {
  it('adds check prefix to empty selection line', () => {
    const view = makeView('task', cursorAt(makeView(''), 0));
    toggleCheckList(view);
    expect(view.state.doc.toString()).toBe('- [ ] task');
  });

  it('applies to multiple lines', () => {
    const view = makeView('a\nb', rangeSel(0, 3));
    toggleCheckList(view);
    expect(view.state.doc.toString()).toBe('- [ ] a\n- [ ] b');
  });

  it('removes check prefix when toggled again (both x and space)', () => {
    const view = makeView('- [x] done\n- [ ] todo', rangeSel(0, 21));
    toggleCheckList(view);
    expect(view.state.doc.toString()).toBe('done\ntodo');
  });
});

describe('toggleQuote', () => {
  it('adds quote to current line', () => {
    const view = makeView('quote me', cursorAt(makeView(''), 0));
    toggleQuote(view);
    expect(view.state.doc.toString()).toBe('> quote me');
  });

  it('applies to multiple selected lines', () => {
    const view = makeView('a\nb', rangeSel(0, 3));
    toggleQuote(view);
    expect(view.state.doc.toString()).toBe('> a\n> b');
  });

  it('removes quote when toggled again', () => {
    const view = makeView('> a\n> b', rangeSel(0, 7));
    toggleQuote(view);
    expect(view.state.doc.toString()).toBe('a\nb');
  });
});

describe('insertLink', () => {
  it('inserts placeholder link with selection on text when no selection', () => {
    const view = makeView('', cursorAt(makeView(''), 0));
    insertLink(view);
    expect(view.state.doc.toString()).toBe('[링크 텍스트](https://)');
    // 링크 텍스트가 선택되어 바로 교체 가능해야 한다
    expect(view.state.selection.main.from).toBe(1);
    expect(view.state.selection.main.to).toBe(1 + '링크 텍스트'.length);
  });

  it('wraps selected text and selects url for quick replace', () => {
    const view = makeView('google', rangeSel(0, 6));
    insertLink(view);
    expect(view.state.doc.toString()).toBe('[google](https://)');
    // URL 부분이 선택되어야 한다
    const selected = view.state.doc.sliceString(
      view.state.selection.main.from,
      view.state.selection.main.to,
    );
    expect(selected).toBe('https://');
  });

  it('uses provided url and text', () => {
    const view = makeView('', cursorAt(makeView(''), 0));
    insertLink(view, { url: 'https://example.com', text: 'click' });
    expect(view.state.doc.toString()).toBe('[click](https://example.com)');
  });
});

describe('insertCodeBlock', () => {
  it('inserts empty fenced block with cursor inside on empty selection', () => {
    const view = makeView('', cursorAt(makeView(''), 0));
    insertCodeBlock(view);
    expect(view.state.doc.toString()).toBe('```\n\n```\n');
    expect(view.state.selection.main.head).toBe(4);
    expect(view.state.selection.main.empty).toBe(true);
  });

  it('adds language tag when provided', () => {
    const view = makeView('', cursorAt(makeView(''), 0));
    insertCodeBlock(view, 'ts');
    expect(view.state.doc.toString()).toBe('```ts\n\n```\n');
    // 커서는 ```ts\n 바로 뒤, 빈 내부 라인
    expect(view.state.selection.main.head).toBe('```ts'.length + 1);
  });

  it('wraps selected block with fences', () => {
    const view = makeView('const x = 1;\nconst y = 2;', rangeSel(0, 25));
    insertCodeBlock(view, 'js');
    expect(view.state.doc.toString()).toBe('```js\nconst x = 1;\nconst y = 2;\n```');
    const selected = view.state.doc.sliceString(
      view.state.selection.main.from,
      view.state.selection.main.to,
    );
    expect(selected).toBe('const x = 1;\nconst y = 2;');
  });
});
