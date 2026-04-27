export class FiberBundleControl {
  /**
   * @param {object} opts
   * @param {(active: boolean) => void} opts.onToggle — called with true/false
   * @param {(spikeIndex: number) => void} [opts.onSlide] — called with spike index
   * @param {(count: number) => void} [opts.onPairsChange] — called with pair count
   * @param {boolean} [opts.initial=false]
   */
  constructor({ onToggle, onSlide, onPairsChange, initial = false }) {
    this._onToggle      = onToggle;
    this._onSlide       = onSlide ?? null;
    this._onPairsChange = onPairsChange ?? null;
    this._active = initial;
    this._spikeCount = 2; // default
    this._pairCount  = 1;
    this._spikeIndex = 0;
    this._el = null;
    this._toggle = null;
    this._slider = null;
    this._sliderValue = null;
    this._sliderRow = null;
    this._pairsSlider = null;
    this._pairsValue  = null;
    this._pairsRow    = null;
    this._boundClick      = this._handleClick.bind(this);
    this._boundSlide      = this._handleSlide.bind(this);
    this._boundPairsSlide = this._handlePairsSlide.bind(this);
  }

  get cssURL() {
    return new URL('fiber-bundle-control.css', import.meta.url).href;
  }

  get spikeIndex() { return this._spikeIndex; }
  get pairCount()  { return this._pairCount; }

  setSpikeCount(n) {
    this._spikeCount = n;
    // Reset spike slider
    if (this._slider) {
      this._slider.max = '1';
      this._slider.value = '0';
      this._spikeIndex = 0;
      this._updateSliderDisplay(0);
    }
    // Reset pairs slider
    this._pairCount = 1;
    if (this._pairsSlider) {
      const maxPairs = Math.max(1, n - 1);
      this._pairsSlider.max = String(maxPairs);
      this._pairsSlider.value = '1';
      this._updatePairsDisplay(1);
    }
  }

  mount() {
    this._el = document.createElement('div');
    this._el.className = 'fiber-bundle-control';

    // Row 1: label + toggle
    const row = document.createElement('div');
    row.className = 'fiber-bundle-control__row';

    const label = document.createElement('span');
    label.className = 'fiber-bundle-control__label';
    label.textContent = 'Ring';
    row.appendChild(label);

    this._toggle = document.createElement('button');
    this._toggle.className = 'fiber-bundle-control__toggle';
    this._syncState();
    this._toggle.addEventListener('click', this._boundClick);
    row.appendChild(this._toggle);

    this._el.appendChild(row);

    // Row 2: spike slider
    this._sliderRow = document.createElement('div');
    this._sliderRow.className = 'fiber-bundle-control__slider-row';

    const sliderLabel = document.createElement('span');
    sliderLabel.className = 'fiber-bundle-control__slider-label';
    sliderLabel.textContent = 'Spike';
    this._sliderRow.appendChild(sliderLabel);

    this._sliderValue = document.createElement('span');
    this._sliderValue.className = 'fiber-bundle-control__slider-value';
    this._sliderValue.textContent = '0';
    this._sliderRow.appendChild(this._sliderValue);

    this._slider = document.createElement('input');
    this._slider.type = 'range';
    this._slider.className = 'fiber-bundle-control__slider';
    this._slider.min = '0';
    this._slider.max = '1';
    this._slider.step = 'any';
    this._slider.value = '0';
    this._slider.addEventListener('input', this._boundSlide);
    this._sliderRow.appendChild(this._slider);

    this._sliderRow.style.display = this._active ? '' : 'none';
    this._el.appendChild(this._sliderRow);

    // Row 3: pairs slider
    this._pairsRow = document.createElement('div');
    this._pairsRow.className = 'fiber-bundle-control__slider-row';

    const pairsLabel = document.createElement('span');
    pairsLabel.className = 'fiber-bundle-control__slider-label';
    pairsLabel.textContent = 'Pairs';
    this._pairsRow.appendChild(pairsLabel);

    this._pairsValue = document.createElement('span');
    this._pairsValue.className = 'fiber-bundle-control__slider-value';
    this._pairsValue.textContent = '1';
    this._pairsRow.appendChild(this._pairsValue);

    this._pairsSlider = document.createElement('input');
    this._pairsSlider.type = 'range';
    this._pairsSlider.className = 'fiber-bundle-control__slider';
    this._pairsSlider.min = '1';
    this._pairsSlider.max = String(Math.max(1, this._spikeCount - 1));
    this._pairsSlider.step = '1';
    this._pairsSlider.value = '1';
    this._pairsSlider.addEventListener('input', this._boundPairsSlide);
    this._pairsRow.appendChild(this._pairsSlider);

    this._pairsRow.style.display = this._active ? '' : 'none';
    this._el.appendChild(this._pairsRow);

    return this._el;
  }

  dispose() {
    if (this._toggle) this._toggle.removeEventListener('click', this._boundClick);
    if (this._slider) this._slider.removeEventListener('input', this._boundSlide);
    if (this._pairsSlider) this._pairsSlider.removeEventListener('input', this._boundPairsSlide);
    this._el = null;
    this._toggle = null;
    this._slider = null;
    this._sliderValue = null;
    this._sliderRow = null;
    this._pairsSlider = null;
    this._pairsValue = null;
    this._pairsRow = null;
  }

  _handleClick() {
    this._active = !this._active;
    this._syncState();
    if (this._sliderRow) {
      this._sliderRow.style.display = this._active ? '' : 'none';
    }
    if (this._pairsRow) {
      this._pairsRow.style.display = this._active ? '' : 'none';
    }
    this._onToggle(this._active);
  }

  _handleSlide() {
    const raw = parseFloat(this._slider.value);
    const n = Math.max(1, this._spikeCount);
    let index = Math.round(raw * (n - 1));

    // Clamp so startIndex + pairCount doesn't exceed available spikes
    const maxStart = Math.max(0, this._spikeCount - 1 - this._pairCount);
    index = Math.min(index, maxStart);

    this._spikeIndex = index;
    this._updateSliderDisplay(index);
    if (this._onSlide) this._onSlide(index);
  }

  _handlePairsSlide() {
    const count = parseInt(this._pairsSlider.value, 10);
    this._pairCount = count;
    this._updatePairsDisplay(count);

    // Auto-clamp spike index if it would overflow
    const maxStart = Math.max(0, this._spikeCount - 1 - count);
    if (this._spikeIndex > maxStart) {
      this._spikeIndex = maxStart;
      // Update the spike slider position to reflect the clamp
      const n = Math.max(1, this._spikeCount);
      this._slider.value = String(n > 1 ? maxStart / (n - 1) : 0);
      this._updateSliderDisplay(maxStart);
    }

    if (this._onPairsChange) this._onPairsChange(count);
  }

  _updateSliderDisplay(index) {
    if (this._sliderValue) this._sliderValue.textContent = String(index);
  }

  _updatePairsDisplay(count) {
    if (this._pairsValue) this._pairsValue.textContent = String(count);
  }

  _syncState() {
    if (!this._toggle) return;
    this._toggle.classList.toggle('fiber-bundle-control__toggle--on', this._active);
    this._toggle.textContent = this._active ? 'On' : 'Off';
    this._toggle.title = this._active ? 'Hide ring' : 'Show ring';
  }
}
