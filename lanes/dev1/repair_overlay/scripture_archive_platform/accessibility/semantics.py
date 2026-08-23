from __future__ import annotations

from html.parser import HTMLParser

REQUIRED_SEMANTIC_MARKERS = (
    '<a class="skip-link" href="#main-content">',
    '<header',
    '<main id="main-content"',
    '<h1',
    '<h2',
    '<h3',
    '<form',
    '<fieldset',
    '<legend',
    '<label',
    '<input',
    '<select',
    '<textarea',
    '<button',
    '<dialog',
    'role="status"',
    'aria-live="polite"',
)


class _SemanticAuditParser(HTMLParser):
    """Small fail-closed static audit for the shipped semantic document.

    This is intentionally not a replacement for browser accessibility APIs or
    human NVDA testing. It catches structural regressions that string-presence
    checks cannot: broken IDREFs, unlabeled form controls, duplicate IDs,
    unnamed dialogs, positive tabindex, and fieldsets without legends.
    """

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: set[str] = set()
        self.duplicate_ids: set[str] = set()
        self.idrefs: list[tuple[str, str, str]] = []
        self.label_for: set[str] = set()
        self.nested_label_controls: set[str] = set()
        self.control_records: list[tuple[str, str | None, dict[str, str]]] = []
        self.dialogs: list[dict[str, str]] = []
        self.main_count = 0
        self.h1_count = 0
        self.skip_targets: list[str] = []
        self.status_regions: list[dict[str, str]] = []
        self.positive_tabindex: list[str] = []
        self._label_depth = 0
        self._fieldset_stack: list[bool] = []
        self.fieldsets_without_legend = 0

    @staticmethod
    def _attrs(attrs: list[tuple[str, str | None]]) -> dict[str, str]:
        return {k.lower(): (v or '') for k, v in attrs}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        a = self._attrs(attrs)
        element_id = a.get('id') or None
        if element_id:
            if element_id in self.ids:
                self.duplicate_ids.add(element_id)
            self.ids.add(element_id)

        for attr in ('aria-labelledby', 'aria-describedby'):
            for ref in a.get(attr, '').split():
                if ref:
                    self.idrefs.append((tag, attr, ref))

        tabindex = a.get('tabindex')
        if tabindex:
            try:
                if int(tabindex) > 0:
                    self.positive_tabindex.append(element_id or tag)
            except ValueError:
                self.positive_tabindex.append(element_id or tag)

        if tag == 'label':
            self._label_depth += 1
            if a.get('for'):
                self.label_for.add(a['for'])

        if tag in {'input', 'select', 'textarea'}:
            input_type = a.get('type', '').lower() if tag == 'input' else ''
            if input_type not in {'hidden', 'button', 'submit', 'reset', 'image'}:
                self.control_records.append((tag, element_id, a))
                if self._label_depth and element_id:
                    self.nested_label_controls.add(element_id)

        if tag == 'fieldset':
            self._fieldset_stack.append(False)
        elif tag == 'legend' and self._fieldset_stack:
            self._fieldset_stack[-1] = True

        if tag == 'main':
            self.main_count += 1
        elif tag == 'h1':
            self.h1_count += 1
        elif tag == 'dialog':
            self.dialogs.append(a)

        if tag == 'a' and 'skip-link' in a.get('class', '').split():
            href = a.get('href', '')
            if href.startswith('#') and len(href) > 1:
                self.skip_targets.append(href[1:])

        if a.get('role') == 'status':
            self.status_regions.append(a)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if tag.lower() == 'label':
            self._label_depth = max(0, self._label_depth - 1)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag == 'label':
            self._label_depth = max(0, self._label_depth - 1)
        elif tag == 'fieldset' and self._fieldset_stack:
            if not self._fieldset_stack.pop():
                self.fieldsets_without_legend += 1


def audit_static_html(html: str) -> list[str]:
    errors = [f'missing marker: {marker}' for marker in REQUIRED_SEMANTIC_MARKERS if marker not in html]
    parser = _SemanticAuditParser()
    try:
        parser.feed(html)
        parser.close()
    except Exception as exc:  # HTMLParser should be forgiving, but fail closed.
        return errors + [f'html parse failure: {exc}']

    if parser.main_count != 1:
        errors.append(f'expected exactly one main landmark, found {parser.main_count}')
    if parser.h1_count != 1:
        errors.append(f'expected exactly one h1, found {parser.h1_count}')
    if parser.duplicate_ids:
        errors.append('duplicate ids: ' + ', '.join(sorted(parser.duplicate_ids)))
    if not parser.skip_targets:
        errors.append('skip link has no fragment target')
    for target in parser.skip_targets:
        if target not in parser.ids:
            errors.append(f'skip link target does not exist: {target}')

    for tag, attr, ref in parser.idrefs:
        if ref not in parser.ids:
            errors.append(f'{tag} {attr} references missing id: {ref}')

    for tag, element_id, attrs in parser.control_records:
        labelled = bool(attrs.get('aria-label') or attrs.get('aria-labelledby'))
        if element_id:
            labelled = labelled or element_id in parser.label_for or element_id in parser.nested_label_controls
        if not labelled:
            errors.append(f'unlabeled {tag}: {element_id or "<no id>"}')

    for dialog in parser.dialogs:
        if not (dialog.get('aria-label') or dialog.get('aria-labelledby')):
            errors.append(f'unnamed dialog: {dialog.get("id") or "<no id>"}')

    if parser.fieldsets_without_legend:
        errors.append(f'fieldsets without legend: {parser.fieldsets_without_legend}')
    if parser.positive_tabindex:
        errors.append('positive/invalid tabindex: ' + ', '.join(parser.positive_tabindex))
    if not any(r.get('aria-live') == 'polite' and r.get('aria-atomic') == 'true' for r in parser.status_regions):
        errors.append('missing concise atomic polite status region')

    return errors
