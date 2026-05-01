// ComponentTypeListView.js — renders component type rows from a type registry

function getConstraint(structure, key) {
  const keys = structure?.['constraint-key'];
  const values = structure?.['constraint-value'];
  if (!keys || !values) return undefined;
  const idx = keys.indexOf(key);
  return idx === -1 ? undefined : values[idx];
}

export class ComponentTypeListView {
  constructor(registry) {
    this._registry = registry;
  }

  render(container, onTypeClick) {
    container.innerHTML = '';
    let index = 0;
    for (const [typeUrl, typeDef] of this._registry.entries()) {
      const structure = typeDef.facets?.['/structure'];
      const tag = getConstraint(structure, 'tag') || typeUrl;
      const requiredAttrs = getConstraint(structure, 'required-attributes');

      const el = document.createElement('div');
      el.className = 'instance-list__row';

      const badge = document.createElement('span');
      badge.className = 'instance-list__index';
      badge.textContent = index;

      const info = document.createElement('div');
      info.className = 'instance-list__info';

      const urlLine = document.createElement('div');
      urlLine.className = 'instance-list__url';
      urlLine.textContent = tag;

      const typeLine = document.createElement('div');
      typeLine.className = 'instance-list__type';
      typeLine.textContent = typeUrl;

      info.appendChild(urlLine);
      info.appendChild(typeLine);

      if (requiredAttrs) {
        const chipRow = document.createElement('div');
        chipRow.className = 'instance-list__attrs';
        for (const attr of requiredAttrs.split(',')) {
          const chip = document.createElement('span');
          chip.className = 'instance-list__chip';
          chip.textContent = attr.trim();
          chipRow.appendChild(chip);
        }
        info.appendChild(chipRow);
      }

      el.appendChild(badge);
      el.appendChild(info);

      if (onTypeClick) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => onTypeClick(typeUrl, typeDef));
      }

      container.appendChild(el);
      index++;
    }
  }
}
