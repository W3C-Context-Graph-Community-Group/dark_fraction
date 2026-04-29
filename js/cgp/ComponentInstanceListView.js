// ComponentInstanceListView.js — renders instance registry rows into the left panel

export class ComponentInstanceListView {
  constructor(registry) {
    this._registry = registry;
  }

  getRows() {
    const rows = [];
    let index = 0;
    for (const [instanceUrl, entry] of this._registry.entries()) {
      rows.push({
        index,
        instanceUrl,
        typeUrl: entry.typeUrl,
        attributes: entry.attributes
      });
      index++;
    }
    return rows;
  }

  render(container, onRowClick) {
    container.innerHTML = '';
    const rows = this.getRows();

    for (const row of rows) {
      const el = document.createElement('div');
      el.className = 'instance-list__row';

      const badge = document.createElement('span');
      badge.className = 'instance-list__index';
      badge.textContent = row.index;

      const info = document.createElement('div');
      info.className = 'instance-list__info';

      const urlLine = document.createElement('div');
      urlLine.className = 'instance-list__url';
      urlLine.textContent = row.instanceUrl;

      const typeLine = document.createElement('div');
      typeLine.className = 'instance-list__type';
      typeLine.textContent = row.typeUrl;

      info.appendChild(urlLine);
      info.appendChild(typeLine);

      // Attribute chips
      const attrs = row.attributes;
      if (attrs && Object.keys(attrs).length > 0) {
        const chipRow = document.createElement('div');
        chipRow.className = 'instance-list__attrs';
        for (const [k, v] of Object.entries(attrs)) {
          const chip = document.createElement('span');
          chip.className = 'instance-list__chip';
          chip.textContent = `${k}=${v}`;
          chipRow.appendChild(chip);
        }
        info.appendChild(chipRow);
      }

      el.appendChild(badge);
      el.appendChild(info);

      if (onRowClick) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => onRowClick(row));
      }

      container.appendChild(el);
    }
  }
}
